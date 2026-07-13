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
