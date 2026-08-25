// C-26 Proposer un repère — carte (position = destination du brouillon si
// présente, sinon centre par défaut : « position actuelle de la carte »),
// formulaire nom + catégorie, envoi via propose_landmark (RPC), puis état
// « En validation » avant retour.
//
// TODO(proposer-photo) : téléversement de la photo (bucket Storage + champ
// p_photo de la RPC) — hors périmètre de ce lot, la boîte reste inerte.

import { mapApiError, TekoApiError } from "@teko/api-client";
import { TekoMapData } from "@teko/maps";
import { borderRadius, color, spacing } from "@teko/ui";
import { BackIcon } from "@teko/ui/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_CENTER, TILES_URL } from "../../src/config";
import { useBookingStore } from "../../src/features/booking/store";
import { TekoMapView } from "../../src/features/map/native-map";
import type { LandmarkCategory } from "../../src/features/places/categories";
import { DestinationPin } from "../../src/features/places/destination-pin";
import { ProposeForm } from "../../src/features/places/propose-form";
import { ProposeSuccess } from "../../src/features/places/propose-success";
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[6] }}
        keyboardShouldPersistTaps="handled"
      >
        {sent ? (
          <ProposeSuccess onClose={() => router.back()} />
        ) : (
          <ProposeForm
            name={name}
            onChangeName={(v) => {
              setName(v);
              setError(null);
            }}
            category={category}
            onSelectCategory={setCategory}
            busy={busy}
            error={error}
            onSubmit={() => void submit()}
          />
        )}
      </ScrollView>
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
});
