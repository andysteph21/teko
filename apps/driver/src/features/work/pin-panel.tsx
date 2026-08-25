// D-12 Saisie du PIN — 4 chiffres demandés de vive voix au passager, cases
// teal, démarrage automatique dès le 4e chiffre. PIN incorrect : on reste,
// message clair ; 3 échecs : aide « vérifiez avec le passager ».

import { PIN_LENGTH } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { OtpInput } from "@teko/ui/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export interface PinPanelProps {
  busy: boolean;
  error: string | null;
  fails: number;
  onSubmit: (pin: string) => void;
  onClearError: () => void;
  onBack: () => void;
}

export function PinPanel({ busy, error, fails, onSubmit, onClearError, onBack }: PinPanelProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");

  // Après un refus backend : cases vidées, on redemande le code.
  useEffect(() => {
    if (error) setCode("");
  }, [error]);

  const handleChange = (value: string) => {
    setCode(value);
    if (error) onClearError();
    if (value.length === PIN_LENGTH) onSubmit(value);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.avatar}>
        <Svg width={30} height={30} viewBox="0 0 24 24">
          <Circle cx={12} cy={8.5} r={4} stroke={color.brand[800]} strokeWidth={2.2} fill="none" />
          <Path
            d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5"
            stroke={color.brand[800]}
            strokeWidth={2.2}
            fill="none"
          />
        </Svg>
      </View>
      <Text style={styles.title}>{t("work:pin.titre")}</Text>
      <Text style={styles.sub}>{t("work:pin.sousTitre")}</Text>
      <OtpInput
        value={code}
        onChange={handleChange}
        length={PIN_LENGTH}
        accentColor={color.role.driver.accent}
        testID="pin"
      />
      {busy ? (
        <ActivityIndicator color={color.role.driver.accentDark} style={styles.spinner} />
      ) : null}
      {error ? (
        <Text style={styles.error} testID="pin-error">
          {error}
        </Text>
      ) : (
        <Text style={styles.hint}>{t("work:pin.aide")}</Text>
      )}
      {fails >= 3 ? (
        <View style={styles.help} testID="pin-help">
          <Text style={styles.helpText}>{t("work:pin.aideEchecs")}</Text>
        </View>
      ) : null}
      <Pressable onPress={onBack} accessibilityRole="button" style={styles.back} testID="pin-back">
        <Text style={styles.backText}>{t("work:pin.retour")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.neutral[50],
    alignItems: "center",
    paddingTop: spacing[16],
    paddingHorizontal: spacing[6],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: color.brand[900],
    marginBottom: spacing[2],
  },
  sub: {
    fontSize: typography.fontSize.sm + 1,
    lineHeight: 21,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: spacing[8],
  },
  spinner: { marginTop: spacing[4] },
  error: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.sm,
    color: color.semantic.error.default,
    textAlign: "center",
  },
  hint: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
  },
  help: {
    marginTop: spacing[4],
    backgroundColor: color.semantic.warning.light,
    borderRadius: borderRadius.md,
    padding: spacing[3],
  },
  helpText: { fontSize: typography.fontSize.sm, color: color.semantic.warning.dark },
  back: { marginTop: spacing[8], padding: spacing[2] },
  backText: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[500] },
});
