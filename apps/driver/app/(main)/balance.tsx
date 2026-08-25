// D-15 Solde du jour — solde signé driverBalance à quatre états visuels
// (créditeur / débiteur / urgence < 4 h avec compte à rebours / suspendu,
// jamais un écran mort), mouvements du jour métier (grand livre filtré
// business_day) et rappel de la clôture de 04 h 00 dans l'en-tête.

import { businessDay, msUntilCutoff } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { type Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BalanceCard } from "../../src/features/money/balance-card";
import { balanceState, jourLong, lignesDuJour } from "../../src/features/money/display";
import {
  useDriverBalance,
  useMyDriver,
  useMyLedger,
  useNowTick,
} from "../../src/features/money/hooks";
import { LedgerCard } from "../../src/features/money/ledger-list";
import { TealHeader } from "../../src/features/money/money-header";
import { ErrorView, LoadingView } from "../../src/features/money/state-views";

function SoldeSection({ solde, actif, now }: { solde: number; actif: boolean; now: Date }) {
  const router = useRouter();
  return (
    <BalanceCard
      etat={balanceState(solde, actif, now)}
      montantXaf={solde}
      msRestant={msUntilCutoff(now)}
      onRegler={() => router.push("/(main)/settlement" as Href)}
    />
  );
}

export default function BalanceScreen() {
  const { t } = useTranslation();
  const now = useNowTick();
  const balanceQ = useDriverBalance();
  const driverQ = useMyDriver();
  const ledgerQ = useMyLedger();
  const aujourdhui = businessDay(now);

  if (balanceQ.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <TealHeader title={t("money:solde.titre")} />
        <View style={styles.body}>
          <ErrorView error={balanceQ.error} onRetry={() => void balanceQ.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <TealHeader
        title={t("money:solde.titre")}
        subtitle={t("money:solde.sousTitre", { jour: jourLong(aujourdhui) })}
      />
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {balanceQ.data === undefined || driverQ.isPending ? (
          <View style={styles.loadingBox}>
            <LoadingView />
          </View>
        ) : (
          <SoldeSection solde={balanceQ.data} actif={driverQ.data?.is_active ?? true} now={now} />
        )}
        <Text style={styles.section}>{t("money:solde.mouvements")}</Text>
        <LedgerCard lignes={lignesDuJour(ledgerQ.data ?? [], aujourdhui)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.role.driver.accent },
  body: { flex: 1, backgroundColor: color.neutral[50] },
  bodyContent: { padding: spacing[4], paddingBottom: spacing[6] },
  loadingBox: { minHeight: 160 },
  section: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.neutral[500],
    marginTop: spacing[4],
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
});
