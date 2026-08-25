// C-22 Notifications — liste groupée par jour, cartes non lues bordées de
// marque ; tap = pointage lu + navigation contextuelle vers la course.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead } from "@teko/api-client";
import type { NotificationRow } from "@teko/types";
import { color, spacing, typography } from "@teko/ui";
import { type Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  groupNotifications,
  type NotificationSection,
  notificationPayload,
} from "../../src/features/history/notification-display";
import { NotificationItem } from "../../src/features/history/notification-item";
import { dayLabelText } from "../../src/features/history/ride-display";
import { ScreenHeader } from "../../src/features/history/screen-header";
import { supabase } from "../../src/lib/supabase";

function SectionList({
  sections,
  onOpen,
}: {
  sections: NotificationSection[];
  onOpen: (n: NotificationRow) => void;
}) {
  const { t } = useTranslation();
  return (
    <View>
      {sections.map((section) => (
        <View key={section.key}>
          <Text style={styles.section}>{dayLabelText(section.label, t)}</Text>
          {section.items.map((n) => (
            <NotificationItem key={n.id} notification={n} onPress={() => onOpen(n)} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function Notifications() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [now] = useState(() => new Date());
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(supabase),
  });
  const sections = useMemo(() => groupNotifications(query.data ?? [], now), [query.data, now]);

  const open = (n: NotificationRow) => {
    if (n.read_at === null) {
      void markNotificationRead(supabase, n.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }))
        .catch(() => undefined);
    }
    const { rideId } = notificationPayload(n);
    if (rideId) router.push(`/(main)/ride/${rideId}` as Href);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScreenHeader title={t("history:notifs.titre")} />
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {query.isPending ? (
          <ActivityIndicator style={styles.state} color={color.brand[500]} />
        ) : query.isError ? (
          <Text style={styles.stateText}>{t("erreurs.generique")}</Text>
        ) : sections.length === 0 ? (
          <Text style={styles.stateText}>{t("history:notifs.vide")}</Text>
        ) : (
          <SectionList sections={sections} onOpen={open} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.neutral[50] },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[6] },
  section: {
    fontSize: typography.fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing.wider,
    color: color.neutral[500],
    marginTop: 14,
    marginBottom: 6,
  },
  state: { marginTop: spacing[10] },
  stateText: {
    marginTop: spacing[10],
    textAlign: "center",
    fontSize: typography.fontSize.sm,
    color: color.neutral[500],
  },
});
