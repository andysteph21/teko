// C-27 — SOS / partage : superposition sombre sur le suivi de course.
// « Alerter l'équipe Teko » → report_incident(sos) : les ops rappellent
// immédiatement (engagement n° 17). Partage du trajet et appel police 177
// restent accessibles après l'alerte.

import { createTripShare, reportIncident, TekoApiError } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { AlertTriangleIcon, PhoneIcon, ShareIcon } from "./sos-icons";

// TODO domaine réel — aligner avec la page publique de suivi (get_shared_trip).
const SHARE_BASE_URL = "https://teko.ga/t";

interface ActionRowProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconBackground: string;
  urgent?: boolean;
  onPress: () => void;
  testID: string;
}

function ActionRow(props: ActionRowProps) {
  const { title, subtitle, icon, iconBackground, urgent, onPress, testID } = props;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.act, urgent && styles.actUrgent]}
      accessibilityRole="button"
      testID={testID}
    >
      <View style={[styles.actIcon, { backgroundColor: iconBackground }]}>{icon}</View>
      <View style={styles.actBody}>
        <Text style={styles.actTitle}>{title}</Text>
        <Text style={styles.actSub}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function errorLabel(e: unknown, t: (key: string) => string): string {
  return e instanceof TekoApiError && e.code === "network"
    ? t("erreurs.reseau")
    : t("erreurs.generique");
}

export function SosScreen({ rideId }: { rideId?: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [alerted, setAlerted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alertTeko = async () => {
    setError(null);
    try {
      await reportIncident(supabase, { kind: "sos", ...(rideId ? { rideId } : {}) });
      setAlerted(true);
    } catch (e) {
      setError(errorLabel(e, t));
    }
  };

  const shareTrip = async () => {
    if (!rideId) return;
    setError(null);
    try {
      const share = await createTripShare(supabase, rideId);
      await Share.share({
        message: t("ride:suivi.partageMessage", { lien: `${SHARE_BASE_URL}/${share.token}` }),
      });
    } catch (e) {
      setError(errorLabel(e, t));
    }
  };

  return (
    <View style={styles.scrim}>
      <View style={styles.modal}>
        <View style={styles.headIcon}>
          <AlertTriangleIcon color={color.semantic.error.default} />
        </View>
        <Text style={styles.title}>{t("ride:sos.titre")}</Text>
        <Text style={styles.sub}>{t("ride:sos.sousTitre")}</Text>
        {alerted ? (
          <View style={styles.confirmed} testID="sos-confirmed">
            <Text style={styles.confirmedText}>{t("ride:sos.alerterConfirme")}</Text>
          </View>
        ) : (
          <ActionRow
            title={t("ride:sos.alerterTitre")}
            subtitle={t("ride:sos.alerterSous")}
            icon={<AlertTriangleIcon size={17} color={color.semantic.error.default} strokeWidth={2.2} />}
            iconBackground={color.neutral[0]}
            urgent
            onPress={() => void alertTeko()}
            testID="sos-alert"
          />
        )}
        <ActionRow
          title={t("ride:sos.partagerTitre")}
          subtitle={t("ride:sos.partagerSous")}
          icon={<ShareIcon color={color.brand[800]} />}
          iconBackground={color.brand[50]}
          onPress={() => void shareTrip()}
          testID="sos-share"
        />
        <ActionRow
          title={t("ride:sos.policeTitre")}
          subtitle={t("ride:sos.policeSous")}
          icon={<PhoneIcon color={color.semantic.info.dark} />}
          iconBackground={color.semantic.info.light}
          onPress={() => void Linking.openURL("tel:177")}
          testID="sos-police"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={() => router.back()}
          style={styles.close}
          accessibilityRole="button"
          testID="sos-close"
        >
          <Text style={styles.closeText}>{t("commun.fermer")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Voile : neutral-900 à 55 % (rgba dérivée du token #0F0F1E).
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: `${color.neutral[900]}8C` },
  modal: {
    backgroundColor: color.neutral[0],
    borderRadius: 20,
    margin: spacing[4],
    marginBottom: spacing[5],
    paddingHorizontal: spacing[5],
    paddingVertical: 22,
  },
  headIcon: {
    width: 60,
    height: 60,
    borderRadius: 9999,
    backgroundColor: color.semantic.error.light,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.brand[900],
    textAlign: "center",
    marginBottom: spacing[1],
  },
  sub: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: spacing[4],
  },
  act: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: spacing[2],
  },
  actUrgent: {
    borderColor: color.semantic.error.default,
    backgroundColor: color.semantic.error.light,
  },
  actIcon: {
    width: 38,
    height: 38,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  actBody: { flex: 1 },
  actTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  actSub: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: 1 },
  confirmed: {
    backgroundColor: color.semantic.success.light,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: spacing[2],
  },
  confirmedText: {
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.semantic.success.dark,
  },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    textAlign: "center",
    marginTop: spacing[1],
  },
  close: { alignSelf: "center", padding: spacing[2], marginTop: spacing[1] },
  closeText: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[500] },
});
