// Livraison (lot R5) — fiche du colis pendant l'approche (rappel d'encaisser
// l'expéditeur à la prise en charge), feuille basse en route vers le
// destinataire (coordonnées lisibles par le seul coursier affecté) et écran
// de fin : rien à encaisser à la remise.

import type { RideParcel } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BottomPanel, Button } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckBadge, collectAmount } from "./complete-panel";
import { dialableRecipientPhone } from "./ride-kind";

function ParcelLine({ parcel }: { parcel: RideParcel | null }) {
  const { t } = useTranslation();
  if (!parcel) return null;
  return (
    <View testID="parcel-details">
      <Text style={styles.parcelTitle}>
        {t("work:livraison.colisTitre", { taille: t(`work:tailles.${parcel.size}`) })}
      </Text>
      <Text style={styles.parcelText}>{parcel.description}</Text>
    </View>
  );
}

/** En tête de la feuille d'approche : le colis et l'encaissement à faire. */
export function ParcelCard({ ride, parcel }: { ride: RideRow; parcel: RideParcel | null }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <ParcelLine parcel={parcel} />
      <Text style={styles.cash} testID="delivery-cash-reminder">
        {t("work:livraison.encaisser", { montant: formatXaf(collectAmount(ride), "FCFA") })}
      </Text>
    </View>
  );
}

function Recipient({ parcel }: { parcel: RideParcel }) {
  const { t } = useTranslation();
  const phone = dialableRecipientPhone(parcel.recipient_phone);
  return (
    <View style={styles.recipient} testID="delivery-recipient">
      <View style={styles.recipientBody}>
        <Text style={styles.label}>{t("work:livraison.destinataire")}</Text>
        <Text style={styles.recipientName}>{parcel.recipient_name}</Text>
        {phone ? <Text style={styles.parcelText}>{phone}</Text> : null}
      </View>
      {phone ? (
        <Pressable
          style={styles.call}
          onPress={() => void Linking.openURL(`tel:${phone}`).catch(() => undefined)}
          accessibilityRole="button"
          testID="delivery-call"
        >
          <Text style={styles.callText}>{t("work:livraison.appeler")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export interface DeliveryPanelProps {
  parcel: RideParcel | null;
  onHandoff: () => void;
}

/** Feuille basse en route vers le destinataire. */
export function DeliveryPanel({ parcel, onHandoff }: DeliveryPanelProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    // Inset bas obligatoire (edge-to-edge) : même règle que les autres feuilles.
    <BottomPanel
      style={{ ...styles.panel, paddingBottom: insets.bottom + spacing[5] }}
      testID="ride-panel"
    >
      <Text style={styles.title}>{t("work:livraison.enCours")}</Text>
      {parcel ? <Recipient parcel={parcel} /> : null}
      <View style={styles.card}>
        <ParcelLine parcel={parcel} />
      </View>
      <Button
        label={t("work:livraison.remettre")}
        accent="driver"
        onPress={onHandoff}
        testID="delivery-handoff"
      />
    </BottomPanel>
  );
}

/** Livraison close : l'expéditeur a payé à la prise en charge. */
export function DeliveryDonePanel({ ride, onDone }: { ride: RideRow; onDone: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.done, { paddingBottom: insets.bottom + spacing[5] }]}>
      <CheckBadge />
      <Text style={styles.doneTitle}>{t("work:livraison.termineeTitre")}</Text>
      <Text style={styles.doneText}>{t("work:livraison.termineeTexte")}</Text>
      <View style={styles.doneLine}>
        <Text style={styles.parcelText}>{t("work:livraison.dejaEncaisse")}</Text>
        <Text style={styles.doneAmount} testID="delivery-amount">
          {formatXaf(collectAmount(ride), "FCFA")}
        </Text>
      </View>
      <View style={styles.doneAction}>
        <Button
          label={t("work:fin.retourAccueil")}
          accent="driver"
          onPress={onDone}
          testID="delivery-done"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { position: "absolute", left: 0, right: 0, bottom: 0 },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: "600",
    color: color.neutral[700],
    marginBottom: spacing[3],
  },
  card: {
    backgroundColor: color.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  parcelTitle: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[700] },
  parcelText: { fontSize: typography.fontSize.sm, color: color.neutral[600] },
  cash: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.semantic.warning.dark,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: color.neutral[500],
  },
  recipient: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  recipientBody: { flex: 1 },
  recipientName: {
    fontSize: typography.fontSize.base,
    fontWeight: "600",
    color: color.neutral[700],
  },
  call: {
    minHeight: spacing[12],
    justifyContent: "center",
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    backgroundColor: color.role.driver.accentLight,
  },
  callText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.role.driver.accentDark,
  },
  done: {
    flex: 1,
    backgroundColor: color.neutral[50],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[6],
    alignItems: "center",
  },
  doneTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: color.brand[900],
  },
  doneText: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    marginTop: 2,
    marginBottom: spacing[6],
    textAlign: "center",
  },
  doneLine: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  doneAmount: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.base,
    fontWeight: "700",
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  doneAction: { alignSelf: "stretch" },
});
