// D-17 Mes gains — relevés quotidiens listMyStatements (statut par puce,
// lignes ouverture/clôture/commission/crédits Airtel/versement), résumé de
// la semaine en tête (somme nette des 7 derniers jours métier), état vide
// propre après la première clôture.

import { businessDay, formatXaf } from "@teko/core";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resumeSemaine, type StatementRow } from "../../src/features/money/display";
import { useMyStatements } from "../../src/features/money/hooks";
import { TealHeader } from "../../src/features/money/money-header";
import { ErrorView, LoadingView } from "../../src/features/money/state-views";
import { StatementCard } from "../../src/features/money/statement-card";

function Stat({ valeur, label, testID }: { valeur: string; label: string; testID: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValeur} testID={testID}>
        {valeur}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatsSemaine({ releves, aujourdhui }: { releves: StatementRow[]; aujourdhui: string }) {
  const { t } = useTranslation();
  const resume = resumeSemaine(releves, aujourdhui);
  return (
    <View style={styles.stats}>
      <Stat
        valeur={formatXaf(resume.net)}
        label={t("money:gains.statSemaine")}
        testID="stat-week"
      />
      <Stat
        valeur={String(resume.journees)}
        label={t("money:gains.statJournees")}
        testID="stat-days"
      />
      <Stat
        valeur={formatXaf(resume.commission)}
        label={t("money:gains.statCommission")}
        testID="stat-commission"
      />
    </View>
  );
}

function RelevesList({ releves, aujourdhui }: { releves: StatementRow[]; aujourdhui: string }) {
  const { t } = useTranslation();
  if (releves.length === 0) {
    return (
      <View style={styles.vide}>
        <Text style={styles.videTitre}>{t("money:gains.videTitre")}</Text>
        <Text style={styles.videTexte}>{t("money:gains.videTexte")}</Text>
      </View>
    );
  }
  return (
    <>
      {releves.map((releve) => (
        <StatementCard key={releve.id} releve={releve} aujourdhuiIso={aujourdhui} />
      ))}
    </>
  );
}

export default function EarningsScreen() {
  const { t } = useTranslation();
  const statementsQ = useMyStatements();
  const aujourdhui = businessDay(new Date());
  const releves = statementsQ.data ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <TealHeader title={t("money:gains.titre")}>
        <StatsSemaine releves={releves} aujourdhui={aujourdhui} />
      </TealHeader>
      <View style={styles.body}>
        {statementsQ.isPending ? (
          <LoadingView />
        ) : statementsQ.isError ? (
          <ErrorView error={statementsQ.error} onRetry={() => void statementsQ.refetch()} />
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            <RelevesList releves={releves} aujourdhui={aujourdhui} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.role.driver.accent },
  body: { flex: 1, backgroundColor: color.neutral[50] },
  listContent: { padding: spacing[4], paddingBottom: spacing[6] },
  stats: { flexDirection: "row", gap: spacing[2], marginTop: spacing[3] },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  statValeur: {
    fontSize: typography.fontSize.base,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    color: color.neutral[0],
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: color.neutral[0],
    opacity: 0.85,
    marginTop: 1,
  },
  vide: { alignItems: "center", gap: spacing[2], marginTop: spacing[10], padding: spacing[4] },
  videTitre: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  videTexte: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
  },
});
