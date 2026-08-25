// Champs prénom / nom de l'identité chauffeur (D-04).

import { spacing } from "@teko/ui";
import { TextField } from "@teko/ui/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

export interface NameFieldsProps {
  firstName: string;
  lastName: string;
  onFirstName: (value: string) => void;
  onLastName: (value: string) => void;
}

export function NameFields({ firstName, lastName, onFirstName, onLastName }: NameFieldsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.fields}>
      <TextField
        label={t("kyc:identite.prenom")}
        value={firstName}
        onChangeText={onFirstName}
        autoComplete="given-name"
        testID="identity-first-name"
      />
      <TextField
        label={t("kyc:identite.nom")}
        value={lastName}
        onChangeText={onLastName}
        autoComplete="family-name"
        testID="identity-last-name"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing[3] },
});
