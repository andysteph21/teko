// Initialisation i18n de l'app (react-i18next branché sur @teko/i18n).
// Créée une fois au chargement du module racine.

import { createTekoI18n } from "@teko/i18n";
import { initReactI18next } from "react-i18next";

export const i18nReady = createTekoI18n({ plugins: [initReactI18next] });
