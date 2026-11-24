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
            ? "8b5b38e9-2c0c-4916-89d7-daf2d8afb54e"
            : config.extra?.eas?.projectId),
      },
    },
    android: {
      ...config.android,
      ...(process.env.TEKO_GOOGLE_SERVICES_FILE
        ? { googleServicesFile: process.env.TEKO_GOOGLE_SERVICES_FILE }
        : {}),
    },
    plugins: [
      ...(config.plugins ?? []),
      [
        "expo-notifications",
        { defaultChannel: "teko-alerts", sounds: ["./assets/sounds/teko_offre.wav"] },
      ],
      // Photo de remise d'une livraison (lot R5) : caméra seule, sans micro.
      [
        "expo-image-picker",
        {
          cameraPermission: "Teko utilise l’appareil photo pour la photo de remise d’un colis.",
          microphonePermission: false,
        },
      ],
    ],
  };
  if (process.env.TEKO_APP_VARIANT !== "alpha") return base as ExpoConfig;
  return {
    ...base,
    owner: process.env.TEKO_EXPO_OWNER ?? "teko241",
    name: "Teko Chauffeur Alpha",
    slug: "teko-driver-alpha",
    scheme: "teko-driver-alpha",
    android: {
      ...base.android,
      package: "ga.teko.driver.alpha",
      allowBackup: false,
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
      ],
    },
    plugins: [
      ...base.plugins,
      [
        "expo-location",
        { isAndroidForegroundServiceEnabled: true, isAndroidBackgroundLocationEnabled: false },
      ],
      "./plugins/with-alpha-android.cjs",
    ],
  } as ExpoConfig;
};
