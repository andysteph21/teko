// C-26 Proposer un repère — nom, catégorie (10 choix), position = destination
// du brouillon si présente sinon centre par défaut (position actuelle de la
// carte), photo optionnelle (TODO), envoi via propose_landmark puis état
// « En validation » avant retour.
//
// TODO(proposer-photo) : téléversement de la photo (bucket Storage + champ
// p_photo de la RPC) — hors périmètre de ce lot, la boîte reste inerte.

import { mapApiError, TekoApiError } from "@teko/api-client";
import { TekoMapData } from "@teko/maps";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BackIcon, Button, StatusChip, TextField } from "@teko/ui/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_CENTER, TILES_URL } from "../../src/config";
import { useBookingStore } from "../../src/features/booking/store";
import { TekoMapView } from "../../src/features/map/native-map";
import { type LandmarkCategory, LANDMARK_CATEGORY_VALUES } from "../../src/features/places/categories";
import { ChoiceChips } from "../../src/features/places/choice-chips";
import { DestinationPin } from "../../src/features/places/destination-pin";
import { supabase } from "../../src/lib/supabase";

export default function ProposeLandmark() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name?: string }>();
  const destination = useBookingStore((s) => s.destination);
  const [name, setName] = useState(params.name ?? "");
  const [category, setCategory] = useState<LandmarkCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const position = destination?.position ?? DEFAULT_CENTER;
  const categoryOptions = LANDMARK_CATEGORY_VALUES.map((value) => ({
    value,
    label: t(`places:proposer.categories.${value}`),
  }));

  const submit = async () => {
    if (!category) return;
    setBusy(true);
    setError(null);
    try {
      await new TekoMapData(supabase).proposeLandmark({ name: name.trim(), category, position });
      setSent(true);
    } catch (e) {
      const err = e instanceof TekoApiError ? e : mapApiError(e);
      setError(err.code === "network" ? t("erreurs.reseau") : t("erreurs.generique"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        <TekoMapView options={{ tilesUrl: TILES_URL }} center={position} zoom={15.5}>
          <DestinationPin position={position} />
        </TekoMapView>
      </View>
      <Pressable
        onPress={() => router.back()}
        style={[styles.back, { top: insets.top + spacing[3] }]}
        accessibilityRole="button"
        accessibilityLabel={t("places:proposer.retour")}
        testID="propose-back"
      >
        <BackIcon size={18} />
      </Pressable>

      {sent ? (
        <View style={styles.content} testID="propose-success">
          <View style={styles.successChip}>
            <StatusChip label={t("places:proposer.succesChip")} tone="pending" />
          </View>
          <Text style={styles.title}>{t("places:proposer.succesTitre")}</Text>
          <Text style={styles.sub}>{t("places:proposer.succesTexte")}</Text>
          <Button
            label={t("commun.fermer")}
            variant="secondary"
            onPress={() => router.back()}
            testID="propose-close"
          />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing[6] }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{t("places:proposer.titre")}</Text>
          <Text style={styles.sub}>{t("places:proposer.sous")}</Text>
          <TextField
            label={t("places:proposer.nomLabel")}
            placeholder={t("places:proposer.nomPlaceholder")}
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(null);
            }}
            testID="propose-name"
          />
          <Text style={styles.fieldLabel}>{t("places:proposer.categorieLabel")}</Text>
          <ChoiceChips
            options={categoryOptions}
            selected={category}
            onSelect={setCategory}
            testIDPrefix="propose-cat"
          />
          <View style={styles.photo}>
            <Text style={styles.photoText}>
              {t("places:proposer.photo")}{" "}
              <Text style={styles.photoOptional}>{t("places:proposer.photoOptionnel")}</Text>
            </Text>
          </View>
          <Text style={styles.note}>{t("places:proposer.note")}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={t("places:proposer.cta")}
            onPress={() => void submit()}
            busy={busy}
            disabled={name.trim().length < 3 || category === null}
            testID="propose-submit"
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  map: { height: 230 },
  back: {
    position: "absolute",
    left: spacing[4],
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: color.neutral[0],
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  content: {
    flex: 1,
    marginTop: -18,
    backgroundColor: color.neutral[50],
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: "700",
    color: color.brand[900],
    marginBottom: spacing[1],
  },
  sub: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    marginBottom: spacing[4],
    lineHeight: 19,
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
    marginTop: 14,
    marginBottom: spacing[2] - 2,
  },
  photo: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: color.neutral[300],
    borderRadius: borderRadius.md,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: spacing[3],
  },
  photoText: { fontSize: typography.fontSize.sm, color: color.neutral[500] },
  photoOptional: { color: color.neutral[400] },
  note: { fontSize: typography.fontSize.xs + 1, color: color.neutral[500], marginBottom: 14 },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[3],
  },
  successChip: { alignItems: "flex-start", marginBottom: spacing[3], marginTop: spacing[2] },
});
