import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDriverBalance } from "./hooks";
import { NavHeader } from "./money-header";

export function CashSettlement() {
  const balance = useDriverBalance();
  const debt = balance.data === undefined ? null : Math.max(0, Math.ceil(-balance.data));
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <NavHeader title="Régler mon solde" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Règlement manuel de l’alpha</Text>
        <Text style={styles.amount} testID="settle-amount-display">
          {debt === null ? "—" : formatXaf(debt, "FCFA")}
        </Text>
        <Text style={styles.text}>
          Contactez l’équipe Teko pour régler en espèces ou par versement externe selon ses
          instructions.
        </Text>
        <Text style={styles.text}>
          Conservez le reçu ou la preuve du versement et sa référence. Ops prépare votre dossier ;
          Finance vérifie le justificatif et valide le montant.
        </Text>
        <Text style={styles.text}>
          Le solde change uniquement après confirmation de Finance. La remise d’un justificatif ne
          vaut pas validation.
        </Text>
        {balance.error ? (
          <Text style={styles.error}>
            Solde non actualisé. Vérifiez le réseau avant de confirmer le montant avec Teko.
          </Text>
        ) : null}
        <Button
          label="Actualiser le solde"
          onPress={() => void balance.refetch()}
          busy={balance.isFetching}
          testID="settle-refresh"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: { padding: spacing[6], gap: spacing[5] },
  title: { fontSize: typography.fontSize.xl, color: color.neutral[900], fontWeight: "700" },
  amount: {
    fontSize: typography.fontSize["3xl"],
    color: color.neutral[700],
    fontWeight: "900",
    textAlign: "center",
  },
  text: { fontSize: typography.fontSize.base, color: color.neutral[700], lineHeight: 24 },
  error: { color: color.semantic.error.dark },
});
