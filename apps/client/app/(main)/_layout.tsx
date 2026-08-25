import { color } from "@teko/ui";
import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.neutral[50] },
      }}
    />
  );
}
