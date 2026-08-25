// Pictogrammes du kit — reproduits des SVG inline des maquettes (repère
// ambre, horloge « récent », barres data, cloche, calendrier…). Tout icône
// d'état est TOUJOURS accompagné d'un libellé (jamais la couleur seule).

import Svg, { Circle, Path, Rect } from "react-native-svg";
import { color } from "../tokens";

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Épingle de repère (goutte + point) — l'icône signature de Teko. */
export function LandmarkPinIcon({
  size = 18,
  color: c = color.map.markerLandmark,
  strokeWidth = 2.2,
}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
    >
      <Path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
      <Circle cx={12} cy={10} r={2.6} />
    </Svg>
  );
}

/** Horloge (récents). */
export function RecentIcon({ size = 15, color: c = "#B57308", strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
    >
      <Circle cx={12} cy={12} r={8} />
      <Path d="M12 8v4l2.5 2.5" />
    </Svg>
  );
}

/** Barres de consommation data (widget). */
export function DataBarsIcon({
  size = 15,
  color: c = color.brand[800],
  strokeWidth = 2.4,
}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
    >
      <Path d="M4 18v-6M10 18V9M16 18V4" />
    </Svg>
  );
}

/** Cloche de notifications. */
export function BellIcon({
  size = 18,
  color: c = color.neutral[700],
  strokeWidth = 2.2,
}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
    >
      <Path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <Path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </Svg>
  );
}

/** Calendrier (planifier une course). */
export function CalendarIcon({
  size = 15,
  color: c = color.brand[800],
  strokeWidth = 2.2,
}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
    >
      <Rect x={4} y={5} width={16} height={15} rx={2} />
      <Path d="M8 3v4M16 3v4M4 11h16" />
    </Svg>
  );
}

/** Voiture (catégories éco/confort). */
export function CarIcon({ size = 22, color: c = color.neutral[600], strokeWidth = 2 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
    >
      <Path d="M5 16l1.5-5h11L19 16" />
      <Rect x={4} y={15} width={16} height={4} rx={1.5} />
      <Circle cx={7.5} cy={19.5} r={1.4} />
      <Circle cx={16.5} cy={19.5} r={1.4} />
    </Svg>
  );
}

/** Moto (catégorie moto-taxi). */
export function MotoIcon({ size = 22, color: c = color.neutral[600], strokeWidth = 2 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
    >
      <Circle cx={6} cy={17} r={2.6} />
      <Circle cx={18} cy={17} r={2.6} />
      <Path d="M6 17h6l3-7h3M11 8h4l3 9" />
    </Svg>
  );
}

/** Plus (proposer un repère…). */
export function PlusIcon({
  size = 18,
  color: c = color.neutral[500],
  strokeWidth = 2.2,
}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
    >
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

/** Flèche retour. */
export function BackIcon({
  size = 20,
  color: c = color.neutral[700],
  strokeWidth = 2.2,
}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
    >
      <Path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}
