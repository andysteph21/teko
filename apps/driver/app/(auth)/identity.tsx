// D-04 Inscription 1/4 — Identité : prénom/nom (profil), photo visible des
// passagers (pastille décorative, TODO téléversement réel), catégories
// exercées (multi-sélection) → création de la fiche chauffeur (pending).

import { createDriverProfile, TekoApiError, updateProfile } from "@teko/api-client";
import type { VehicleCategory } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../src/features/auth/use-session";
import { CategoryPills } from "../../src/features/kyc/category-pills";
import { CameraIcon, PersonIcon } from "../../src/features/kyc/icons";
import { NameFields } from "../../src/features/kyc/name-fields";
import { StepBar } from "../../src/features/kyc/step-bar";
import { useNamePrefill } from "../../src/features/kyc/use-name-prefill";
import { supabase } from "../../src/lib/supabase";

export default function Identity() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  useNamePrefill(userId, setFirstName, setLastName);

  const toggleCategory = (category: VehicleCategory) => {
    setError(null);
    setCategories((list) =>
      list.includes(category) ? list.filter((c) => c !== category) : [...list, category],
    );
  };

  const submit = async () => {
    if (!userId) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("kyc:identite.erreurNoms"));
      return;
    }
    if (categories.length === 0) {
      setError(t("kyc:identite.erreurCategories"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateProfile(supabase, userId, {
        fullName: `${firstName.trim()} ${lastName.trim()}`,
      });
      await createDriverProfile(supabase, userId, categories);
      router.push("/(auth)/documents" as Href);
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
        step={1}
        title={t("kyc:identite.titre")}
        onBack={() => router.back()}
        testID="identity-steps"
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sub}>{t("kyc:identite.sub")}</Text>
        {/* TODO(kyc) : téléversement réel de la photo de profil (bucket kyc,
            type profile_photo) — pastille décorative en attendant. */}
        <View style={styles.avatarZone}>
          <View style={styles.avatar} testID="identity-avatar">
            <PersonIcon />
            <View style={styles.avatarBadge}>
              <CameraIcon size={13} />
            </View>
          </View>
        </View>
        <NameFields
          firstName={firstName}
          lastName={lastName}
          onFirstName={(v) => {
            setFirstName(v);
            setError(null);
          }}
          onLastName={(v) => {
            setLastName(v);
            setError(null);
          }}
        />
        <Text style={styles.sectionLabel}>{t("kyc:identite.categories")}</Text>
        <CategoryPills selected={categories} onToggle={toggleCategory} />
        <Text style={styles.helper}>{t("kyc:identite.categoriesAide")}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.cta}>
          <Button
            label={t("commun.continuer")}
            onPress={() => void submit()}
            accent="driver"
            busy={busy}
            testID="identity-continue"
          />
        </View>
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
  sub: { fontSize: typography.fontSize.sm, color: color.neutral[500], marginBottom: spacing[5] },
  avatarZone: { alignItems: "center", marginBottom: spacing[5] },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 9999,
    backgroundColor: color.role.driver.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 9999,
    backgroundColor: color.role.driver.accent,
    borderWidth: 3,
    borderColor: color.neutral[50],
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  helper: { fontSize: typography.fontSize.xs, color: color.neutral[500], marginTop: spacing[2] },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    marginTop: spacing[3],
  },
  cta: { marginTop: spacing[6] },
});
