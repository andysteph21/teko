// Phrases des annonces vocales (option C) : courtes, en français parlé,
// le repère du passager toujours nommé quand il est connu.

const clean = (text: string | null | undefined) => text?.trim() || null;

function place(landmark: string | null | undefined, hint: string | null | undefined): string {
  const name = clean(landmark);
  const precision = clean(hint);
  if (name && precision) return `${name}, ${precision}`;
  return name ?? precision ?? "le point de rencontre";
}

export function offerPhrase(input: {
  category: string;
  meetingLandmark: string | null;
  originLandmark: string | null;
  originHint: string | null;
  netDriver: number;
}): string {
  const category = { eco: "Éco", confort: "Confort", moto: "Moto" }[input.category] ?? "";
  const where = place(input.meetingLandmark ?? input.originLandmark, input.originHint);
  return `Nouvelle course ${category}. Rendez-vous : ${where}. Gain net : ${Math.round(
    input.netDriver,
  )} francs.`.replace("  ", " ");
}

export function pickupPhrase(landmark: string | null, hint: string | null): string {
  return `Course acceptée. Le passager vous attend : ${place(landmark, hint)}.`;
}

export function approachPhrase(landmark: string | null, hint: string | null): string {
  return `Vous approchez. Le passager attend : ${place(landmark, hint)}.`;
}

export const ARRIVED_PHRASE = "Vous êtes arrivé. Demandez le code de prise en charge au passager.";

export function startedPhrase(destination: string | null, hint: string | null): string {
  const where = clean(destination) || clean(hint);
  return where ? `Course démarrée. Direction : ${where}.` : "Course démarrée.";
}

export const DESTINATION_NEAR_PHRASE = "Vous arrivez à destination.";

/** Seuil des annonces de proximité, en mètres. */
export const NEAR_M = 300;
