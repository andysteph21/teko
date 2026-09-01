// Feuille basse D-13 — course en cours : catégorie · montant · mode de
// paiement, chrono depuis started_at, « Terminer la course ».

import { formatXaf } from "@teko/core";
import type { RideRow } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BottomPanel, Button } from "@teko/ui/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collectAmount } from "./complete-panel";

function useChrono(startedAt: string | null): string {
  const [text, setText] = useState("0 min 00");
  useEffect(() => {
    const compute = () => {
      const base = startedAt ? Date.parse(startedAt) : Date.now();
      const totalS = Math.max(0, Math.floor((Date.now() - base) / 1000));
      const m = Math.floor(totalS / 60);
      const s = totalS % 60;
      setText(`${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")}`);
    };
    compute();
    const timer = setInterval(compute, 1_000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return text;
}

export interface CoursePanelProps {
  ride: RideRow;
  busy: boolean;
  onComplete: () => void;
}

export function CoursePanel({ ride, busy, onComplete }: CoursePanelProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const chrono = useChrono(ride.started_at);
  const payment = ride.payment_method ?? "cash";

  return (
    // Inset bas obligatoire : ancré à bottom:0 en edge-to-edge, le bouton
    // terminer passerait sous la barre système (même piège que ride-cancel
    // côté client, vécu OPPO A15).
    <BottomPanel
      style={{ ...styles.panel, paddingBottom: insets.bottom + spacing[5] }}
      testID="ride-panel"
    >
      <View style={styles.row}>
        <View style={styles.body}>
          <Text style={styles.title}>{t("work:course.courseEnCours")}</Text>
          <Text style={styles.sub}>
            {`${t(`work:categories.${ride.category}`)} · ${formatXaf(collectAmount(ride), "FCFA")} · ${t(
              `work:paiement.${payment}`,
            )}`}
          </Text>
        </View>
        <Text style={styles.time} testID="course-chrono">
          {chrono}
        </Text>
      </View>
      <Button
        label={t("work:course.terminer")}
        accent="driver"
        busy={busy}
        onPress={onComplete}
        testID="ride-complete"
      />
    </BottomPanel>
  );
}

const styles = StyleSheet.create({
  panel: { position: "absolute", left: 0, right: 0, bottom: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[3], marginBottom: spacing[3] },
  body: { flex: 1 },
  title: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  sub: { fontSize: typography.fontSize.xs + 1, color: color.neutral[500], marginTop: 1 },
  time: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.sm + 1,
    fontWeight: "700",
    color: color.role.driver.accentDark,
    backgroundColor: color.role.driver.accentLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    fontVariant: ["tabular-nums"],
    overflow: "hidden",
  },
});
