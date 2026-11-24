// Vues du parcours « Modifier le trajet » (R3) : brouillon (destination +
// arrêts), devis (ancien prix / nouveau prix / différence), attente du
// chauffeur avec compte à rebours, puis issue (accepté, refusé, expiré).

import { formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button, LandmarkPinIcon, LandmarkRow, PlusIcon } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { RouteChangeController, RouteChangeOutcome } from "./use-route-change";

export type PickTarget = "destination" | "stop";

export function ErrorText({ errorKey }: { errorKey: string | null }) {
  const { t } = useTranslation();
  if (!errorKey) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert" testID="route-change-error">
      {t(errorKey)}
    </Text>
  );
}

export interface EditViewProps {
  change: RouteChangeController;
  onPick: (target: PickTarget) => void;
}

export function EditView({ change, onPick }: EditViewProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.block}>
      <LandmarkRow
        title={change.destination?.label ?? t("ride:modification.chercherDestination")}
        subtitle={t("ride:modification.destination")}
        icon={<LandmarkPinIcon />}
        onPress={() => onPick("destination")}
        testID="route-change-destination"
      />
      {change.stops.map((stop, index) => (
        <View key={`${stop.label}-${stop.position.lon}-${stop.position.lat}`} style={styles.stop}>
          <View style={styles.stopBody}>
            <Text style={styles.stopEyebrow}>{t("ride:modification.arret", { n: index + 1 })}</Text>
            <Text style={styles.stopLabel} numberOfLines={1}>
              {stop.label}
            </Text>
          </View>
          <Pressable
            onPress={() => change.removeStop(index)}
            hitSlop={spacing[2]}
            accessibilityRole="button"
            testID={`route-change-remove-${index}`}
          >
            <Text style={styles.remove}>{t("ride:modification.retirer")}</Text>
          </Pressable>
        </View>
      ))}
      {change.canAddStop ? (
        <LandmarkRow
          title={t("ride:modification.ajouterArret")}
          subtitle={t("ride:modification.limites")}
          icon={<PlusIcon size={16} />}
          iconBackground={color.neutral[100]}
          onPress={() => onPick("stop")}
          testID="route-change-add-stop"
        />
      ) : null}
      <ErrorText errorKey={change.errorKey} />
      <Button
        label={t("ride:modification.voirPrix")}
        onPress={() => void change.requestQuote()}
        busy={change.busy}
        disabled={!change.destination}
        testID="route-change-quote"
      />
    </View>
  );
}

function PriceLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.priceLine}>
      <Text style={[styles.priceLabel, strong && styles.priceStrong]}>{label}</Text>
      <Text style={[styles.priceValue, strong && styles.priceStrong]}>{value}</Text>
    </View>
  );
}

export function QuoteView({ change }: { change: RouteChangeController }) {
  const { t } = useTranslation();
  if (!change.quote) return null;
  const oldPrice = Number(change.quote.old_price);
  const newPrice = Number(change.quote.new_price);
  const difference = newPrice - oldPrice;
  return (
    <View style={styles.block} testID="route-change-quoted">
      <View style={styles.card}>
        <PriceLine label={t("ride:modification.ancienPrix")} value={formatXaf(oldPrice, "FCFA")} />
        <PriceLine
          label={t("ride:modification.nouveauPrix")}
          value={formatXaf(newPrice, "FCFA")}
          strong
        />
        <PriceLine
          label={t("ride:modification.difference")}
          value={
            difference > 0
              ? `+ ${formatXaf(difference, "FCFA")}`
              : t("ride:modification.aucunSupplement")
          }
        />
      </View>
      <Text style={styles.text}>{t("ride:modification.explication")}</Text>
      <ErrorText errorKey={change.errorKey} />
      <Button
        label={t("ride:modification.confirmer")}
        onPress={() => void change.confirm()}
        busy={change.busy}
        testID="route-change-confirm"
      />
      <Button
        label={t("ride:modification.corriger")}
        variant="ghost"
        onPress={change.edit}
        disabled={change.busy}
        testID="route-change-edit"
      />
    </View>
  );
}

export function PendingView({ secondsLeft }: { secondsLeft: number }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.block, styles.center]} testID="route-change-pending">
      <ActivityIndicator color={color.brand[800]} />
      <Text style={styles.title}>{t("ride:modification.attenteTitre")}</Text>
      <Text style={styles.countdown} testID="route-change-countdown">
        {t("ride:modification.attenteReste", { s: secondsLeft })}
      </Text>
      <Text style={styles.text}>{t("ride:modification.attenteTexte")}</Text>
    </View>
  );
}

const OUTCOME_KEYS: Record<RouteChangeOutcome, [string, string]> = {
  accepted: ["ride:modification.accepteTitre", "ride:modification.accepteTexte"],
  refused: ["ride:modification.refuseTitre", "ride:modification.refuseTexte"],
  expired: ["ride:modification.expireTitre", "ride:modification.expireTexte"],
};

export interface OutcomeViewProps {
  outcome: RouteChangeOutcome;
  newPrice: number;
  onBack: () => void;
  onRetry: () => void;
}

export function OutcomeView({ outcome, newPrice, onBack, onRetry }: OutcomeViewProps) {
  const { t } = useTranslation();
  const [titleKey, textKey] = OUTCOME_KEYS[outcome];
  return (
    <View style={[styles.block, styles.center]} testID={`route-change-${outcome}`}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.text}>{t(textKey, { prix: formatXaf(newPrice, "FCFA") })}</Text>
      <Button label={t("ride:modification.retour")} onPress={onBack} testID="route-change-back" />
      {outcome === "accepted" ? null : (
        <Button
          label={t("ride:modification.reessayer")}
          variant="ghost"
          onPress={onRetry}
          testID="route-change-retry"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4] },
  center: { alignItems: "stretch" },
  error: {
    fontSize: typography.fontSize.sm,
    color: color.semantic.error.default,
    lineHeight: 20,
  },
  stop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: color.neutral[0],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  stopBody: { flex: 1 },
  stopEyebrow: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.neutral[500],
  },
  stopLabel: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  remove: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.semantic.error.default,
  },
  card: {
    backgroundColor: color.neutral[0],
    borderRadius: borderRadius.md,
    padding: spacing[4],
    gap: spacing[2],
  },
  priceLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: typography.fontSize.base, color: color.neutral[500] },
  priceValue: {
    fontSize: typography.fontSize.base,
    color: color.neutral[700],
    fontVariant: ["tabular-nums"],
  },
  priceStrong: { fontSize: typography.fontSize.lg, fontWeight: "700", color: color.brand[900] },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.brand[900],
    textAlign: "center",
  },
  countdown: {
    fontSize: typography.fontSize.md,
    fontWeight: "700",
    color: color.brand[800],
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  text: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
    color: color.neutral[500],
    textAlign: "center",
  },
});
