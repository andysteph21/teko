module.exports = {
  preset: "jest-expo",
  // setupFilesAfterEnv : ne remplace pas les setupFiles du préréglage jest-expo.
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-modules-core|react-navigation|@react-navigation/.*|@supabase/.*|@teko/.*|i18next|react-i18next))",
  ],
};
