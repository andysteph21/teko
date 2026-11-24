// Bloc de compléments posé dans le panneau de suivi, selon le service :
// arrêts + prix à jour + « Modifier le trajet » (course), ordre des arrêts et
// places (covoiturage), code de remise et colis (livraison).

import { formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RideExtras } from "./use-ride-extras";

function StopsList({ extras }: { extras: RideExtras }) {
  const { t } = useTranslation();
  if (extras.stops.length === 0) return null;
  return (
    <View style={styles.card} testID="ride-stops">
      <Text style={styles.eyebrow}>{t("ride:arrets.titre")}</Text>
      {extras.stops.map((stop) => {
        const state = stop.leftAt ? "fait" : stop.arrivedAt ? "enCours" : null;
        return (
          <Text
            key={stop.id}
            style={styles.line}
            numberOfLines={1}
            testID={`ride-stop-${stop.seq}`}
          >
            {`${stop.seq}. ${stop.hint ?? t("ride:arrets.defaut", { n: stop.seq })}`}
            {state ? ` · ${t(`ride:arrets.${state}`)}` : ""}
          </Text>
        );
      })}
    </View>
  );
}

function SharedTrip({ extras }: { extras: RideExtras }) {
  const { t } = useTranslation();
  const { shared } = extras;
  if (!shared) return null;
  const labelFor = (kind: "pickup" | "dropoff", mine: boolean) => {
    if (kind === "pickup") return mine ? "maMontee" : "autreMontee";
    return mine ? "maDescente" : "autreDescente";
  };
  return (
    <View style={styles.card} testID="shared-trip">
      <Text style={styles.eyebrow}>{t("ride:covoiturage.titre")}</Text>
      <Text style={styles.line} testID="shared-seats-taken">
        {t("ride:covoiturage.places", { count: shared.seatsTaken, total: shared.seatsTotal })}
      </Text>
      <Text style={styles.sub}>{t("ride:covoiturage.ordre")}</Text>
      {shared.stops.map((stop, index) => (
        <Text
          // biome-ignore lint/suspicious/noArrayIndexKey: liste ordonnée sans identifiant (anonyme)
          key={index}
          style={[styles.line, stop.mine && styles.mine, stop.done && styles.done]}
          testID={`shared-stop-${index}`}
        >
          {`${index + 1}. ${t(`ride:covoiturage.${labelFor(stop.kind, stop.mine)}`)}`}
          {stop.done ? ` · ${t("ride:arrets.fait")}` : ""}
        </Text>
      ))}
    </View>
  );
}

interface DeliveryProps {
  extras: RideExtras;
  sharing: boolean;
  onShare: (code: string) => void;
}

function Delivery({ extras, sharing, onShare }: DeliveryProps) {
  const { t } = useTranslation();
  const { deliveryCode: code, parcel } = extras;
  return (
    <View style={styles.card} testID="delivery-card">
      <View style={styles.codeRow}>
        <View style={styles.codeBody}>
          <Text style={styles.eyebrow}>{t("ride:livraison.codeLabel")}</Text>
          <Text style={styles.code} testID="delivery-code">
            {code ?? "····"}
          </Text>
        </View>
        <Pressable
          onPress={() => code && onShare(code)}
          disabled={!code || sharing}
          style={[styles.share, (!code || sharing) && styles.shareOff]}
          accessibilityRole="button"
          testID="delivery-share"
        >
          <Text style={styles.shareText}>{t("ride:livraison.partager")}</Text>
        </Pressable>
      </View>
      <Text style={styles.sub}>{t("ride:livraison.codeAide")}</Text>
      {parcel ? (
        <View testID="delivery-parcel">
          <Text style={styles.line} numberOfLines={1}>
            {t(`ride:livraison.taille.${parcel.size}`, { defaultValue: t("ride:livraison.colis") })}
            {` · ${t("ride:livraison.pour", { nom: parcel.recipient_name })}`}
            {parcel.recipient_phone ? ` · ${parcel.recipient_phone}` : ""}
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            {parcel.description}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export interface RideExtrasBlockProps {
  extras: RideExtras;
  /** Prix en vigueur (ride.price_est), affiché après une modification acceptée. */
  price: number | null;
  sharing: boolean;
  onEditRoute: () => void;
  onShareDelivery: (code: string) => void;
}

export function RideExtrasBlock(props: RideExtrasBlockProps) {
  const { extras, price, sharing, onEditRoute, onShareDelivery } = props;
  const { t } = useTranslation();
  if (extras.kind === "delivery") {
    return <Delivery extras={extras} sharing={sharing} onShare={onShareDelivery} />;
  }
  if (extras.kind === "shared") return <SharedTrip extras={extras} />;
  return (
    <View style={styles.wrap}>
      <StopsList extras={extras} />
      {extras.change?.status === "accepted" && price !== null ? (
        <Text style={styles.changed} testID="ride-changed-price">
          {t("ride:suivi.trajetModifie", { prix: formatXaf(price, "FCFA") })}
        </Text>
      ) : null}
      {extras.editable ? (
        <Pressable
          onPress={onEditRoute}
          style={styles.edit}
          hitSlop={spacing[2]}
          accessibilityRole="button"
          testID="ride-edit-route"
        >
          <Text style={styles.editText}>{t("ride:suivi.modifier")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[2], marginTop: spacing[2] },
  card: {
    backgroundColor: color.neutral[50],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginTop: spacing[2],
    gap: 2,
  },
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.neutral[500],
  },
  line: { fontSize: typography.fontSize.sm, color: color.neutral[700] },
  sub: { fontSize: typography.fontSize.xs, color: color.neutral[500], lineHeight: 16 },
  mine: { fontWeight: "700", color: color.brand[800] },
  done: { color: color.neutral[400] },
  codeRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  codeBody: { flex: 1 },
  code: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 8,
    color: color.brand[900],
    fontVariant: ["tabular-nums"],
  },
  share: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[50],
  },
  shareOff: { opacity: 0.5 },
  shareText: { fontSize: typography.fontSize.sm, fontWeight: "700", color: color.brand[800] },
  changed: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.semantic.success.dark,
    fontVariant: ["tabular-nums"],
  },
  edit: { alignSelf: "center", padding: spacing[2] },
  editText: { fontSize: typography.fontSize.sm, fontWeight: "700", color: color.brand[800] },
});
