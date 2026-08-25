// C-24 Modifier le profil — prénom/nom/e-mail pré-remplis (full_name scindé
// au premier espace), e-mail badge MVP + filet de récupération ; carte
// « Changer de numéro » (double OTP, parcours E — à venir) ; Enregistrer.

import { TekoApiError, updateProfile } from "@teko/api-client";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button, MvpBadge, TextField } from "@teko/ui/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useProfile } from "../../src/features/auth/use-profile";
import { formatGabonPhone } from "../../src/features/settings/format-phone";
import { CameraIcon, PhoneDeviceIcon } from "../../src/features/settings/icons";
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

  // TODO(parcours E) : double OTP ancien → nouveau numéro, stub en attendant.
  const changeNumber = () =>
    Alert.alert(t("account:modifierProfil.bientotTitre"), t("account:modifierProfil.bientotTexte"));

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("account:modifierProfil.titre")} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarZone}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName.trim().charAt(0).toUpperCase() || "•"}</Text>
            <LinearGradient
              colors={[color.brand[800], color.brand[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cam}
            >
              <CameraIcon size={13} color={color.neutral[0]} />
            </LinearGradient>
          </View>
        </View>

        <View style={styles.form}>
          <TextField
            label={t("account:profil.prenom")}
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
            testID="edit-firstname"
          />
          <TextField
            label={`${t("account:profil.nom")} ${t("account:profil.nomOptionnel")}`}
            value={lastName}
            onChangeText={setLastName}
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
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              helper={t("account:profil.emailHelper")}
              testID="edit-email"
            />
          </View>
        </View>

        <Pressable
          style={styles.numRow}
          onPress={changeNumber}
          accessibilityRole="button"
          testID="edit-change-number"
        >
          <View style={styles.numIcon}>
            <PhoneDeviceIcon />
          </View>
          <View style={styles.numBody}>
            <Text style={styles.numTitle}>{t("account:modifierProfil.changerNumero")}</Text>
            <Text style={styles.numText}>
              {t("account:modifierProfil.changerNumeroTexte", {
                phone: formatGabonPhone(profile.data?.phone),
              })}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { padding: spacing[6], paddingTop: spacing[5] },
  avatarZone: { alignItems: "center", marginBottom: 22 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: color.brand[800], fontWeight: "700", fontSize: 30 },
  cam: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderColor: color.neutral[50],
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: spacing[3] },
  emailLabel: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: 6 },
  emailLabelText: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
  },
  numRow: {
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  numIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  numBody: { flex: 1 },
  numTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  numText: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[500],
    marginTop: 1,
    lineHeight: 16,
  },
  chevron: { fontSize: typography.fontSize.md, color: color.neutral[300] },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[2],
  },
});
