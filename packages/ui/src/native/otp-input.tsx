// Saisie OTP 6 chiffres (C-04, D-03) : cases 44×52, mono 24/700, case active
// blanche à bordure magenta. Un TextInput invisible porte la saisie (clavier
// numérique, collage du code SMS entier possible).

import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { borderRadius, color, typography } from "../tokens";

export interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  /** Accent des cases actives (teal côté chauffeur). */
  accentColor?: string;
  testID?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  accentColor = color.brand[500],
  testID,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.slice(0, length).split("");
  const activeIndex = Math.min(digits.length, length - 1);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} testID={testID}>
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => {
          const active = focused && i === activeIndex;
          return (
            <View
              key={`otp-${String(i)}`}
              style={[
                styles.box,
                active && { backgroundColor: color.neutral[0], borderColor: accentColor },
              ]}
            >
              <Text style={styles.digit}>{digits[i] ?? ""}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        style={styles.hidden}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={testID ? `${testID}-input` : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, justifyContent: "center" },
  box: {
    width: 44,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: color.neutral[100],
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  digit: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.fontSize.xl,
    fontWeight: "700",
    color: color.neutral[700],
  },
  hidden: { position: "absolute", opacity: 0, height: 1, width: 1 },
});
