// C-05 Profil — prénom requis, nom et e-mail optionnels. L'e-mail (badge
// MVP) est le filet de récupération si le numéro est perdu (parcours E).

import { updateProfile } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, MvpBadge, TextField } from "@teko/ui/native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../src/lib/supabase";

export default function ProfileSetup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error("session absente");
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      await updateProfile(supabase, userId, {
        fullName,
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      router.replace("/(auth)/location");
    } catch {
      setError(t("erreurs.generique"));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>{t("account:profil.titre")}</Text>
      <Text style={styles.text}>{t("account:profil.texte")}</Text>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{firstName.trim().charAt(0).toUpperCase() || "•"}</Text>
      </View>
      <View style={styles.form}>
        <TextField
          label={t("account:profil.prenom")}
          placeholder={t("account:profil.prenomPlaceholder")}
          value={firstName}
          onChangeText={setFirstName}
          autoComplete="given-name"
          testID="profile-firstname"
        />
        <TextField
          label={`${t("account:profil.nom")} ${t("account:profil.nomOptionnel")}`}
          placeholder={t("account:profil.nomPlaceholder")}
          value={lastName}
          onChangeText={setLastName}
          autoComplete="family-name"
        />
        <View>
          <View style={styles.emailLabel}>
            <Text style={styles.emailLabelText}>
              {t("account:profil.email")} {t("account:profil.nomOptionnel")}
            </Text>
            <MvpBadge />
          </View>
          <TextField
            placeholder={t("account:profil.emailPlaceholder")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            helper={t("account:profil.emailHelper")}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={t("account:profil.cta")}
          onPress={() => void save()}
          busy={busy}
          disabled={firstName.trim().length === 0}
          testID="profile-continue"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing[5], backgroundColor: color.neutral[50] },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.brand[900],
    marginTop: spacing[8],
  },
  text: { fontSize: typography.fontSize.base, color: color.neutral[500], marginTop: spacing[2] },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 9999,
    backgroundColor: color.brand[50],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: spacing[5],
  },
  avatarText: { color: color.brand[800], fontSize: typography.fontSize["2xl"], fontWeight: "700" },
  form: { marginTop: spacing[5], gap: spacing[4] },
  emailLabel: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: 6 },
  emailLabelText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
  },
  error: { color: color.semantic.error.default, fontSize: typography.fontSize.sm },
});
