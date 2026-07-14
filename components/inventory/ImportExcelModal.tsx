"use client";

import { useMemo, useState } from "react";
import * as XLSX from "@e965/xlsx";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldWrapper } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { useShop } from "@/components/shop/ShopContext";
import { useToast } from "@/components/ui/Toaster";
import { IconAlertTriangle } from "@/components/ui/Icons";
import { formatCurrency } from "@/lib/utils";

type Step = "upload" | "map";

function guessCategoryFromFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, "");
  const cleaned = base
    .replace(/^rp[_\s-]*cat[aá]logo[_\s-]*/i, "")
    .replace(/^cat[aá]logo[_\s-]*/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return cleaned || "General";
}

function toWholeNumber(value: unknown): number {
  if (typeof value === "number") return Math.round(value);
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

const NONE = "__none__";

export function ImportExcelModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const supabase = createClient();
  const { shopId } = useShop();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);

  const [category, setCategory] = useState("");
  const [nameColumns, setNameColumns] = useState<string[]>([]);
  const [detailColumns, setDetailColumns] = useState<string[]>([]);
  const [priceColumn, setPriceColumn] = useState<string>(NONE);
  const [stockColumn, setStockColumn] = useState<string>(NONE);

  function reset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setParseError("");
    setCategory("");
    setNameColumns([]);
    setDetailColumns([]);
    setPriceColumn(NONE);
    setStockColumn(NONE);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setParseError("");
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (raw.length === 0) {
        setParseError("El archivo no tiene filas de datos.");
        return;
      }

      const detectedHeaders = Object.keys(raw[0]);
      setHeaders(detectedHeaders);
      setRawRows(raw);
      setCategory(guessCategoryFromFilename(file.name));

      // Reasonable starting guesses — the user can adjust every one of these.
      const lower = (h: string) => h.toLowerCase();
      const marca = detectedHeaders.find((h) => lower(h).includes("marca"));
      const modeloOProducto = detectedHeaders.find(
        (h) => lower(h).includes("modelo") || lower(h) === "producto"
      );
      setNameColumns([marca, modeloOProducto].filter(Boolean) as string[]);

      const venta = detectedHeaders.find((h) => lower(h).includes("venta") || lower(h).includes("precio"));
      setPriceColumn(venta ?? NONE);

      const stock = detectedHeaders.find((h) => lower(h).includes("stock") || lower(h).includes("cantidad"));
      setStockColumn(stock ?? NONE);

      const excluded = new Set([marca, modeloOProducto, venta, stock, "compra"].filter(Boolean));
      setDetailColumns(detectedHeaders.filter((h) => !excluded.has(h) && lower(h) !== "compra"));

      setStep("map");
    } catch {
      setParseError("No pude leer este archivo. Verifica que sea un .xlsx, .xls o .csv válido.");
    }
  }

  function toggleColumn(list: string[], setList: (v: string[]) => void, col: string) {
    setList(list.includes(col) ? list.filter((c) => c !== col) : [...list, col]);
  }

  const previewRows = useMemo(() => {
    return rawRows.map((row) => {
      const name = nameColumns
        .map((c) => String(row[c] ?? "").trim())
        .filter(Boolean)
        .join(" ");
      const detail = detailColumns
        .map((c) => String(row[c] ?? "").trim())
        .filter(Boolean)
        .join(" · ");
      const sale_price_cents = priceColumn !== NONE ? toWholeNumber(row[priceColumn]) * 100 : 0;
      const stock_qty = stockColumn !== NONE ? toWholeNumber(row[stockColumn]) : 0;
      return { name, detail, sale_price_cents, stock_qty };
    });
  }, [rawRows, nameColumns, detailColumns, priceColumn, stockColumn]);

  const validRows = previewRows.filter((r) => r.name);
  const skippedCount = previewRows.length - validRows.length;

  async function handleConfirmImport() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || validRows.length === 0) return;

    setImporting(true);
    const brandColumn = headers.find((h) => h.toLowerCase().includes("marca"));
    const payload = rawRows
      .map((row, i) => ({ row, parsed: previewRows[i] }))
      .filter(({ parsed }) => parsed.name)
      .map(({ row, parsed }) => ({
        owner_id: user.id,
        shop_id: shopId,
        name: parsed.name,
        brand: brandColumn ? String(row[brandColumn] ?? "").trim() || null : null,
        category: category.trim() || "General",
        detail: parsed.detail || null,
        sale_price_cents: parsed.sale_price_cents,
        stock_qty: parsed.stock_qty,
        low_stock_threshold: 5,
      }));

    const BATCH_SIZE = 200;
    let inserted = 0;
    for (let i = 0; i < payload.length; i += BATCH_SIZE) {
      const batch = payload.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("inventory_products").insert(batch);
      if (error) {
        setImporting(false);
        toast({
          title: "La importación se detuvo",
          description: `Se importaron ${inserted} productos antes del error: ${error.message}`,
          variant: "danger",
        });
        return;
      }
      inserted += batch.length;
    }

    setImporting(false);
    toast({ title: `${inserted} productos importados a "${category}"`, variant: "success" });
    reset();
    onImported();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importar inventario desde Excel"
      description={
        step === "upload"
          ? "Sube un archivo por categoría (.xlsx, .xls o .csv)."
          : "Dinos qué significa cada columna — la vista previa se actualiza al instante."
      }
      size="lg"
    >
      {step === "upload" ? (
        <div>
          <label
            htmlFor="excel-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-10 text-center hover:border-accent dark:border-line-dark"
          >
            <span className="text-sm font-medium text-ink dark:text-ink-dark">
              {fileName || "Haz clic para elegir tu archivo de Excel"}
            </span>
            <span className="text-xs text-ink-muted dark:text-ink-dark-muted">.xlsx, .xls o .csv</span>
            <input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>

          {parseError && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger dark:bg-danger/10">
              <IconAlertTriangle width={16} height={16} className="mt-0.5 shrink-0" />
              <p>{parseError}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <FieldWrapper label="Categoría para todo este archivo" htmlFor="import-category">
            <Input id="import-category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </FieldWrapper>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink dark:text-ink-dark">
              ¿Qué columnas forman el nombre del producto?
            </p>
            <div className="flex flex-wrap gap-1.5">
              {headers.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleColumn(nameColumns, setNameColumns, h)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    nameColumns.includes(h)
                      ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent/15 dark:text-accent-400"
                      : "border-line text-ink-muted hover:bg-bg dark:border-line-dark dark:text-ink-dark-muted"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink dark:text-ink-dark">
              ¿Qué columnas van al detalle? (opcional)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {headers.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleColumn(detailColumns, setDetailColumns, h)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    detailColumns.includes(h)
                      ? "border-accent bg-accent-50 text-accent-700 dark:bg-accent/15 dark:text-accent-400"
                      : "border-line text-ink-muted hover:bg-bg dark:border-line-dark dark:text-ink-dark-muted"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Columna de precio de venta" htmlFor="price-col">
              <Select id="price-col" value={priceColumn} onChange={(e) => setPriceColumn(e.target.value)}>
                <option value={NONE}>Sin precio (dejar en $0)</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </FieldWrapper>
            <FieldWrapper label="Columna de stock" htmlFor="stock-col">
              <Select id="stock-col" value={stockColumn} onChange={(e) => setStockColumn(e.target.value)}>
                <option value={NONE}>Sin stock (dejar en 0)</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </FieldWrapper>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink dark:text-ink-dark">
                <strong>{validRows.length}</strong> productos listos
                {skippedCount > 0 && (
                  <span className="text-ink-muted dark:text-ink-dark-muted">
                    {" "}
                    ({skippedCount} filas sin nombre se omitirán)
                  </span>
                )}
              </p>
              <button onClick={reset} className="text-sm font-medium text-accent hover:underline">
                Elegir otro archivo
              </button>
            </div>

            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-line dark:border-line-dark">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface dark:bg-surface-dark">
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted dark:border-line-dark dark:text-ink-dark-muted">
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 font-medium">Detalle</th>
                    <th className="px-3 py-2 font-medium">Venta</th>
                    <th className="px-3 py-2 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-line-dark">
                  {validRows.slice(0, 30).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-ink dark:text-ink-dark">{r.name}</td>
                      <td className="px-3 py-2 text-ink-muted dark:text-ink-dark-muted">{r.detail || "—"}</td>
                      <td className="px-3 py-2 font-mono text-ink dark:text-ink-dark">
                        {r.sale_price_cents > 0 ? formatCurrency(r.sale_price_cents) : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-ink dark:text-ink-dark">{r.stock_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validRows.length > 30 && (
                <p className="border-t border-line px-3 py-2 text-xs text-ink-muted dark:border-line-dark dark:text-ink-dark-muted">
                  Mostrando los primeros 30 de {validRows.length}.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} loading={importing} disabled={validRows.length === 0}>
              Importar {validRows.length} productos
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
