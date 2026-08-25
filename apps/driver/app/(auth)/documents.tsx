// D-05 Inscription 2/4 — Documents : les 6 pièces du dossier (permis, CNI,
// carte grise, assurance, photo du véhicule, casier judiciaire). Ajout par
// pièce via la galerie ; Continuer plein quand les 6 sont ajoutées, sinon
// « Continuer quand même » en ghost (l'examen se poursuit depuis D-08).

import { useQuery } from "@tanstack/react-query";
import { listMyDocuments } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { type Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../src/features/auth/use-session";
import { DocumentRow } from "../../src/features/kyc/document-row";
import { KYC_DOC_TYPES, latestByType } from "../../src/features/kyc/documents-meta";
import { StepBar } from "../../src/features/kyc/step-bar";
import {
  KYC_DOCUMENTS_QUERY_KEY,
  useDocumentUpload,
} from "../../src/features/kyc/use-document-upload";
import { supabase } from "../../src/lib/supabase";

export default function Documents() {
  const { session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const documents = useQuery({
    queryKey: KYC_DOCUMENTS_QUERY_KEY,
    queryFn: () => listMyDocuments(supabase),
    enabled: Boolean(session),
  });
  const { upload, uploadingType, error } = useDocumentUpload(session?.user.id);

  const byType = latestByType(documents.data ?? []);
  const missing = KYC_DOC_TYPES.filter((meta) => !byType[meta.type]).length;
  const goNext = () => router.push("/(auth)/vehicle" as Href);

  return (
    <SafeAreaView style={styles.screen}>
      <StepBar
        step={2}
        title={t("kyc:documents.titre")}
        onBack={() => router.back()}
        testID="documents-steps"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sub}>{t("kyc:documents.sub")}</Text>
        {documents.isError ? (
          <>
            <Text style={styles.error} testID="documents-load-error">
              {t("kyc:documents.erreurListe")}
            </Text>
            <Button
              label={t("commun.reessayer")}
              variant="ghost"
              onPress={() => void documents.refetch()}
              testID="documents-retry"
            />
          </>
        ) : (
          KYC_DOC_TYPES.map((meta) => (
            <DocumentRow
              key={meta.type}
              meta={meta}
              doc={byType[meta.type]}
              uploading={uploadingType === meta.type}
              onAdd={() => void upload(meta.type)}
            />
          ))
        )}
        {error ? (
          <Text style={styles.error} testID="documents-upload-error">
            {error}
          </Text>
        ) : null}
        <Text style={styles.note}>{t("kyc:documents.note")}</Text>
        <Button
          label={
            missing === 0
              ? t("commun.continuer")
              : t("kyc:documents.ctaRestants", { count: missing })
          }
          onPress={goNext}
          accent="driver"
          disabled={missing > 0}
          testID="documents-continue"
        />
        {missing > 0 ? (
          <Button
            label={t("kyc:documents.continuerQuandMeme")}
            variant="ghost"
            onPress={goNext}
            testID="documents-continue-anyway"
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    backgroundColor: color.neutral[50],
  },
  content: { paddingTop: spacing[4], paddingBottom: spacing[8] },
  sub: {
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
    marginBottom: spacing[4],
    paddingHorizontal: spacing[1],
  },
  note: {
    fontSize: typography.fontSize.xs,
    lineHeight: 19,
    color: color.neutral[500],
    backgroundColor: color.neutral[100],
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  error: {
    color: color.semantic.error.default,
    fontSize: typography.fontSize.sm,
    marginVertical: spacing[2],
  },
});
