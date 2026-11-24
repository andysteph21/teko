// C-05 Profil — prénom et numéro de téléphone requis, nom optionnel. Le
// numéro est un contact déclaré (décision A3 du 23 novembre 2026) : il peut
// changer sans perdre le compte, qui suit l'adresse e-mail.

import { updateContactPhone, updateProfile } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button, TextField } from "@teko/ui/native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isValidGabonNational } from "../../src/features/auth/otp-channel";
import { supabase } from "../../src/lib/supabase";

export default function ProfileSetup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  // Compte ouvert par numéro (banc, option SMS) : le numéro est déjà connu.
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const known = data.user?.phone?.replace(/\D/g, "") ?? "";
      if (known.startsWith("241")) setPhone((current) => current || known.slice(3));
    });
  }, []);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error("session absente");
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      await updateProfile(supabase, userId, { fullName });
      await updateContactPhone(supabase, `+241${phone.replace(/\s/g, "")}`);
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
        <TextField
          label={t("account:profil.telephone")}
          prefix="🇬🇦 +241"
          placeholder={t("account:phone.placeholder")}
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
          helper={t("account:profil.telephoneHelper")}
          testID="profile-phone"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label={t("account:profil.cta")}
          onPress={() => void save()}
          busy={busy}
          disabled={
            firstName.trim().length === 0 || !isValidGabonNational(phone.replace(/\s/g, ""))
          }
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
  error: { color: color.semantic.error.default, fontSize: typography.fontSize.sm },
});
