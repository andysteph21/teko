import { color } from "@teko/ui";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.neutral[50] },
      }}
    />
  );
}
