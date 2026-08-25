// D-08 Vérification en cours / D-08b Pièce refusée — statut par pièce
// (documents + numéro Airtel Money), examen sous 48 h, actualisation par
// tirer-pour-rafraîchir. Pièce refusée : motif admin VERBATIM + remplacement
// ciblé. Dossier validé → « Passer en ligne » vers l'accueil.

import { useQuery } from "@tanstack/react-query";
import { getMyDriver, listMyDocuments } from "@teko/api-client";
import type { TableRow } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../src/features/auth/use-session";
import { KYC_DOC_TYPES, latestByType } from "../../src/features/kyc/documents-meta";
import { RejectedDocIcon, ShieldIcon } from "../../src/features/kyc/icons";
import { RejectedDocCard } from "../../src/features/kyc/rejected-card";
import {
  KYC_DOCUMENTS_QUERY_KEY,
  useDocumentUpload,
} from "../../src/features/kyc/use-document-upload";
import {
  docStatusLine,
  type StatusLineInfo,
  StatusLines,
} from "../../src/features/kyc/verification-status";
import { supabase } from "../../src/lib/supabase";

type Translate = (key: string) => string;

function airtelLine(driver: TableRow<"drivers"> | null | undefined, t: Translate): StatusLineInfo {
  const label = t("kyc:verification.ligneAirtel");
  if (!driver?.payout_msisdn)
    return { key: "airtel", label, tone: "todo", stateLabel: t("kyc:statut.aFournir") };
  if (driver.kyc_status === "validated")
    return { key: "airtel", label, tone: "ok", stateLabel: t("kyc:statut.verifie") };
  return { key: "airtel", label, tone: "wait", stateLabel: t("kyc:statut.enCours") };
}

function HeaderArt({ rejected }: { rejected: boolean }) {
  return (
    <View style={[styles.art, rejected && styles.artRejected]}>
      {rejected ? (
        <RejectedDocIcon />
      ) : (
        <ShieldIcon size={48} color={color.role.driver.accent} strokeWidth={1.8} />
      )}
    </View>
  );
}

/** Suffixe de clé selon l'état du dossier (valide / refuse / en cours). */
function variantKey(validated: boolean, hasRejected: boolean): "valide" | "refuse" | "cours" {
  if (validated) return "valide";
  return hasRejected ? "refuse" : "cours";
}

const TITLE_KEYS = {
  valide: "kyc:verification.valideTitre",
  refuse: "kyc:verification.refuseTitre",
  cours: "kyc:verification.titre",
} as const;

const TEXT_KEYS = {
  valide: "kyc:verification.valideTexte",
  refuse: "kyc:verification.refuseTexte",
  cours: "kyc:verification.texte",
} as const;

interface FooterProps {
  validated: boolean;
  hasRejected: boolean;
  onRefresh: () => void;
  onGoOnline: () => void;
}

/** Pied d'écran : « Passer en ligne » quand le dossier est validé, sinon
 *  rappel 48 h + actualisation manuelle. */
function Footer({ validated, hasRejected, onRefresh, onGoOnline }: FooterProps) {
  const { t } = useTranslation();
  if (validated) {
    return (
      <View style={styles.cta}>
        <Button
          label={t("kyc:verification.passerEnLigne")}
          onPress={onGoOnline}
          accent="driver"
          testID="go-online"
        />
      </View>
    );
  }
  return (
    <>
      <Text style={styles.tip}>
        {t(hasRejected ? "kyc:verification.refuseNote" : "kyc:verification.tip")}
      </Text>
      <Button
        label={t("kyc:verification.actualiser")}
        variant="ghost"
        onPress={onRefresh}
        testID="verification-refresh"
      />
    </>
  );
}

export default function Verification() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const driver = useQuery({
    queryKey: ["my-driver", userId],
    queryFn: () => getMyDriver(supabase, userId as string),
    enabled: Boolean(userId),
  });
  const documents = useQuery({
    queryKey: KYC_DOCUMENTS_QUERY_KEY,
    queryFn: () => listMyDocuments(supabase),
    enabled: Boolean(userId),
  });
  const { upload, uploadingType, error } = useDocumentUpload(userId);

  const byType = latestByType(documents.data ?? []);
  const rejectedMetas = KYC_DOC_TYPES.filter((m) => byType[m.type]?.status === "rejected");
  const validated = driver.data?.kyc_status === "validated";
  const hasRejected = !validated && rejectedMetas.length > 0;
  const lines = [
    ...KYC_DOC_TYPES.map((m) => docStatusLine(m, byType[m.type], t)),
    airtelLine(driver.data, t),
  ];

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([driver.refetch(), documents.refetch()]);
    setRefreshing(false);
  };

  const variant = variantKey(validated, hasRejected);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            colors={[color.role.driver.accent]}
            tintColor={color.role.driver.accent}
          />
        }
      >
        <HeaderArt rejected={hasRejected} />
        <Text style={styles.title} testID="verification-title">
          {t(TITLE_KEYS[variant])}
        </Text>
        <Text style={styles.text}>{t(TEXT_KEYS[variant])}</Text>
        {rejectedMetas.map((meta) => {
          const doc = byType[meta.type];
          return doc ? (
            <RejectedDocCard
              key={meta.type}
              meta={meta}
              doc={doc}
              replacing={uploadingType === meta.type}
              onReplace={() => void upload(meta.type)}
            />
          ) : null;
        })}
        {error ? (
          <Text style={styles.error} testID="verification-upload-error">
            {error}
          </Text>
        ) : null}
        <StatusLines lines={lines} />
        <Footer
          validated={validated}
          hasRejected={hasRejected}
          onRefresh={() => void refresh()}
          onGoOnline={() => router.replace("/(main)/home" as Href)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[8],
  },
  art: {
    width: 110,
    height: 110,
    borderRadius: 9999,
    backgroundColor: color.role.driver.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[5],
  },
  artRejected: { backgroundColor: color.semantic.error.light, width: 96, height: 96 },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.brand[900],
    textAlign: "center",
    marginBottom: spacing[2],
  },
  text: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
    color: color.neutral[500],
    textAlign: "center",
    maxWidth: 300,
    marginBottom: spacing[5],
  },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[3],
  },
  tip: {
    fontSize: typography.fontSize.xs,
    lineHeight: 19,
    color: color.neutral[500],
    textAlign: "center",
    marginTop: spacing[5],
  },
  cta: { width: "100%", marginTop: spacing[6] },
});
