import type { TekoApiError } from "@teko/api-client";
import { color, spacing, typography } from "@teko/ui";
import { Button } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { OfflineScreen } from "../../components/offline-screen";

const tripErrors: Partial<Record<TekoApiError["code"], [string, string]>> = {
  quote_points_too_close: [
    "Départ et arrivée trop proches",
    "Choisis deux points distincts pour calculer le tarif.",
  ],
  quote_route_not_found: [
    "Itinéraire introuvable",
    "Choisis un autre point de départ ou d’arrivée.",
  ],
  quote_outside_service_area: [
    "Départ hors de la zone desservie",
    "Choisis un point de départ dans la zone couverte à Libreville.",
  ],
};

export function QuoteErrorScreen({
  error,
  onRetry,
  onEdit,
}: {
  error: Error;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const code = (error as TekoApiError).code;
  if (code === "network") return <OfflineScreen onRetry={onRetry} />;
  const [title, description] = tripErrors[code] ?? [
    t("booking:tarifsIndisponibles.titre"),
    t("booking:tarifsIndisponibles.texte"),
  ];
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{description}</Text>
      {!tripErrors[code] && (
        <Button label={t("commun.reessayer")} onPress={onRetry} testID="quote-retry" />
      )}
      <Button
        label="Modifier le trajet"
        variant={tripErrors[code] ? "primary" : "secondary"}
        onPress={onEdit}
        testID="quote-edit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.neutral[50],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
  },
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
    marginBottom: spacing[6],
  },
});
