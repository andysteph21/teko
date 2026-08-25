// Fabrique d'instance i18next partagée par les 3 portails. Français seul au
// MVP ; ajouter une langue = ajouter un module de ressources, zéro refonte.

import { createInstance, type i18n, type Module, type NewableModule } from "i18next";
import { fr } from "./fr.js";

export { type FrResources, fr } from "./fr.js";

export interface CreateTekoI18nOptions {
  /** Plugins de l'app hôte (ex. initReactI18next de react-i18next). */
  plugins?: (Module | NewableModule<Module>)[];
  /** Langue initiale (défaut « fr » — seule langue livrée au MVP). */
  lng?: string;
}

/** Instance initialisée, prête pour `t()` — à créer au démarrage de l'app. */
export async function createTekoI18n(options: CreateTekoI18nOptions = {}): Promise<i18n> {
  const instance = createInstance();
  for (const plugin of options.plugins ?? []) {
    instance.use(plugin);
  }
  await instance.init({
    lng: options.lng ?? "fr",
    fallbackLng: "fr",
    resources: { fr: { translation: fr } },
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}
