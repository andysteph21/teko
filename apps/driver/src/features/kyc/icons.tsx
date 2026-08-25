// Pictogrammes du dossier KYC — reproduits des SVG inline des maquettes
// D-04/D-05/D-08 (permis, CNI, carte grise, assurance, appareil photo…).

import { color } from "@teko/ui";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { KycDocType } from "./documents-meta";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Permis de conduire (carte + portrait + lignes). */
export function LicenseIcon({
  size = 18,
  color: c = color.neutral[600],
  strokeWidth = 2,
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
      <Rect x={3} y={6} width={18} height={13} rx={2} />
      <Circle cx={9} cy={12} r={2.2} />
      <Path d="M14 10h4M14 14h4" />
    </Svg>
  );
}

/** Pièce d'identité (carte verticale + portrait). */
export function IdCardIcon({
  size = 18,
  color: c = color.neutral[600],
  strokeWidth = 2,
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
      <Rect x={4} y={4} width={16} height={16} rx={2} />
      <Circle cx={10} cy={10} r={2.2} />
      <Path d="M6 18c1-2.4 2.5-3.5 4-3.5s3 1.1 4 3.5M15 8h3" />
    </Svg>
  );
}

/** Carte grise / photo du véhicule (silhouette voiture). */
export function VehicleDocIcon({
  size = 18,
  color: c = color.neutral[600],
  strokeWidth = 2,
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
      <Path d="M5 16l1.5-5h11L19 16" />
      <Rect x={4} y={15} width={16} height={4} rx={1.5} />
      <Circle cx={7.5} cy={19.5} r={1.4} />
      <Circle cx={16.5} cy={19.5} r={1.4} />
    </Svg>
  );
}

/** Assurance / dossier vérifié (bouclier). */
export function ShieldIcon({
  size = 18,
  color: c = color.neutral[600],
  strokeWidth = 2,
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
      <Path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
      <Path d="M8.5 12l2.5 2.5 4.5-5" />
    </Svg>
  );
}

/** Casier judiciaire (document tamponné). */
export function RecordIcon({
  size = 18,
  color: c = color.neutral[600],
  strokeWidth = 2,
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
      <Path d="M6 3h9l4 4v14H6z" />
      <Path d="M15 3v4h4M9 12h6M9 16h6" />
    </Svg>
  );
}

/** Appareil photo (badge avatar, remplacement de pièce). */
export function CameraIcon({
  size = 16,
  color: c = color.neutral[0],
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
      <Path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <Circle cx={12} cy={13} r={3.2} />
    </Svg>
  );
}

/** Silhouette (avatar identité). */
export function PersonIcon({
  size = 36,
  color: c = color.role.driver.accent,
  strokeWidth = 2,
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
      <Circle cx={12} cy={8.5} r={4} />
      <Path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
    </Svg>
  );
}

/** Pièce barrée (variante D-08b). */
export function RejectedDocIcon({
  size = 42,
  color: c = color.semantic.error.default,
  strokeWidth = 1.8,
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
      <Rect x={3} y={6} width={18} height={13} rx={2} />
      <Circle cx={9} cy={12} r={2.2} />
      <Path d="M14 10h4M14 14h4" />
      <Path d="M4 4l16 17" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Coche (état « ajouté / validé »). */
export function CheckIcon({ size = 13, color: c = color.neutral[0], strokeWidth = 3 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={strokeWidth}
    >
      <Path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  );
}

/** Horloge (état « en cours »). */
export function ClockIcon({
  size = 11,
  color: c = color.semantic.warning.dark,
  strokeWidth = 2.6,
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
      <Circle cx={12} cy={12} r={8} />
      <Path d="M12 8v4l2.5 2.5" />
    </Svg>
  );
}

/** Croix (état « à remplacer »). */
export function CrossIcon({
  size = 12,
  color: c = color.semantic.error.default,
  strokeWidth = 3,
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
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

/** Icône de pièce par type (D-05). */
export function DocTypeIcon({ type, color: c }: { type: KycDocType; color?: string }) {
  switch (type) {
    case "license":
      return <LicenseIcon color={c} />;
    case "id_card":
      return <IdCardIcon color={c} />;
    case "registration":
    case "vehicle_photo":
      return <VehicleDocIcon color={c} />;
    case "insurance":
      return <ShieldIcon color={c} />;
    default:
      return <RecordIcon color={c} />;
  }
}
