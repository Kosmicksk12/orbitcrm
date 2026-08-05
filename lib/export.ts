import * as XLSX from "@e965/xlsx";

/**
 * Exports an array of plain objects to a downloadable .xlsx file, entirely
 * client-side (no server round trip, no data leaves the browser except to
 * disk). Column headers are taken from the object keys, in order.
 */
export function exportToExcel(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  // Reasonable auto column widths so the export is readable without manual resizing.
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
  worksheet["!cols"] = colWidths;

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filename}-${today}.xlsx`);
}

/**
 * Same as exportToExcel but for multi-sheet reports (e.g. a monthly close
 * with a summary sheet plus detail sheets). Each sheet gets its own
 * auto-sized columns. A sheet with no rows still renders with a "Sin datos"
 * placeholder so the workbook never has a blank/broken tab.
 */
export function exportWorkbook(
  filename: string,
  sheets: { name: string; rows: Record<string, unknown>[] }[]
) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ " ": "Sin datos este mes" }];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] ?? {}).map((key) => {
      const maxLen = Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    worksheet["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filename}-${today}.xlsx`);
}
