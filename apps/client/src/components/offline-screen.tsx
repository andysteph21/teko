// C-29 Hors-ligne — composant réutilisable, ton calme : illustration wifi
// barré, titre, texte rassurant, bouton Réessayer (jamais de spinner infini —
// l'appelant relance sa requête et réaffiche son propre état de chargement).

import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

function WifiOffArt() {
  return (
    <Svg width={52} height={52} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5a7 7 0 0 1 11.8-5M19 12.5a7 7 0 0 1-.4 2.3"
        stroke={color.neutral[400]}
        strokeWidth={1.8}
      />
      <Path d="M8.5 15.5a3.8 3.8 0 0 1 6.4-2.7" stroke={color.neutral[400]} strokeWidth={1.8} />
      <Circle cx={12} cy={18.5} r={1.3} fill={color.neutral[400]} />
      <Path
        d="M4 4l16 16"
        stroke={color.semantic.error.default}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export interface OfflineScreenProps {
  /** Relance la requête qui a échoué — l'écran hôte reprend la main. */
  onRetry: () => void;
  testID?: string;
}

export function OfflineScreen({ onRetry, testID = "offline-retry" }: OfflineScreenProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.screen}>
      <View style={styles.art}>
        <WifiOffArt />
      </View>
      <Text style={styles.title}>{t("booking:horsLigne.titre")}</Text>
      <Text style={styles.text}>{t("booking:horsLigne.texte")}</Text>
      <Button label={t("commun.reessayer")} onPress={onRetry} testID={testID} />
      <Text style={styles.tip}>{t("booking:horsLigne.astuce")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.neutral[50],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
  },
  art: {
    width: 120,
    height: 120,
    borderRadius: 9999,
    backgroundColor: color.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    letterSpacing: typography.letterSpacing.tight,
    color: color.brand[900],
    textAlign: "center",
    marginBottom: spacing[2],
  },
  text: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
    color: color.neutral[500],
    textAlign: "center",
    maxWidth: 280,
    marginBottom: spacing[6],
  },
  tip: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[400],
    textAlign: "center",
    marginTop: spacing[4],
  },
});
