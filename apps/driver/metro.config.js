// Config Metro par défaut d'Expo — détecte le monorepo pnpm (racine hoistée).
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.maxWorkers = 2;
module.exports = config;
