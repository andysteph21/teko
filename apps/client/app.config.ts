import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = {
    ...config,
    ...(process.env.TEKO_EXPO_OWNER ? { owner: process.env.TEKO_EXPO_OWNER } : {}),
    extra: {
      ...config.extra,
      eas: {
        projectId:
          process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
          (process.env.TEKO_APP_VARIANT === "alpha"
            ? "7fde6ae9-749a-41ae-9df2-699cd40d7ddb"
            : config.extra?.eas?.projectId),
      },
    },
    android: {
      ...config.android,
      ...(process.env.TEKO_GOOGLE_SERVICES_FILE
        ? { googleServicesFile: process.env.TEKO_GOOGLE_SERVICES_FILE }
        : {}),
    },
    plugins: [...(config.plugins ?? []), ["expo-notifications", { defaultChannel: "teko-alerts" }]],
  };
  if (process.env.TEKO_APP_VARIANT !== "alpha") return base as ExpoConfig;
  return {
    ...base,
    owner: process.env.TEKO_EXPO_OWNER ?? "teko241",
    name: "Teko Alpha",
    slug: "teko-client-alpha",
    scheme: "teko-client-alpha",
    android: {
      ...base.android,
      package: "ga.teko.client.alpha",
      allowBackup: false,
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
      ],
    },
    plugins: [...base.plugins, "./plugins/with-alpha-android.cjs"],
  } as ExpoConfig;
};
