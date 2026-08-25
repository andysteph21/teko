// Pictogrammes des écrans profil/réglages (C-23/24/28/30) — reproduits des
// SVG inline des maquettes ; couleurs passées en props depuis les tokens.

import { color } from "@teko/ui";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export interface SettingsIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const DEFAULTS = { size: 16, color: color.brand[800], strokeWidth: 2.2 };

function base(props: SettingsIconProps) {
  return {
    width: props.size ?? DEFAULTS.size,
    height: props.size ?? DEFAULTS.size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: props.color ?? DEFAULTS.color,
    strokeWidth: props.strokeWidth ?? DEFAULTS.strokeWidth,
  };
}

/** Silhouette de personne (Modifier le profil). */
export function PersonIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Circle cx={12} cy={8.5} r={4} />
      <Path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
    </Svg>
  );
}

/** Sac (Mes courses). */
export function BagIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M5 8h14l-1.5 11h-11z" />
      <Path d="M9 8a3 3 0 1 1 6 0" />
    </Svg>
  );
}

/** Globe (Langue). */
export function GlobeIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
    </Svg>
  );
}

/** Point d'interrogation (Contacter Teko). */
export function HelpIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1 1-1.1 1.8M12 17v.01" />
    </Svg>
  );
}

/** Porte de sortie (Se déconnecter). */
export function LogoutIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9" />
    </Svg>
  );
}

/** Corbeille (Supprimer mon compte). */
export function TrashIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />
    </Svg>
  );
}

/** Téléphone (Changer de numéro). */
export function PhoneDeviceIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Rect x={6} y={3} width={12} height={18} rx={2.5} />
      <Path d="M10 18h4" />
    </Svg>
  );
}

/** Appareil photo (pastille avatar C-24). */
export function CameraIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <Circle cx={12} cy={13} r={3.2} />
    </Svg>
  );
}

/** Cadenas (données conservées, C-28). */
export function LockIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Rect x={5} y={11} width={14} height={9} rx={2} />
      <Path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </Svg>
  );
}

/** Horloge (fenêtre de rétractation, C-28). */
export function ClockIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 3" />
    </Svg>
  );
}

/** Coche (langue active, C-30 ; état « compte désactivé », C-28). */
export function CheckIcon(props: SettingsIconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  );
}
