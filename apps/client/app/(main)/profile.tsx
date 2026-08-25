// C-23 Profil & paramètres — en-tête dégradé (avatar initiale, prénom,
// numéro), groupes de navigation Mon compte / Préférences / Aide / Sortie ;
// déconnexion avec confirmation, suppression de compte en ligne rouge.

import { useQuery } from "@tanstack/react-query";
import { listMyLandmarkProposals, signOut } from "@teko/api-client";
import { color, spacing } from "@teko/ui";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useProfile } from "../../src/features/auth/use-profile";
import { formatGabonPhone } from "../../src/features/settings/format-phone";
import {
  HubAccountSection,
  HubExitSection,
  HubHeader,
  HubPreferencesSection,
  HubSupportSection,
} from "../../src/features/settings/hub-sections";
import { supabase } from "../../src/lib/supabase";

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useProfile();
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
      <HubHeader name={firstName} phone={formatGabonPhone(profile.data?.phone)} />
      <View style={styles.body}>
        <HubAccountSection validatedCount={validatedCount} />
        <HubPreferencesSection />
        <HubSupportSection />
        <HubExitSection onSignOut={confirmSignOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { paddingBottom: spacing[8] },
  body: { paddingHorizontal: spacing[4] },
});
