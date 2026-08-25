// C-18 Planifier une course — jour (7 prochains jours) + heure (pas de
// 15 min, à partir de maintenant + 30 min) ; le choix part dans le brouillon
// de commande (scheduledAt) et le flux C-08→C-11 continue normalement.

import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBookingStore } from "../../src/features/booking/store";
import { dayLabel, dayLabelText, formatTimeFr } from "../../src/features/history/ride-display";
import { DayPicker, TimePicker } from "../../src/features/history/schedule-pickers";
import { dayOptions, timeSlots } from "../../src/features/history/schedule-slots";
import { ScreenHeader } from "../../src/features/history/screen-header";

export default function Schedule() {
  const router = useRouter();
  const { t } = useTranslation();
  const setScheduledAt = useBookingStore((s) => s.setScheduledAt);
  const [now] = useState(() => new Date());
  const days = useMemo(() => dayOptions(now), [now]);
  const [dayIndex, setDayIndex] = useState(0);
  const [slotIso, setSlotIso] = useState<string | null>(null);

  const slots = useMemo(() => timeSlots(days[dayIndex] ?? now, now), [days, dayIndex, now]);
  const selected = slots.find((s) => s.toISOString() === slotIso) ?? slots[0] ?? null;

  const confirm = () => {
    if (!selected) return;
    setScheduledAt(selected.toISOString());
    router.push("/(main)/search" as Href);
  };

  const quand = selected
    ? `${dayLabelText(dayLabel(selected, now), t).toLocaleLowerCase("fr-FR")} ${formatTimeFr(selected)}`
    : "";

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader title={t("history:planifier.titre")} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>{t("history:planifier.secJour")}</Text>
        <DayPicker
          days={days}
          selectedIndex={dayIndex}
          now={now}
          onSelect={(index) => {
            setDayIndex(index);
            setSlotIso(null);
          }}
        />
        <Text style={[styles.section, styles.sectionSpaced]}>
          {t("history:planifier.secHeure")}
        </Text>
        {slots.length === 0 ? (
          <Text style={styles.empty}>{t("history:planifier.aucunCreneau")}</Text>
        ) : (
          <TimePicker
            slots={slots}
            selectedIso={selected ? selected.toISOString() : null}
            onSelect={setSlotIso}
          />
        )}
        <View style={styles.note}>
          <Text style={styles.noteText}>{t("history:planifier.note")}</Text>
        </View>
        <Button
          label={t("history:planifier.cta", { quand })}
          onPress={confirm}
          disabled={!selected}
          testID="schedule-cta"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { paddingHorizontal: spacing[6], paddingTop: spacing[5], paddingBottom: spacing[6] },
  section: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing.wider,
    color: color.neutral[500],
    marginBottom: 10,
  },
  sectionSpaced: { marginTop: spacing[6] },
  empty: { fontSize: typography.fontSize.sm, color: color.neutral[500] },
  note: {
    backgroundColor: color.semantic.info.light,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
    marginBottom: spacing[5],
  },
  noteText: { fontSize: typography.fontSize.xs + 1.5, color: color.neutral[500], lineHeight: 18 },
});
