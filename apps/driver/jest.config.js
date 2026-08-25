module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-modules-core|react-navigation|@react-navigation/.*|@supabase/.*|@teko/.*|i18next|react-i18next))",
  ],
};
