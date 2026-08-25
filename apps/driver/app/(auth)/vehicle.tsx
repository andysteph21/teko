// D-06 Inscription 3/4 — Véhicule : type voiture/moto selon les catégories
// exercées, plaque en majuscules → enregistrement du véhicule. La catégorie
// finale (Éco/Confort) est confirmée par l'équipe à la vérification.

import { TekoApiError, upsertVehicle } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, TextField } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../src/features/auth/use-session";
import { StepBar } from "../../src/features/kyc/step-bar";
import { useAllowedVehicleTypes } from "../../src/features/kyc/use-allowed-vehicle-types";
import { type VehicleType, VehicleTypeCards } from "../../src/features/kyc/vehicle-type-cards";
import { supabase } from "../../src/lib/supabase";

type Category = "eco" | "moto" | "confort";

/** Catégorie proposée : moto ferme, sinon Éco par défaut (Confort si le
 *  chauffeur n'exerce que Confort) — l'équipe confirme à la vérification. */
function deriveCategory(type: VehicleType, categories: readonly string[]): Category {
  if (type === "moto") return "moto";
  return categories.includes("eco") || categories.length === 0 ? "eco" : "confort";
}

const CATEGORY_LABEL_KEY: Record<Category, string> = {
  eco: "kyc:identite.catEco",
  moto: "kyc:identite.catMoto",
  confort: "kyc:identite.catConfort",
};

/** Encart teal « Catégorie proposée : … » (D-06). */
function CategoryNote({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.catNote}>
      <Text style={styles.catNoteText}>
        <Text style={styles.catNoteStrong}>{t("kyc:vehicule.catNote", { categorie: label })}</Text>
        {t("kyc:vehicule.catNoteSuite")}
      </Text>
    </View>
  );
}

export default function Vehicle() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [type, setType] = useState<VehicleType>("car");
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  const { categories, carAllowed, motoAllowed } = useAllowedVehicleTypes(userId, setType);
  const category = deriveCategory(type, categories);

  const submit = async () => {
    if (!userId) return;
    const cleaned = plate.trim().toUpperCase();
    if (!cleaned) {
      setError(t("kyc:vehicule.erreurPlaque"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertVehicle(supabase, { driverId: userId, category, plate: cleaned });
      router.push("/(auth)/payout" as Href);
    } catch (e) {
      setError(
        e instanceof TekoApiError && e.code === "network"
          ? t("erreurs.reseau")
          : t("erreurs.generique"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StepBar
        step={3}
        title={t("kyc:vehicule.titre")}
        onBack={() => router.back()}
        testID="vehicle-steps"
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>{t("kyc:vehicule.typeLabel")}</Text>
        <VehicleTypeCards
          selected={type}
          onSelect={setType}
          carAllowed={carAllowed}
          motoAllowed={motoAllowed}
        />
        <View style={styles.field}>
          <TextField
            label={t("kyc:vehicule.plaqueLabel")}
            placeholder={t("kyc:vehicule.plaquePlaceholder")}
            value={plate}
            onChangeText={(v) => {
              setPlate(v.toUpperCase());
              setError(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            error={error}
            testID="vehicle-plate"
          />
        </View>
        <CategoryNote label={t(CATEGORY_LABEL_KEY[category])} />
        <Button
          label={t("commun.continuer")}
          onPress={() => void submit()}
          accent="driver"
          busy={busy}
          testID="vehicle-continue"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    backgroundColor: color.neutral[50],
  },
  content: { paddingHorizontal: spacing[2], paddingTop: spacing[4], paddingBottom: spacing[8] },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
    marginBottom: spacing[2],
  },
  field: { marginTop: spacing[4] },
  catNote: {
    backgroundColor: color.role.driver.accentLight,
    borderLeftWidth: 3,
    borderLeftColor: color.role.driver.accent,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: spacing[4],
    marginBottom: spacing[5],
  },
  catNoteText: { fontSize: typography.fontSize.sm, lineHeight: 20, color: color.neutral[500] },
  catNoteStrong: { fontWeight: "700", color: color.role.driver.accentDark },
});
