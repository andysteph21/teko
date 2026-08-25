// D-18 Profil & documents — en-tête teal (avatar initiales, nom, note ★,
// catégories), statut de chaque pièce du dossier (validée / en cours /
// refusée + motif), numéro de versement masqué, accès Paramètres,
// déconnexion avec confirmation.
//
// Écarts maquette assumés : pas de rangée de stats (642 courses / 98 %
// d'acceptation — le taux n'existe pas en base, question ouverte n°4 du
// parcours chauffeur) ; pas de section « Mon véhicule » (aucune lecture
// véhicule dans @teko/api-client — TODO backend : exposer getMyVehicle) ;
// ligne « Paramètres » ajoutée comme point d'entrée vers D-19 en attendant
// la barre d'onglets de l'accueil.

import { useQuery } from "@tanstack/react-query";
import { getMyDriver, getProfile, listMyDocuments, signOut } from "@teko/api-client";
import { color, spacing } from "@teko/ui";
import { type Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { latestDocuments } from "../../src/features/account/format";
import {
  DocumentsSection,
  PayoutSection,
  ProfileHeader,
} from "../../src/features/account/profile-sections";
import { Group, Row, SectionLabel } from "../../src/features/account/rows";
import { useSession } from "../../src/features/auth/use-session";
import { supabase } from "../../src/lib/supabase";

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;

  const profile = useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: () => getProfile(supabase, userId as string),
  });
  const driver = useQuery({
    queryKey: ["my-driver", userId],
    enabled: Boolean(userId),
    queryFn: () => getMyDriver(supabase, userId as string),
  });
  const documents = useQuery({
    queryKey: ["my-documents"],
    queryFn: () => listMyDocuments(supabase),
  });

  // TODO parcours J : double vérification du changement de numéro
  // (OTP compte + mini-versement sur le nouveau numéro Airtel).
  const onChangeNumber = () => {
    Alert.alert(t("account:profil.changerNumeroTitre"), t("account:profil.changerNumeroTexte"));
  };

  const confirmSignOut = () => {
    Alert.alert(t("account:profil.deconnecterTitre"), t("account:profil.deconnecterTexte"), [
      { text: t("commun.annuler"), style: "cancel" },
      {
        text: t("account:profil.deconnecter"),
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
      <ProfileHeader fullName={profile.data?.full_name ?? ""} driver={driver.data ?? null} />
      <View style={styles.body}>
        <DocumentsSection documents={latestDocuments(documents.data ?? [])} />
        <PayoutSection
          payoutMsisdn={driver.data?.payout_msisdn ?? null}
          onChangeNumber={onChangeNumber}
        />
        <SectionLabel>{t("account:profil.secCompte")}</SectionLabel>
        <Group>
          <Row
            title={t("account:profil.parametres")}
            onPress={() => router.push("/(main)/settings" as Href)}
            testID="profile-settings"
          />
          <Row
            title={t("account:profil.deconnecter")}
            onPress={confirmSignOut}
            testID="profile-signout"
          />
        </Group>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { paddingBottom: spacing[8] },
  body: { paddingHorizontal: spacing[4] },
});
