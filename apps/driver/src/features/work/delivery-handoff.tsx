// Remise du colis (lot R5) — deux preuves, dans l'ordre : photo du colis
// remis (caméra), puis code à 4 chiffres donné par le destinataire ; la
// livraison se clôt dès le 4e chiffre. Code faux : essais restants ; cinq
// échecs : saisie bloquée jusqu'au délai rendu par le serveur.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button, OtpInput } from "@teko/ui/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mmss } from "./stops";
import { DELIVERY_CODE_LENGTH, type DeliveryState } from "./use-delivery";

function blockedSeconds(blockedUntil: number | null): number {
  return blockedUntil ? Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000)) : 0;
}

/** Secondes de blocage restantes, 0 quand la saisie est libre. */
function useBlockedSeconds(blockedUntil: number | null): number {
  const [seconds, setSeconds] = useState(() => blockedSeconds(blockedUntil));
  useEffect(() => {
    setSeconds(blockedSeconds(blockedUntil));
    if (!blockedUntil) return;
    const timer = setInterval(() => setSeconds(blockedSeconds(blockedUntil)), 1_000);
    return () => clearInterval(timer);
  }, [blockedUntil]);
  return seconds;
}

function PhotoStep({ delivery }: { delivery: DeliveryState }) {
  const { t } = useTranslation();
  const done = delivery.photoPath !== null;
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>{t("work:livraison.etapePhoto")}</Text>
      {done ? (
        <Text style={styles.ok} testID="delivery-photo-done">
          {t("work:livraison.photoEnvoyee")}
        </Text>
      ) : null}
      <Button
        label={t(done ? "work:livraison.reprendrePhoto" : "work:livraison.prendrePhoto")}
        variant={done ? "secondary" : "primary"}
        accent="driver"
        busy={delivery.photoBusy}
        onPress={delivery.takePhoto}
        testID="delivery-photo"
      />
    </View>
  );
}

function CodeStep({ delivery }: { delivery: DeliveryState }) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const blockedS = useBlockedSeconds(delivery.blockedUntil);
  const { error } = delivery;

  const blocked = blockedS > 0;

  // Après un refus : cases vidées, on redemande le code au destinataire.
  useEffect(() => {
    if (error || blocked) setCode("");
  }, [error, blocked]);

  const handleChange = (value: string) => {
    setCode(value);
    if (error) delivery.clearError();
    if (value.length === DELIVERY_CODE_LENGTH) delivery.submit(value);
  };

  if (!delivery.photoPath) {
    return (
      <View style={styles.step}>
        <Text style={styles.stepTitle}>{t("work:livraison.etapeCode")}</Text>
        <Text style={styles.hint}>{t("work:livraison.photoDabord")}</Text>
      </View>
    );
  }
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>{t("work:livraison.etapeCode")}</Text>
      {blocked ? (
        <Text style={styles.error} testID="delivery-blocked">
          {t("work:livraison.codeBloque", { duree: mmss(blockedS) })}
        </Text>
      ) : (
        <>
          <View style={styles.code}>
            <OtpInput
              value={code}
              onChange={handleChange}
              length={DELIVERY_CODE_LENGTH}
              accentColor={color.role.driver.accent}
              testID="delivery-code"
            />
          </View>
          <Text style={styles.hint}>{t("work:livraison.codeAide")}</Text>
        </>
      )}
      {delivery.busy ? <ActivityIndicator color={color.role.driver.accentDark} /> : null}
    </View>
  );
}

export interface DeliveryHandoffProps {
  delivery: DeliveryState;
  onBack: () => void;
}

export function DeliveryHandoff({ delivery, onBack }: DeliveryHandoffProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.screen, { paddingBottom: insets.bottom + spacing[5] }]}
      testID="delivery-handoff-screen"
    >
      <Text style={styles.title}>{t("work:livraison.remiseTitre")}</Text>
      <Text style={styles.sub}>{t("work:livraison.remiseSousTitre")}</Text>
      <PhotoStep delivery={delivery} />
      <CodeStep delivery={delivery} />
      {delivery.error ? (
        <Text style={styles.error} testID="delivery-error">
          {delivery.error}
        </Text>
      ) : null}
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          onBack();
        }}
        accessibilityRole="button"
        style={styles.back}
        testID="delivery-back"
      >
        <Text style={styles.backText}>{t("work:livraison.retour")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.neutral[50],
    paddingTop: spacing[16],
    paddingHorizontal: spacing[6],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: color.brand[900],
    marginBottom: spacing[2],
    textAlign: "center",
  },
  sub: {
    fontSize: typography.fontSize.sm + 1,
    lineHeight: 21,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: spacing[6],
  },
  step: {
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[3],
    alignItems: "stretch",
  },
  stepTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  ok: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.semantic.success.dark,
  },
  code: { alignItems: "center" },
  hint: { fontSize: typography.fontSize.sm, color: color.neutral[500] },
  error: {
    fontSize: typography.fontSize.sm,
    color: color.semantic.error.default,
    textAlign: "center",
  },
  back: { marginTop: spacing[6], padding: spacing[2], alignSelf: "center" },
  backText: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[500] },
});
