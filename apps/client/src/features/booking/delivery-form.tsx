// Formulaire de livraison (R5) : véhicule (voiture ou moto, prix ferme
// serveur), description et taille du colis, destinataire. Le code de remise
// est remis à l'expéditeur après la commande, sur l'écran de suivi.

import { formatXaf } from "@teko/core";
import { color, spacing, typography } from "@teko/ui";
import { TextField } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { ChoiceChips } from "../places/choice-chips";
import {
  DESCRIPTION_MAX,
  isRecipientPhoneValid,
  PARCEL_SIZES,
  type ParcelDraft,
  RECIPIENT_NAME_MAX,
} from "./parcel";
import { DELIVERY_VEHICLES, type DeliveryController } from "./use-delivery";

const SIZE_KEYS = { small: "petite", medium: "moyenne", large: "grande" } as const;
const VEHICLE_KEYS = { eco: "voiture", moto: "moto" } as const;

export function TripSummary({ delivery }: { delivery: DeliveryController }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card} testID="delivery-trip">
      <Text style={styles.line} numberOfLines={1}>
        <Text style={styles.eyebrow}>{`${t("booking:livraison.de")}  `}</Text>
        {delivery.origin?.label}
      </Text>
      <Text style={styles.line} numberOfLines={1}>
        <Text style={styles.eyebrow}>{`${t("booking:livraison.vers")}  `}</Text>
        {delivery.destination?.label}
      </Text>
    </View>
  );
}

export function VehicleChoice({ delivery }: { delivery: DeliveryController }) {
  const { t } = useTranslation();
  const quotes = delivery.quotes.data ?? {};
  const options = DELIVERY_VEHICLES.filter((vehicle) => quotes[vehicle]).map((vehicle) => ({
    value: vehicle,
    label: `${t(`booking:livraison.${VEHICLE_KEYS[vehicle]}`)} · ${formatXaf(
      Number(quotes[vehicle]?.price),
      "FCFA",
    )}`,
  }));
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{t("booking:livraison.vehicule")}</Text>
      <ChoiceChips
        options={options}
        selected={delivery.vehicle}
        onSelect={delivery.setVehicle}
        testIDPrefix="delivery-vehicle"
      />
    </View>
  );
}

export interface ParcelFormProps {
  value: ParcelDraft;
  onChange: (value: ParcelDraft) => void;
}

export function ParcelForm({ value, onChange }: ParcelFormProps) {
  const { t } = useTranslation();
  const phoneError =
    value.recipientPhone !== "" && !isRecipientPhoneValid(value.recipientPhone)
      ? t("booking:livraison.telephoneErreur")
      : null;
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{t("booking:livraison.colis")}</Text>
      <TextField
        label={t("booking:livraison.description")}
        helper={t("booking:livraison.descriptionAide")}
        value={value.description}
        onChangeText={(description) => onChange({ ...value, description })}
        maxLength={DESCRIPTION_MAX}
        testID="parcel-description"
      />
      <Text style={styles.sub}>{t("booking:livraison.taille")}</Text>
      <ChoiceChips
        options={PARCEL_SIZES.map((size) => ({
          value: size,
          label: t(`booking:livraison.${SIZE_KEYS[size]}`),
        }))}
        selected={value.size}
        onSelect={(size) => onChange({ ...value, size })}
        testIDPrefix="parcel-size"
      />
      <TextField
        label={t("booking:livraison.destinataire")}
        value={value.recipientName}
        onChangeText={(recipientName) => onChange({ ...value, recipientName })}
        maxLength={RECIPIENT_NAME_MAX}
        testID="parcel-recipient-name"
      />
      <TextField
        label={t("booking:livraison.telephone")}
        value={value.recipientPhone}
        onChangeText={(recipientPhone) => onChange({ ...value, recipientPhone })}
        keyboardType="phone-pad"
        maxLength={20}
        error={phoneError}
        testID="parcel-recipient-phone"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.neutral[0],
    borderRadius: 12,
    padding: spacing[4],
    gap: spacing[1],
  },
  group: { gap: spacing[2] },
  eyebrow: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: color.neutral[500],
  },
  line: { fontSize: typography.fontSize.base, color: color.neutral[700] },
  label: { fontSize: typography.fontSize.md, fontWeight: "700", color: color.brand[900] },
  sub: { fontSize: typography.fontSize.sm, fontWeight: "600", color: color.neutral[700] },
});
