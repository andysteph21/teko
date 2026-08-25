// Morceaux de l'écran C-24 : avatar (pastille photo à venir) et carte
// « Changer de numéro » (double OTP du parcours E — stub en attendant).

import { borderRadius, color, spacing, typography } from "@teko/ui";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { formatGabonPhone } from "./format-phone";
import { CameraIcon, PhoneDeviceIcon } from "./icons";

export function EditAvatar({ initial }: { initial: string }) {
  return (
    <View style={styles.avatarZone}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial || "•"}</Text>
        <LinearGradient
          colors={[color.brand[800], color.brand[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cam}
        >
          <CameraIcon size={13} color={color.neutral[0]} />
        </LinearGradient>
      </View>
    </View>
  );
}

export function ChangeNumberCard({ phone }: { phone: string | null | undefined }) {
  const { t } = useTranslation();
  // TODO(parcours E) : double OTP ancien → nouveau numéro, stub en attendant.
  const changeNumber = () =>
    Alert.alert(t("account:modifierProfil.bientotTitre"), t("account:modifierProfil.bientotTexte"));

  return (
    <Pressable
      style={styles.numRow}
      onPress={changeNumber}
      accessibilityRole="button"
      testID="edit-change-number"
    >
      <View style={styles.numIcon}>
        <PhoneDeviceIcon />
      </View>
      <View style={styles.numBody}>
        <Text style={styles.numTitle}>{t("account:modifierProfil.changerNumero")}</Text>
        <Text style={styles.numText}>
          {t("account:modifierProfil.changerNumeroTexte", { phone: formatGabonPhone(phone) })}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarZone: { alignItems: "center", marginBottom: 22 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: color.brand[800], fontWeight: "700", fontSize: 30 },
  cam: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderColor: color.neutral[50],
    alignItems: "center",
    justifyContent: "center",
  },
  numRow: {
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  numIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: color.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  numBody: { flex: 1 },
  numTitle: { fontSize: typography.fontSize.base, fontWeight: "600", color: color.neutral[700] },
  numText: {
    fontSize: typography.fontSize.xs,
    color: color.neutral[500],
    marginTop: 1,
    lineHeight: 16,
  },
  chevron: { fontSize: typography.fontSize.md, color: color.neutral[300] },
});
