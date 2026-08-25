// Carte de notification C-22 — médaillon d'icône par famille de type,
// carte non lue soulignée par la bordure de marque, heure à droite.

import type { NotificationRow } from "@teko/types";
import { borderRadius, color, spacing, typography } from "@teko/ui";
import { BellIcon, CalendarIcon, CarIcon, LandmarkPinIcon } from "@teko/ui/native";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  notificationDetail,
  notificationIconKind,
  type NotificationIconKind,
  notificationTitle,
} from "./notification-display";
import { formatTimeFr } from "./ride-display";

const MEDALLIONS: Record<NotificationIconKind, { bg: string; icon: ReactNode }> = {
  ride: {
    bg: color.semantic.success.light,
    icon: <CarIcon size={17} color={color.semantic.success.dark} />,
  },
  fee: {
    bg: color.semantic.warning.light,
    icon: <CarIcon size={17} color={color.semantic.warning.dark} />,
  },
  landmark: {
    bg: color.semantic.warning.light,
    icon: <LandmarkPinIcon size={17} />,
  },
  calendar: {
    bg: color.semantic.info.light,
    icon: <CalendarIcon size={17} color={color.semantic.info.dark} />,
  },
  default: { bg: color.brand[50], icon: <BellIcon size={17} color={color.brand[800]} /> },
};

export interface NotificationItemProps {
  notification: NotificationRow;
  onPress: () => void;
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const { t } = useTranslation();
  const medallion = MEDALLIONS[notificationIconKind(notification.type)];
  const detail = notificationDetail(notification, t);
  const unread = notification.read_at === null;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.item, unread ? styles.unread : null]}
      accessibilityRole="button"
      testID={`notification-${notification.id}`}
    >
      <View style={[styles.medallion, { backgroundColor: medallion.bg }]}>{medallion.icon}</View>
      <View style={styles.body}>
        <Text style={styles.title}>{notificationTitle(notification, t)}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <Text style={styles.when}>{formatTimeFr(new Date(notification.created_at))}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    gap: spacing[3],
    backgroundColor: color.neutral[0],
    borderWidth: 1,
    borderColor: color.neutral[200],
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: spacing[2],
  },
  unread: { borderColor: color.brand[200] },
  medallion: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  title: { fontSize: typography.fontSize.sm + 1, fontWeight: "600", color: color.neutral[700] },
  detail: {
    fontSize: typography.fontSize.xs + 1.5,
    color: color.neutral[500],
    marginTop: 2,
    lineHeight: 18,
  },
  when: { fontSize: typography.fontSize.xs, color: color.neutral[400] },
});
