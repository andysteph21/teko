// Cartes de catégories C-10 (Éco / Moto-taxi / Confort) + rangées squelettes
// pendant l'estimation. Prix fermes formatés via formatXaf (chasse fixe).

import { formatXaf } from "@teko/core";
import type { VehicleCategory } from "@teko/types";
import { color, spacing } from "@teko/ui";
import { CarIcon, CategoryCard, MotoIcon } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

const priceText = (value?: number) => (value != null ? formatXaf(value, "FCFA") : "—");

export function SkeletonRows() {
  return (
    <View style={styles.cards} testID="estimates-skeleton">
      {["eco", "moto", "confort"].map((k) => (
        <View key={k} style={styles.skeleton} />
      ))}
    </View>
  );
}

export interface CategoryListProps {
  estimates: Partial<Record<VehicleCategory, number>>;
  selected: VehicleCategory;
  /** Durée du trajet (minutes arrondies) — affichée sur Éco. */
  minutes: number;
  onSelect: (category: VehicleCategory) => void;
}

export function CategoryList({ estimates, selected, minutes, onSelect }: CategoryListProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.cards}>
      <CategoryCard
        title={t("booking:categories.eco")}
        meta={t("booking:categorie.metaEco", { min: minutes })}
        priceText={priceText(estimates.eco)}
        icon={<CarIcon />}
        selected={selected === "eco"}
        onPress={() => onSelect("eco")}
        testID="cat-eco"
      />
      <CategoryCard
        title={t("booking:categories.moto")}
        meta={t("booking:categorie.metaMoto")}
        priceText={priceText(estimates.moto)}
        icon={<MotoIcon />}
        selected={selected === "moto"}
        onPress={() => onSelect("moto")}
        testID="cat-moto"
      />
      <CategoryCard
        title={t("booking:categories.confort")}
        meta={t("booking:categorie.metaConfort")}
        priceText={priceText(estimates.confort)}
        icon={<CarIcon />}
        selected={selected === "confort"}
        onPress={() => onSelect("confort")}
        testID="cat-confort"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing[2], marginBottom: spacing[3] },
  skeleton: {
    height: 62,
    borderRadius: 16,
    backgroundColor: color.neutral[100],
  },
});
