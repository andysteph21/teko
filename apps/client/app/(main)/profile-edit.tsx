// C-24 Modifier le profil — prénom/nom/e-mail pré-remplis (full_name scindé
// au premier espace), e-mail badge MVP + filet de récupération ; carte
// « Changer de numéro » (double OTP, parcours E — à venir) ; Enregistrer.

import { TekoApiError, updateProfile } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, MvpBadge, TextField } from "@teko/ui/native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useProfile } from "../../src/features/auth/use-profile";
import { ChangeNumberCard, EditAvatar } from "../../src/features/settings/profile-edit-parts";
import { ScreenHeader } from "../../src/features/settings/screen-header";
import { supabase } from "../../src/lib/supabase";

export default function ProfileEdit() {
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useProfile();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loaded || !profile.data) return;
    const [first = "", ...rest] = (profile.data.full_name ?? "").trim().split(" ");
    setFirstName(first);
    setLastName(rest.join(" "));
    setEmail(profile.data.email ?? "");
    setLoaded(true);
  }, [loaded, profile.data]);

  const save = async () => {
    const userId = profile.data?.id;
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      await updateProfile(supabase, userId, { fullName, email: email.trim() || null });
      router.back();
    } catch (e) {
      setBusy(false);
      setError(
        e instanceof TekoApiError && e.code === "network"
          ? t("erreurs.reseau")
          : t("erreurs.generique"),
      );
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("account:modifierProfil.titre")} />
      <ScrollView contentContainerStyle={styles.content}>
        <EditAvatar initial={firstName.trim().charAt(0).toUpperCase()} />
        <ProfileEditFields
          values={{ firstName, lastName, email }}
          onFirstName={setFirstName}
          onLastName={setLastName}
          onEmail={setEmail}
        />
        <ChangeNumberCard phone={profile.data?.phone} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={t("account:modifierProfil.enregistrer")}
          onPress={() => void save()}
          busy={busy}
          disabled={firstName.trim().length === 0}
          testID="edit-save"
        />
      </ScrollView>
    </View>
  );
}

interface ProfileEditFieldsProps {
  values: { firstName: string; lastName: string; email: string };
  onFirstName: (v: string) => void;
  onLastName: (v: string) => void;
  onEmail: (v: string) => void;
}

function ProfileEditFields({ values, onFirstName, onLastName, onEmail }: ProfileEditFieldsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.form}>
      <TextField
        label={t("account:profil.prenom")}
        value={values.firstName}
        onChangeText={onFirstName}
        autoComplete="given-name"
        testID="edit-firstname"
      />
      <TextField
        label={`${t("account:profil.nom")} ${t("account:profil.nomOptionnel")}`}
        value={values.lastName}
        onChangeText={onLastName}
        autoComplete="family-name"
        testID="edit-lastname"
      />
      <View>
        <View style={styles.emailLabel}>
          <Text style={styles.emailLabelText}>
            {t("account:profil.email")} {t("account:profil.nomOptionnel")}
          </Text>
          <MvpBadge />
        </View>
        <TextField
          value={values.email}
          onChangeText={onEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          helper={t("account:profil.emailHelper")}
          testID="edit-email"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { padding: spacing[6], paddingTop: spacing[5] },
  form: { gap: spacing[3] },
  emailLabel: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: 6 },
  emailLabelText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
  },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[2],
  },
});
