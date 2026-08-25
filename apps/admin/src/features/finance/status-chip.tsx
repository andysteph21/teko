// Pastille de statut — maquette A-05 (uppercase 10 px, arrondie).

export interface Chip {
  label: string;
  className: string;
}

export function StatusChip({ chip }: { chip: Chip }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${chip.className}`}
    >
      {chip.label}
    </span>
  );
}
