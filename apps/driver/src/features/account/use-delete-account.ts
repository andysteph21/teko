// Suppression de compte chauffeur (D-19, parcours J) : solde à zéro d'abord
// — un solde non nul est bloqué avec le montant et route vers le règlement
// D-16 ; sinon garde-fou de confirmation → request_account_deletion →
// déconnexion → racine. Erreurs par TekoApiError.code, jamais de
// string-match.

import { driverBalance, requestAccountDeletion, signOut, TekoApiError } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useSession } from "../auth/use-session";

export function useDeleteAccount(): { onPressDelete: () => void; busy: boolean } {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSession();
  const [busy, setBusy] = useState(false);

  const doDelete = async () => {
    try {
      await requestAccountDeletion(supabase);
      await signOut(supabase).catch(() => undefined);
      router.replace("/" as Href);
    } catch (e) {
      if (e instanceof TekoApiError && e.code === "ride_in_progress") {
        Alert.alert(t("account:parametres.supprimer"), t("account:suppression.erreurCourse"));
      } else if (e instanceof TekoApiError && e.code === "network") {
        Alert.alert(t("account:parametres.supprimer"), t("erreurs.reseau"));
      } else {
        Alert.alert(t("account:parametres.supprimer"), t("erreurs.generique"));
      }
    }
  };

  const blockedByBalance = (balance: number) => {
    const montant = formatXaf(Math.abs(balance), "FCFA");
    if (balance < 0) {
      Alert.alert(
        t("account:suppression.bloqueTitre"),
        t("account:suppression.bloqueDoitTexte", { montant }),
        [
          { text: t("commun.annuler"), style: "cancel" },
          {
            text: t("account:suppression.bloqueCta"),
            onPress: () => router.push("/(main)/settlement" as Href),
          },
        ],
      );
      return;
    }
    Alert.alert(
      t("account:suppression.bloqueTitre"),
      t("account:suppression.bloqueCreditTexte", { montant }),
    );
  };

  const confirmDelete = () => {
    Alert.alert(t("account:suppression.confirmTitre"), t("account:suppression.confirmTexte"), [
      { text: t("commun.annuler"), style: "cancel" },
      {
        text: t("account:suppression.confirmCta"),
        style: "destructive",
        onPress: () => void doDelete(),
      },
    ]);
  };

  const onPressDelete = () => {
    if (!session || busy) return;
    setBusy(true);
    void driverBalance(supabase, session.user.id)
      .then((balance) => {
        if (balance === 0) confirmDelete();
        else blockedByBalance(balance);
      })
      .catch(() => Alert.alert(t("account:parametres.supprimer"), t("erreurs.generique")))
      .finally(() => setBusy(false));
  };

  return { onPressDelete, busy };
}
