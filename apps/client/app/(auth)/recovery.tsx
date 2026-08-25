// Parcours E — « Je n'ai plus accès à mon numéro » : parcours assisté du
// MVP. Si un e-mail a été renseigné (C-05), la connexion e-mail est le
// premier filet ; sinon, canal support avec les éléments à préparer.

import { color, spacing, typography } from "@teko/ui";
import { Button, Card } from "@teko/ui/native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Recovery() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>{t("account:phone.plusAcces")}</Text>
      <Card style={styles.card}>
        <Text style={styles.item}>
          1. Si vous aviez renseigné un e-mail sur votre profil, vous pourrez recevoir un code de
          connexion par e-mail (repli MVP).
        </Text>
        <Text style={styles.item}>
          2. Sinon, contactez Teko (appel ou WhatsApp) en préparant : votre ancien numéro, votre
          prénom et la date de votre dernière course.
        </Text>
        <Text style={styles.item}>
          3. Une fois reconnecté, changez votre numéro depuis « Modifier le profil » — votre
          historique vous suit.
        </Text>
      </Card>
      <Button label={t("commun.fermer")} variant="secondary" onPress={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing[5], backgroundColor: color.neutral[50], gap: spacing[5] },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.brand[900],
    marginTop: spacing[8],
  },
  card: { gap: spacing[3] },
  item: { fontSize: typography.fontSize.base, color: color.neutral[600], lineHeight: 22 },
});
