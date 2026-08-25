// Client Supabase navigateur de la console — session en localStorage (défaut
// supabase-js sur le web). L'auth SSR par cookies arrive avec le lot 5.
// En dev : stack locale + clé anon de démo publique de la CLI (aucun secret).

import { createTekoClient, type TekoClient } from "@teko/api-client";

const LOCAL_DEMO_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const supabase: TekoClient = createTekoClient({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? LOCAL_DEMO_ANON_KEY,
});
