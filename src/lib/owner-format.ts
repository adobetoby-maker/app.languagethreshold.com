// Formatting and download helpers shared by the owner components (no React).
export const ownerDate = (v: string | null | undefined) => (v ? new Date(v).toLocaleString() : "—");
export const ownerNumber = (v: number) => new Intl.NumberFormat("en-US").format(v);
export const ownerMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

/** Saves CSV text produced by an audited owner endpoint. */
export function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
