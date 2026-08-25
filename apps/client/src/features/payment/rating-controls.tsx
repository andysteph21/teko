// Contrôles du C-16 : 5 grandes étoiles ambre tappables + verdict, et
// puces de compliment à bascule. Fidèles à c16-evaluation.html.

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const STAR_PATH = "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z";

export type Stars = 1 | 2 | 3 | 4 | 5;

const VERDICTS = ["verdict1", "verdict2", "verdict3", "verdict4", "verdict5"] as const;

export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (stars: Stars) => void;
}) {
  const { t } = useTranslation();
  return (
    <View>
      <View style={styles.stars}>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="button"
            accessibilityLabel={t("payment:evaluation.etoiles", { n })}
            testID={`star-${n}`}
          >
            <Svg
              width={40}
              height={40}
              viewBox="0 0 24 24"
              fill={n <= value ? color.semantic.warning.default : color.neutral[200]}
            >
              <Path d={STAR_PATH} />
            </Svg>
          </Pressable>
        ))}
      </View>
      {value >= 1 && value <= 5 ? (
        <Text style={styles.verdict}>{t(`payment:evaluation.${VERDICTS[value - 1]}`)}</Text>
      ) : null}
    </View>
  );
}

/** Clés i18n des compliments — leurs libellés partent dans le commentaire. */
export const COMPLIMENTS = ["chipPrudente", "chipPonctuel", "chipAimable", "chipPropre"] as const;
export type Compliment = (typeof COMPLIMENTS)[number];

export function ComplimentChips({
  selection,
  onToggle,
}: {
  selection: readonly Compliment[];
  onToggle: (c: Compliment) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.chips}>
      {COMPLIMENTS.map((c) => {
        const on = selection.includes(c);
        return (
          <Pressable
            key={c}
            onPress={() => onToggle(c)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.chip, on && styles.chipOn]}
            testID={`chip-${c}`}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>
              {t(`payment:evaluation.${c}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compliments + texte libre → un seul commentaire pour `rateRide`. */
export function construireCommentaire(
  libelles: readonly string[],
  texte: string,
): string | undefined {
  const commentaire = [libelles.join(" · "), texte.trim()].filter(Boolean).join(" — ");
  return commentaire || undefined;
}

const styles = StyleSheet.create({
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: spacing[2],
  },
  verdict: {
    fontSize: typography.fontSize.base,
    fontWeight: "600",
    color: color.semantic.warning.default,
    textAlign: "center",
    marginBottom: spacing[5],
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    justifyContent: "center",
    marginBottom: 18,
  },
  chip: {
    height: 36,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: color.neutral[100],
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipOn: { backgroundColor: color.brand[50], borderColor: color.brand[500] },
  chipText: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[600] },
  chipTextOn: { color: color.brand[800] },
});
