// Affichage lisible d'un numéro E.164 gabonais : « +241 06 12 34 56 ».

export function formatGabonPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const match = phone.match(/^\+241(\d{2})(\d{2})(\d{2})(\d{2})(\d*)$/);
  if (!match) return phone;
  const tail = match[5] ? `${match[4]}${match[5]}` : match[4];
  return `+241 ${match[1]} ${match[2]} ${match[3]} ${tail}`;
}
