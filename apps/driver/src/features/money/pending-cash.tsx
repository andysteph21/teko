import { useQuery } from "@tanstack/react-query";
import { listCancellationClaims, listPayoutRequests } from "@teko/api-client";
import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useSession } from "../auth/use-session";

export function PendingCash() {
  const { session } = useSession();
  const userId = session?.user.id;
  const query = useQuery({
    queryKey: ["pending-cash", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [claims, payouts] = await Promise.all([
        listCancellationClaims(supabase),
        listPayoutRequests(supabase),
      ]);
      return { claims, payouts };
    },
  });
  if (query.error)
    return <Text style={styles.text}>Créances et versements en attente non actualisés.</Text>;
  const data = query.data;
  if (!data || (!data.claims.length && !data.payouts.length)) return null;
  return (
    <View style={styles.card} testID="pending-cash">
      <Text style={styles.title}>En attente de validation Finance</Text>
      {data.claims.map((claim) => (
        <Text key={claim.id} style={styles.text}>
          Frais de course : part chauffeur {formatXaf(Number(claim.driver_share), "FCFA")}, non
          créditée avant encaissement complet.
        </Text>
      ))}
      {data.payouts.map((payout) => (
        <Text key={payout.id} style={styles.text}>
          Versement du {payout.business_day} : {formatXaf(Number(payout.amount), "FCFA")}, en
          attente de justificatif validé.
        </Text>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: 12,
    backgroundColor: color.semantic.warning.light,
  },
  title: { fontSize: typography.fontSize.sm, fontWeight: "700", color: color.neutral[900] },
  text: { fontSize: typography.fontSize.sm, color: color.neutral[700], lineHeight: 20 },
});
