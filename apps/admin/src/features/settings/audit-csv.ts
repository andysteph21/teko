// Export CSV du journal d'audit (A-10) — généré côté client, sans backend.

import type { TableRow } from "@teko/types";

const HEADER = ["horodatage", "acteur", "action", "entite", "entite_id", "avant", "apres"];

function cell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function auditToCsv(rows: TableRow<"audit_log">[]): string {
  const lines = rows.map((row) =>
    [
      row.at,
      row.actor ?? "système",
      row.action,
      row.entity,
      row.entity_id ?? "",
      row.before === null ? "" : JSON.stringify(row.before),
      row.after === null ? "" : JSON.stringify(row.after),
    ]
      .map(cell)
      .join(","),
  );
  return [HEADER.join(","), ...lines].join("\n");
}

/** Déclenche le téléchargement navigateur du CSV. */
export function downloadCsv(csv: string, filename: string): void {
  // BOM UTF-8 : Excel ouvre le fichier avec les accents corrects.
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
