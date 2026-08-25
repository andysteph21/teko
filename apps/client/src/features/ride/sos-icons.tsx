// Pictogrammes C-27 — reproduits des SVG inline de la maquette (triangle
// d'alerte, combiné téléphone, nœuds de partage). Locaux à la feature ride.

import Svg, { Circle, Path } from "react-native-svg";

interface SosIconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

/** Triangle d'alerte (en-tête du panneau SOS). */
export function AlertTriangleIcon({ size = 28, color, strokeWidth = 2.4 }: SosIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    >
      <Path d="M12 3l10 18H2z" />
      <Path d="M12 10v5M12 18.5v.01" />
    </Svg>
  );
}

/** Combiné téléphone (appel police / secours). */
export function PhoneIcon({ size = 17, color, strokeWidth = 2.2 }: SosIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    >
      <Path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </Svg>
  );
}

/** Nœuds de partage (trajet en direct). */
export function ShareIcon({ size = 17, color, strokeWidth = 2.2 }: SosIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    >
      <Circle cx={6} cy={12} r={2.5} />
      <Circle cx={18} cy={6} r={2.5} />
      <Circle cx={18} cy={18} r={2.5} />
      <Path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
    </Svg>
  );
}
