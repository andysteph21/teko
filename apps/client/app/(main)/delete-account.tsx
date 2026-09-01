// C-28 Suppression de compte — liste honnête (supprimé vs conservé
// anonymisé), garde-fou Alert à deux boutons, puis état « Compte désactivé »
// (rétractation 30 jours) → déconnexion. Erreur dédiée si course en cours.
// Écart maquette assumé : pas d'OTP de confirmation (le backend n'en expose
// pas pour ce flux) — le garde-fou est la double confirmation.

import { requestAccountDeletion, signOut, TekoApiError } from "@teko/api-client";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { DeletionInfo } from "../../src/features/settings/deletion-info";
import { CheckIcon } from "../../src/features/settings/icons";
import { ScreenHeader } from "../../src/features/settings/screen-header";
import { supabase } from "../../src/lib/supabase";

function frenchDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default function DeleteAccount() {
  const router = useRouter();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purgeDate, setPurgeDate] = useState<string | null>(null);

  const doDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const purge = await requestAccountDeletion(supabase);
      setPurgeDate(frenchDate(new Date(purge)));
    } catch (e) {
      setBusy(false);
      if (e instanceof TekoApiError && e.code === "ride_in_progress") {
        setError(t("account:suppression.erreurCourse"));
      } else if (e instanceof TekoApiError && e.code === "network") {
        setError(t("erreurs.reseau"));
      } else {
        setError(t("erreurs.generique"));
      }
    }
  };

  const confirmDelete = () => {
    Alert.alert(t("account:suppression.confirmTitre"), t("account:suppression.confirmTexte"), [
      { text: t("commun.annuler"), style: "cancel" },
      {
        text: t("account:suppression.confirmCta"),
        style: "destructive",
        onPress: () => void doDelete(),
      },
    ]);
  };

  const close = async () => {
    await signOut(supabase).catch(() => undefined);
    router.replace("/");
  };

  if (purgeDate) {
    return (
      <View style={[styles.screen, styles.doneScreen]}>
        <View style={styles.doneBadge}>
          <CheckIcon size={26} color={color.neutral[0]} strokeWidth={2.6} />
        </View>
        <Text style={styles.doneTitle}>{t("account:suppression.desactiveTitre")}</Text>
        <Text style={styles.doneText} testID="delete-done">
          {t("account:suppression.desactiveTexte", { date: purgeDate })}
        </Text>
        <View style={styles.doneCta}>
          <Button label={t("commun.fermer")} onPress={() => void close()} testID="delete-close" />
        </View>
      </View>
    );
  }

  const graceDate = frenchDate(new Date(Date.now() + 30 * 24 * 3600 * 1000));

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("account:suppression.titre")} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sub}>{t("account:suppression.intro")}</Text>
        <DeletionInfo graceDate={graceDate} />
        {error ? (
          <Text style={styles.error} testID="delete-error">
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            label={t("account:suppression.garder")}
            onPress={() => router.back()}
            testID="delete-keep"
          />
          <Button
            label={t("account:suppression.supprimerCta")}
            variant="danger"
            onPress={confirmDelete}
            busy={busy}
            testID="delete-cta"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { padding: spacing[6], paddingTop: spacing[5] },
  sub: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
    color: color.neutral[500],
    marginBottom: spacing[4],
  },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    marginTop: spacing[3],
  },
  actions: { marginTop: spacing[5], gap: spacing[2] },
  doneScreen: { alignItems: "center", justifyContent: "center", padding: spacing[6] },
  doneBadge: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: color.semantic.success.default,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  doneTitle: { fontSize: typography.fontSize.xl, fontWeight: "700", color: color.brand[900] },
  doneText: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
    color: color.neutral[500],
    textAlign: "center",
    marginTop: spacing[2],
  },
  doneCta: { alignSelf: "stretch", marginTop: spacing[6] },
});
