// Ajout / remplacement d'une pièce du dossier (D-05, D-08b) : galerie via
// expo-image-picker (qualité 0,6), lecture en ArrayBuffer, téléversement
// dans le bucket privé `kyc` puis rafraîchissement de la liste.

import { useQueryClient } from "@tanstack/react-query";
import { TekoApiError, uploadKycDocument } from "@teko/api-client";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import type { KycDocType } from "./documents-meta";

export const KYC_DOCUMENTS_QUERY_KEY = ["kyc-documents"] as const;

export interface DocumentUpload {
  /** Ouvre la galerie puis téléverse la pièce du type demandé. */
  upload: (type: KycDocType) => Promise<void>;
  uploadingType: KycDocType | null;
  error: string | null;
}

async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.6,
  });
  if (result.canceled) return null;
  return result.assets[0] ?? null;
}

export function useDocumentUpload(userId: string | undefined): DocumentUpload {
  const [uploadingType, setUploadingType] = useState<KycDocType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const upload = async (type: KycDocType) => {
    if (!userId || uploadingType) return;
    setError(null);
    const asset = await pickImage();
    if (!asset) return;
    setUploadingType(type);
    try {
      const response = await fetch(asset.uri);
      const data = await response.arrayBuffer();
      await uploadKycDocument(supabase, {
        userId,
        type,
        data,
        contentType: asset.mimeType ?? "image/jpeg",
      });
      await queryClient.invalidateQueries({ queryKey: KYC_DOCUMENTS_QUERY_KEY });
    } catch (e) {
      setError(
        e instanceof TekoApiError && e.code === "network"
          ? t("erreurs.reseau")
          : t("kyc:documents.erreurEnvoi"),
      );
    } finally {
      setUploadingType(null);
    }
  };

  return { upload, uploadingType, error };
}
