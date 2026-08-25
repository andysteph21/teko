"use client";

// Route /settings — écrans A-07 (paramètres), A-08 (équipe), A-09 (rôles)
// et A-10 (journal) en onglets persistés par querystring (?tab=).

import { SettingsPage } from "../../../src/features/settings/settings-page";

export default function Settings() {
  return <SettingsPage />;
}
