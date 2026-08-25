// Formulaire du C-16 : avatar, étoiles, compliments, commentaire, envoi.
// L'écran route ne garde que la mutation ; l'état de saisie vit ici.

import type { RideRow } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { categorieLabel, heureFr, initialesDe, jourFr } from "./format";
import {
  type Compliment,
  ComplimentChips,
  construireCommentaire,
  StarRating,
  type Stars,
} from "./rating-controls";

export interface RatingFormProps {
  ride: RideRow;
  nomChauffeur: string | null;
  busy: boolean;
  erreur: string | null;
  onEnvoyer: (stars: Stars, commentaire: string | undefined) => void;
  onPasser: () => void;
}

export function RatingForm({
  ride,
  nomChauffeur,
  busy,
  erreur,
  onEnvoyer,
  onPasser,
}: RatingFormProps) {
  const { t } = useTranslation();
  const [stars, setStars] = useState(0);
  const [choix, setChoix] = useState<readonly Compliment[]>([]);
  const [texte, setTexte] = useState("");

  const nom = nomChauffeur ?? t("payment:evaluation.chauffeur");
  const quand = ride.completed_at ?? ride.created_at;
  const sousTitre = [
    nom,
    categorieLabel(ride.category),
    `${jourFr(quand) ?? t("payment:evaluation.aujourdhui")} ${heureFr(quand)}`,
  ].join(" · ");

  const basculer = (c: Compliment) =>
    setChoix((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  const envoyer = () => {
    const libelles = choix.map((c) => t(`payment:evaluation.${c}`));
    onEnvoyer(stars as Stars, construireCommentaire(libelles, texte));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.skipBar}>
        <Pressable onPress={onPasser} accessibilityRole="button" testID="rating-skip">
          <Text style={styles.skip}>{t("payment:evaluation.passer")}</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexte}>{initialesDe(nom)}</Text>
        </View>
        <Text style={styles.titre}>{t("payment:evaluation.titre")}</Text>
        <Text style={styles.sousTitre}>{sousTitre}</Text>
        <StarRating value={stars} onChange={setStars} />
        <ComplimentChips selection={choix} onToggle={basculer} />
        <TextInput
          style={styles.commentaire}
          placeholder={t("payment:evaluation.commentaire")}
          placeholderTextColor={color.neutral[400]}
          multiline
          value={texte}
          onChangeText={setTexte}
          testID="rating-comment"
        />
        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        <Button
          label={t("payment:evaluation.envoyer")}
          onPress={envoyer}
          busy={busy}
          disabled={stars < 1}
          testID="rating-submit"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  skipBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: spacing[5],
    paddingHorizontal: spacing[4],
  },
  skip: {
    fontSize: typography.fontSize.base,
    fontWeight: "600",
    color: color.neutral[500],
    padding: spacing[1],
  },
  content: { flex: 1, paddingTop: spacing[2], paddingHorizontal: spacing[6] },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[50],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing[3],
  },
  avatarTexte: { fontSize: 26, fontWeight: "700", color: color.brand[800] },
  titre: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: color.brand[900],
    textAlign: "center",
    marginBottom: spacing[1],
  },
  sousTitre: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    textAlign: "center",
    marginBottom: 22,
  },
  commentaire: {
    minHeight: 76,
    borderRadius: borderRadius.md,
    backgroundColor: color.neutral[100],
    paddingVertical: spacing[3],
    paddingHorizontal: 14,
    fontSize: typography.fontSize.sm,
    color: color.neutral[700],
    textAlignVertical: "top",
    marginBottom: 18,
  },
  erreur: {
    fontSize: typography.fontSize.sm,
    color: color.semantic.error.default,
    textAlign: "center",
    marginBottom: spacing[2],
  },
});
