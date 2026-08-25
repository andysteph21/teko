// C-23 Profil & paramètres — en-tête dégradé (avatar initiale, prénom,
// numéro), groupes de navigation Mon compte / Préférences / Aide / Sortie ;
// déconnexion avec confirmation, suppression de compte en ligne rouge.

import { listMyLandmarkProposals, signOut } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { BellIcon, DataBarsIcon, LandmarkPinIcon } from "@teko/ui/native";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { type Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "../../src/features/auth/use-profile";
import { useDataUsage } from "../../src/features/data/data-state";
import { formatGabonPhone } from "../../src/features/settings/format-phone";
import {
  BagIcon,
  GlobeIcon,
  HelpIcon,
  LogoutIcon,
  PersonIcon,
  TrashIcon,
} from "../../src/features/settings/icons";
import {
  SectionLabel,
  SettingsGroup,
  SettingsRow,
} from "../../src/features/settings/settings-row";
import { supabase } from "../../src/lib/supabase";

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const usage = useDataUsage();
  const proposals = useQuery({
    queryKey: ["landmark-proposals"],
    queryFn: () => listMyLandmarkProposals(supabase),
  });

  const firstName = (profile.data?.full_name ?? "").trim().split(" ")[0] ?? "";
  const validatedCount = (proposals.data ?? []).filter((p) => p.status === "validated").length;

  const confirmSignOut = () => {
    Alert.alert(t("account:hub.deconnecterTitre"), t("account:hub.deconnecterTexte"), [
      { text: t("commun.annuler"), style: "cancel" },
      {
        text: t("account:hub.deconnecter"),
        style: "destructive",
        onPress: () => {
          void signOut(supabase)
            .catch(() => undefined)
            .then(() => router.replace("/"));
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[color.brand[800], color.brand[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing[5] }]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase() || "•"}</Text>
        </View>
        <View>
          <Text style={styles.name}>{firstName || "…"}</Text>
          <Text style={styles.phone}>{formatGabonPhone(profile.data?.phone)}</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <SectionLabel>{t("account:hub.secCompte")}</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            label={t("account:hub.modifierProfil")}
            icon={<PersonIcon />}
            onPress={() => router.push("/(main)/profile-edit" as Href)}
            testID="hub-edit"
          />
          <SettingsRow
            label={t("account:hub.reperes")}
            icon={<LandmarkPinIcon size={16} color={color.brand[800]} />}
            value={
              validatedCount > 0
                ? t("account:hub.reperesValides", { count: validatedCount })
                : undefined
            }
            onPress={() => router.push("/(main)/my-landmarks" as Href)}
            testID="hub-landmarks"
          />
          <SettingsRow
            label={t("account:hub.courses")}
            icon={<BagIcon />}
            onPress={() => router.push("/(main)/rides" as Href)}
            testID="hub-rides"
          />
        </SettingsGroup>

        <SectionLabel>{t("account:hub.secPreferences")}</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            label={t("account:hub.donnees")}
            icon={<DataBarsIcon size={16} strokeWidth={2.2} />}
            value={t("account:hub.donneesValeur", { quantite: usage.quantityText })}
            onPress={() => router.push("/(main)/data-settings" as Href)}
            testID="hub-data"
          />
          <SettingsRow
            label={t("account:hub.langue")}
            icon={<GlobeIcon />}
            value={t("account:hub.langueValeur")}
            onPress={() => router.push("/(main)/language" as Href)}
            testID="hub-language"
          />
          <SettingsRow
            label={t("account:hub.notifications")}
            icon={<BellIcon size={16} color={color.brand[800]} />}
            onPress={() => router.push("/(main)/notifications" as Href)}
            testID="hub-notifications"
          />
        </SettingsGroup>

        <SectionLabel>{t("account:hub.secAide")}</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            label={t("account:hub.contacter")}
            icon={<HelpIcon />}
            // TODO : écran support dédié hors périmètre MVP — coordonnées au lancement.
            onPress={() => Alert.alert(t("account:hub.contacter"), t("account:hub.contacterTexte"))}
            testID="hub-contact"
          />
        </SettingsGroup>

        <SectionLabel>{t("account:hub.secSortie")}</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            label={t("account:hub.deconnecter")}
            icon={<LogoutIcon color={color.neutral[600]} />}
            iconBackground={color.neutral[100]}
            onPress={confirmSignOut}
            testID="hub-signout"
          />
          <SettingsRow
            label={t("account:hub.supprimer")}
            icon={<TrashIcon color={color.semantic.error.default} />}
            iconBackground={color.semantic.error.light}
            danger
            onPress={() => router.push("/(main)/delete-account" as Href)}
            testID="hub-delete"
          />
        </SettingsGroup>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { paddingBottom: spacing[8] },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: spacing[5],
    paddingBottom: 22,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: color.neutral[0], fontWeight: "700", fontSize: 22 },
  name: { fontSize: typography.fontSize.lg, fontWeight: "700", color: color.neutral[0] },
  phone: {
    fontSize: typography.fontSize.sm,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  body: { paddingHorizontal: spacing[4] },
});
