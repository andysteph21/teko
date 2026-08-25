// Sections du profil D-18 : en-tête teal (avatar initiales, nom, note ★),
// groupe Documents (statut par pièce) et groupe Versements (numéro masqué).

import type { DriverRow, TableRow } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { StatusChip, type StatusChipTone } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { categoriesLabel, initials, maskMsisdn, memberSince, ratingText } from "./format";
import { Group, Row, SectionLabel } from "./rows";

const DOC_LABEL_KEYS: Record<TableRow<"driver_documents">["type"], string> = {
  id_card: "account:profil.docIdCard",
  license: "account:profil.docLicense",
  registration: "account:profil.docRegistration",
  insurance: "account:profil.docInsurance",
  vehicle_photo: "account:profil.docVehiclePhoto",
  criminal_record: "account:profil.docCriminalRecord",
  profile_photo: "account:profil.docProfilePhoto",
};

const DOC_CHIPS: Record<
  TableRow<"driver_documents">["status"],
  { tone: StatusChipTone; labelKey: string }
> = {
  validated: { tone: "ok", labelKey: "account:profil.statutValidee" },
  pending: { tone: "pending", labelKey: "account:profil.statutEnCours" },
  rejected: { tone: "cancel", labelKey: "account:profil.statutRefusee" },
};

export interface ProfileHeaderProps {
  fullName: string;
  driver: DriverRow | null;
}

export function ProfileHeader({ fullName, driver }: ProfileHeaderProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing[5] }]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(fullName)}</Text>
      </View>
      <View style={styles.headerBody}>
        <Text style={styles.name} numberOfLines={1}>
          {fullName || "…"}
        </Text>
        {driver ? (
          <Text style={styles.since} numberOfLines={1}>
            {t("account:profil.sousTitre", {
              categories: categoriesLabel(driver.categories, t),
              quand: memberSince(driver.created_at),
            })}
          </Text>
        ) : null}
      </View>
      {driver ? (
        <Text style={styles.rating} testID="profile-rating">
          ★ {ratingText(driver.rating_avg)}
        </Text>
      ) : null}
    </View>
  );
}

// TODO backend : badge « Expire bientôt » (D-18/parcours J) impossible —
// driver_documents ne porte aucune date d'expiration. À exposer en base
// (expires_at par pièce) puis alerter à J-30 comme sur D-09.
export function DocumentsSection({ documents }: { documents: TableRow<"driver_documents">[] }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionLabel>{t("account:profil.secDocuments")}</SectionLabel>
      <Group>
        {documents.length === 0 ? (
          <Row title={t("account:profil.documentsVide")} right={<View />} />
        ) : (
          documents.map((doc) => {
            const chip = DOC_CHIPS[doc.status];
            return (
              <Row
                key={doc.id}
                title={t(DOC_LABEL_KEYS[doc.type])}
                subtitle={
                  doc.status === "rejected" && doc.note
                    ? t("account:profil.motif", { motif: doc.note })
                    : undefined
                }
                right={<StatusChip label={t(chip.labelKey)} tone={chip.tone} />}
                testID={`doc-${doc.type}`}
              />
            );
          })
        )}
      </Group>
    </>
  );
}

export interface PayoutSectionProps {
  payoutMsisdn: string | null;
  onChangeNumber: () => void;
}

export function PayoutSection({ payoutMsisdn, onChangeNumber }: PayoutSectionProps) {
  const { t } = useTranslation();
  return (
    <>
      <SectionLabel>{t("account:profil.secVersements")}</SectionLabel>
      <Group>
        <Row
          title={t("account:profil.airtel")}
          subtitle={
            payoutMsisdn
              ? t("account:profil.numeroVerifie", { numero: maskMsisdn(payoutMsisdn) })
              : t("account:profil.numeroManquant")
          }
          right={<StatusChip label={t("account:profil.actif")} tone="ok" />}
          testID="payout-number"
        />
        <Row
          title={t("account:profil.changerNumero")}
          onPress={onChangeNumber}
          testID="payout-change"
        />
      </Group>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: color.role.driver.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: spacing[5],
    paddingBottom: 22,
  },
  headerBody: { flex: 1 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: color.neutral[0], fontWeight: "700", fontSize: 22 },
  name: { fontSize: typography.fontSize.lg, fontWeight: "700", color: color.neutral[0] },
  since: { fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  rating: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    color: color.neutral[0],
    fontVariant: ["tabular-nums"],
  },
});
