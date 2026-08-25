// Client Supabase de l'app — instance unique, session dans SecureStore
// (chiffrée par le Keystore Android ; MVP Android-only, pas de limite 2 Ko iOS).
// En dev : la stack locale via adb reverse (127.0.0.1:54321) et la clé anon
// de démo publique de la CLI Supabase (aucun secret — cf. 06-demarrage §4).

import { createTekoClient, type TekoClient } from "@teko/api-client";
import * as SecureStore from "expo-secure-store";

const LOCAL_DEMO_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const supabase: TekoClient = createTekoClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? LOCAL_DEMO_ANON_KEY,
  storage: {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  },
});
