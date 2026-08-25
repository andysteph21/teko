// Champs de saisie (maquette components/champs.html) : hauteur 48, rayon 12,
// fond neutral-100 au repos, blanc + bordure magenta au focus. L'erreur
// garde le contenu et explique la correction (jamais un simple rouge).

import { type ReactNode, useState } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { borderRadius, color, spacing, typography } from "../tokens";

export interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label?: string;
  helper?: string;
  error?: string | null;
  /** Préfixe fixe (ex. « +241 ») séparé par un filet. */
  prefix?: string;
  icon?: ReactNode;
  testID?: string;
}

export function TextField({
  label,
  helper,
  error,
  prefix,
  icon,
  testID,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, focused && styles.boxFocus, Boolean(error) && styles.boxError]}>
        {icon}
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          {...inputProps}
          testID={testID}
          style={styles.input}
          placeholderTextColor={color.neutral[400]}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
      </View>
      {error ? (
        <Text style={[styles.helper, styles.helperError]}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: "600",
    color: color.neutral[700],
  },
  box: {
    height: spacing[12],
    borderRadius: borderRadius.md,
    backgroundColor: color.neutral[100],
    borderWidth: 1.5,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: spacing[2],
  },
  boxFocus: { backgroundColor: color.neutral[0], borderColor: color.brand[500] },
  boxError: {
    backgroundColor: color.semantic.error.light,
    borderColor: color.semantic.error.default,
  },
  prefix: {
    fontWeight: "600",
    color: color.neutral[700],
    fontSize: typography.fontSize.md,
    borderRightWidth: 1,
    borderRightColor: color.neutral[300],
    paddingRight: 10,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: color.neutral[700],
    paddingVertical: 0,
  },
  helper: { fontSize: typography.fontSize.xs, color: color.neutral[500] },
  helperError: { color: color.semantic.error.default },
});
