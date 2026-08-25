// D-19 Paramètres chauffeur — consentement GPS explicite (setGpsConsent,
// traces anonymisées 12 mois pour la carte collaborative), mode éco/data
// (patron C-25 : sélecteur trois états), langue, déconnexion et suppression
// de compte (solde à zéro requis — flux dans use-delete-account).
//
// Écart maquette assumé : les deux interrupteurs « Mode éco » /
// « Automatique sous 2G » sont remplacés par le sélecteur trois états
// Éco / Auto / Complet du client C-25 (consigne produit, même patron).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyDriver, setGpsConsent, signOut } from "@teko/api-client";
import { color, spacing } from "@teko/ui";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { ScreenHeader } from "../../src/features/account/screen-header";
import {
  CollabSection,
  DataSection,
  ExitSection,
  PrefsSection,
} from "../../src/features/account/settings-sections";
import { useDeleteAccount } from "../../src/features/account/use-delete-account";
import { useSession } from "../../src/features/auth/use-session";
import { supabase } from "../../src/lib/supabase";

function useGpsConsent() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const [override, setOverride] = useState<boolean | null>(null);
  const { t } = useTranslation();

  const driver = useQuery({
    queryKey: ["my-driver", userId],
    enabled: Boolean(userId),
    queryFn: () => getMyDriver(supabase, userId as string),
  });
  const mutation = useMutation({
    mutationFn: (next: boolean) => setGpsConsent(supabase, userId as string, next),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["my-driver", userId] }),
    onError: () => {
      setOverride(null);
      Alert.alert(t("account:parametres.gpsTitre"), t("erreurs.generique"));
    },
  });

  const onToggle = (next: boolean) => {
    setOverride(next);
    mutation.mutate(next);
  };
  return {
    consent: override ?? driver.data?.gps_consent ?? false,
    ready: Boolean(userId) && !driver.isPending,
    onToggle,
  };
}

export default function Settings() {
  const router = useRouter();
  const { t } = useTranslation();
  const gps = useGpsConsent();
  const deletion = useDeleteAccount();

  const confirmSignOut = () => {
    Alert.alert(t("account:profil.deconnecterTitre"), t("account:profil.deconnecterTexte"), [
      { text: t("commun.annuler"), style: "cancel" },
      {
        text: t("account:parametres.deconnecter"),
        style: "destructive",
        onPress: () => {
          void signOut(supabase)
            .catch(() => undefined)
            .then(() => router.replace("/" as Href));
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("account:parametres.titre")} />
      <ScrollView contentContainerStyle={styles.content}>
        <CollabSection
          consent={gps.consent}
          consentReady={gps.ready}
          onToggleConsent={gps.onToggle}
        />
        <DataSection />
        <PrefsSection />
        <ExitSection onSignOut={confirmSignOut} onDelete={deletion.onPressDelete} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
});
