// Fabrique du client Supabase typé — unique point d'entrée réseau des apps.
// Le stockage de session est fourni par l'app hôte (SecureStore sur mobile,
// cookies/localStorage sur l'admin) ; aucune valeur par défaut ici.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@teko/types";

export type TekoClient = SupabaseClient<Database>;

/** Contrat minimal de stockage de session (AsyncStorage-compatible). */
export interface SessionStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface CreateTekoClientOptions {
  url: string;
  anonKey: string;
  storage?: SessionStorage;
  /** true seulement sur le web (liens magiques) — false sur mobile. */
  detectSessionInUrl?: boolean;
}

export function createTekoClient(options: CreateTekoClientOptions): TekoClient {
  return createClient<Database>(options.url, options.anonKey, {
    auth: {
      storage: options.storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: options.detectSessionInUrl ?? false,
    },
  });
}
