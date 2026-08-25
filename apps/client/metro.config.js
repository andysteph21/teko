// Config Metro par défaut d'Expo — détecte le monorepo pnpm (racine hoistée).
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
