/** Spreadsheet programs execute formula prefixes even in quoted CSV cells. */
export function assessmentCsv(rows: readonly (readonly unknown[])[]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const raw = value === null || value === undefined ? "" : String(value);
            const safe = /^[\s\p{Cc}]*[=+@-]/u.test(raw) ? `'${raw}` : raw;
            return `"${safe.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}
