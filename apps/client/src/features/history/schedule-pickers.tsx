// Sélecteurs C-18 — jour (7 cartes : Aujourd'hui, Demain, puis jours de la
// semaine) et heure (liste au pas de 15 min, sélection surlignée).
// TODO(UI) : vrai sélecteur « roue » quand une dépendance sera actée.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { dayLabel, dayLabelText, formatTimeFr } from "./ride-display";
import { historyFr } from "./strings";

export interface DayPickerProps {
  days: Date[];
  selectedIndex: number;
  now: Date;
  onSelect: (index: number) => void;
}

export function DayPicker({ days, selectedIndex, now, onSelect }: DayPickerProps) {
  const { t } = useTranslation();
  const { joursCourts } = historyFr.calendrier;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.days}
    >
      {days.map((day, index) => {
        const active = index === selectedIndex;
        return (
          <Pressable
            key={day.toISOString()}
            onPress={() => onSelect(index)}
            style={[styles.day, active ? styles.dayActive : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            testID={`day-${index}`}
          >
            <Text style={styles.dayTitle}>{dayLabelText(dayLabel(day, now), t)}</Text>
            <Text style={styles.daySub}>{`${joursCourts[day.getDay()]} ${day.getDate()}`}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export interface TimePickerProps {
  slots: Date[];
  selectedIso: string | null;
  onSelect: (iso: string) => void;
}

function slotTestId(slot: Date): string {
  const h = String(slot.getHours()).padStart(2, "0");
  const m = String(slot.getMinutes()).padStart(2, "0");
  return `slot-${h}${m}`;
}

export function TimePicker({ slots, selectedIso, onSelect }: TimePickerProps) {
  return (
    <ScrollView style={styles.wheel} nestedScrollEnabled>
      {slots.map((slot) => {
        const iso = slot.toISOString();
        const active = iso === selectedIso;
        return (
          <Pressable
            key={iso}
            onPress={() => onSelect(iso)}
            style={[styles.slot, active ? styles.slotActive : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            testID={slotTestId(slot)}
          >
            <Text style={[styles.slotText, active ? styles.slotTextActive : null]}>
              {formatTimeFr(slot)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  days: { gap: spacing[2], paddingRight: spacing[2] },
  day: {
    minWidth: 104,
    borderWidth: 1.5,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    alignItems: "center",
    backgroundColor: color.neutral[0],
  },
  dayActive: { borderColor: color.brand[500], backgroundColor: color.brand[50] },
  dayTitle: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[700] },
  daySub: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: 1 },
  wheel: {
    maxHeight: 210,
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
  },
  slot: {
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: spacing[4],
    marginVertical: 1,
  },
  slotActive: { backgroundColor: color.brand[50] },
  slotText: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.md + 1,
    color: color.neutral[300],
    fontVariant: ["tabular-nums"],
  },
  slotTextActive: {
    color: color.brand[900],
    fontWeight: "700",
    fontSize: typography.fontSize.lg + 2,
  },
});
