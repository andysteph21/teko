// Phrases des annonces vocales (option C) : courtes, en français parlé,
// le repère du passager toujours nommé quand il est connu.

const clean = (text: string | null | undefined) => text?.trim() || null;

function place(landmark: string | null | undefined, hint: string | null | undefined): string {
  const name = clean(landmark);
  const precision = clean(hint);
  if (name && precision) return `${name}, ${precision}`;
  return name ?? precision ?? "le point de rencontre";
}

const PARCEL_SIZES: Record<string, string> = { small: "petit", medium: "moyen", large: "grand" };

function offerHead(input: {
  category: string;
  serviceType?: string;
  parcelSize?: string | null;
  seats?: number;
}): string {
  if (input.serviceType === "delivery") {
    const size = PARCEL_SIZES[input.parcelSize ?? ""];
    return size ? `Nouvelle livraison, colis ${size}.` : "Nouvelle livraison.";
  }
  if (input.category === "covoiturage") {
    const seats = input.seats ?? 1;
    return `Nouveau covoiturage, ${seats} ${seats > 1 ? "places" : "place"}.`;
  }
  const category = { eco: "Éco", confort: "Confort", moto: "Moto" }[input.category] ?? "";
  return `Nouvelle course ${category}.`.replace(" .", ".");
}

export function offerPhrase(input: {
  category: string;
  meetingLandmark: string | null;
  originLandmark: string | null;
  originHint: string | null;
  netDriver: number;
  serviceType?: string;
  parcelSize?: string | null;
  seats?: number;
}): string {
  const where = place(input.meetingLandmark ?? input.originLandmark, input.originHint);
  return `${offerHead(input)} Rendez-vous : ${where}. Gain net : ${Math.round(
    input.netDriver,
  )} francs.`;
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

/** Demande de modification de trajet (lot R3) : destination et nouveau prix. */
export function routeChangePhrase(input: {
  destination: string | null;
  hint: string | null;
  stops: number;
  newPrice: number;
}): string {
  const where = clean(input.destination) ?? clean(input.hint);
  const stops =
    input.stops > 0 ? ` Avec ${input.stops} ${input.stops > 1 ? "arrêts" : "arrêt"}.` : "";
  return `Le passager demande une modification du trajet.${
    where ? ` Nouvelle destination : ${where}.` : ""
  }${stops} Nouveau prix : ${Math.round(input.newPrice)} francs. Acceptez ou refusez.`;
}

// Livraison (lot R5) : le destinataire n'est jamais nommé à voix haute.
export function deliveryPickupPhrase(landmark: string | null, hint: string | null): string {
  return `Livraison acceptée. L'expéditeur vous attend : ${place(landmark, hint)}.`;
}

export const DELIVERY_ARRIVED_PHRASE =
  "Vous êtes arrivé. Demandez le code à l'expéditeur et encaissez la livraison.";

export function deliveryStartedPhrase(destination: string | null, hint: string | null): string {
  const where = clean(destination) || clean(hint);
  return where ? `Colis pris en charge. Direction : ${where}.` : "Colis pris en charge.";
}

export const DELIVERY_NEAR_PHRASE =
  "Vous arrivez chez le destinataire. Photographiez le colis remis et demandez le code.";
