import { formatXaf } from "@teko/core";
import { color, spacing } from "@teko/ui";
import { Button, PanelTitle } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import type { RequestConfirmation } from "./use-request-ride";

export function PickupPriceConfirmation(props: {
  value: RequestConfirmation;
  previousPrice: number;
  busy: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: spacing[3] }}>
      <PanelTitle>{t("booking:rencontre.nouveauDevis")}</PanelTitle>
      <Text>{props.value.meeting?.name ?? t("places:recherche.maPosition")}</Text>
      <Text>{t("booking:rencontre.prixPrecedent", { prix: formatXaf(props.previousPrice) })}</Text>
      <Text testID="pickup-new-price">
        {t("booking:rencontre.prixConfirme", { prix: formatXaf(Number(props.value.quote.price)) })}
      </Text>
      <Text>{t("booking:rencontre.reconfirmation")}</Text>
      {props.errorMessage ? (
        <Text style={{ color: color.semantic.error.default }}>{props.errorMessage}</Text>
      ) : null}
      <Button
        label={t("booking:rencontre.confirmerPrix")}
        onPress={props.onConfirm}
        busy={props.busy}
        testID="pickup-price-confirm"
      />
      <Button
        label={t("booking:rencontre.revenirDepart")}
        onPress={props.onCancel}
        disabled={props.busy}
        variant="secondary"
        testID="pickup-price-cancel"
      />
    </View>
  );
}
