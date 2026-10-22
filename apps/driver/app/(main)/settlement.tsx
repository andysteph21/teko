// D-16 Régler mon solde — montant pré-rempli avec la dette (modifiable),
// createSettlementPayment → invokeCollect → attente « validez sur votre
// téléphone Airtel » (poll getPayment 3 s) → succès « Réglé » (réactivation
// backend automatique) ou échec (renvoyer + repli règlement manuel DOC-01).

import { businessDay, formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { Button, TextField } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { jourBref, parseMontant, telephoneAffiche } from "../../src/features/money/display";
import { useDriverBalance, useMyDriver, useSettlementFlow } from "../../src/features/money/hooks";
import { NavHeader } from "../../src/features/money/money-header";
import {
  AirtelWaitCard,
  FallbackInfo,
  ManualCard,
  SettledView,
} from "../../src/features/money/settlement-cards";
import { messageErreur } from "../../src/features/money/state-views";

interface SaisieProps {
  texte: string;
  onTexte: (v: string) => void;
  onRegler: (montant: number) => void;
  busy: boolean;
  erreur: unknown;
}

function SaisieView({ texte, onTexte, onRegler, busy, erreur }: SaisieProps) {
  const { t } = useTranslation();
  const montant = parseMontant(texte);
  return (
    <View style={styles.saisie}>
      <TextField
        label={t("money:reglement.montantLabel")}
        helper={t("money:reglement.montantAide")}
        error={texte.length > 0 && montant === null ? t("money:reglement.montantInvalide") : null}
        value={texte}
        onChangeText={onTexte}
        keyboardType="number-pad"
        testID="settle-amount"
      />
      {erreur ? <Text style={styles.erreur}>{messageErreur(erreur, t)}</Text> : null}
      <Button
        label={t("money:reglement.cta")}
        accent="driver"
        disabled={montant === null}
        busy={busy}
        onPress={() => montant !== null && onRegler(montant)}
        testID="settle-submit"
      />
    </View>
  );
}

interface AttenteProps {
  numero: string | null;
  echec: boolean;
  onRenvoyer: () => void;
  renvoiBusy: boolean;
}

function AttenteView({ numero, echec, onRenvoyer, renvoiBusy }: AttenteProps) {
  return (
    <>
      <AirtelWaitCard numero={numero} echec={echec} onRenvoyer={onRenvoyer} busy={renvoiBusy} />
      {echec ? <ManualCard /> : null}
      <FallbackInfo />
    </>
  );
}

export function DeferredAirtelSettlementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const balanceQ = useDriverBalance();
  const driverQ = useMyDriver();
  const { demarrer, renvoyer, payment, phase } = useSettlementFlow();
  const [saisi, setSaisi] = useState<string | null>(null);

  // Dette arrondie au franc supérieur : le XAF n'a pas de décimales, et
  // « 712.5 » pré-rempli deviendrait 7 125 via parseMontant (point retiré).
  const dette = balanceQ.data !== undefined && balanceQ.data < 0 ? Math.ceil(-balanceQ.data) : null;
  const texte = saisi ?? (dette !== null ? String(dette) : "");
  const montantAffiche = payment ? Number(payment.amount) : parseMontant(texte);
  const numero = driverQ.data?.payout_msisdn ? telephoneAffiche(driverQ.data.payout_msisdn) : null;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <NavHeader title={t("money:reglement.titre")} />
      <ScrollView contentContainerStyle={styles.content}>
        {phase === "succes" ? (
          <SettledView onRetour={() => router.replace("/(main)/balance" as Href)} />
        ) : (
          <>
            <Text style={styles.montant} testID="settle-amount-display">
              {montantAffiche !== null ? formatXaf(montantAffiche, "FCFA") : "—"}
            </Text>
            <Text style={styles.sousTitre}>
              {t("money:reglement.sousTitre", { jour: jourBref(businessDay(new Date())) })}
            </Text>
            {phase === "saisie" ? (
              <SaisieView
                texte={texte}
                onTexte={setSaisi}
                onRegler={(montant) => demarrer.mutate(montant)}
                busy={demarrer.isPending}
                erreur={demarrer.error}
              />
            ) : (
              <AttenteView
                numero={numero}
                echec={phase === "echec"}
                onRenvoyer={() => renvoyer.mutate()}
                renvoiBusy={renvoyer.isPending}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { paddingHorizontal: spacing[6], paddingTop: spacing[6], paddingBottom: spacing[6] },
  montant: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    color: color.neutral[700],
    textAlign: "center",
  },
  sousTitre: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
    marginTop: spacing[1],
    marginBottom: spacing[6],
  },
  saisie: { gap: spacing[4] },
  erreur: {
    fontSize: typography.fontSize.sm,
    color: color.semantic.error.default,
    textAlign: "center",
  },
});

export { CashSettlement as default } from "../../src/features/money/cash-settlement";
