// Plugin Expo commun aux deux applications alpha.
const { withAppBuildGradle, withAndroidManifest } = require("expo/config-plugins");

module.exports = (config) => {
  config = withAppBuildGradle(config, (result) => {
    const source = result.modResults.contents;
    if (source.includes("// TEKO_ALPHA_SIGNING")) return result;
    if (!source.includes("signingConfig signingConfigs.debug"))
      throw new Error("Signature release Android inattendue");
    result.modResults.contents = source
      .replace(
        "android {",
        `// TEKO_ALPHA_SIGNING
def tekoAlphaSigning = new Properties()
def tekoAlphaFile = rootProject.file("../../../.local/alpha-signing/signing.properties")
if (!tekoAlphaFile.exists()) throw new GradleException("Clé alpha requise ; signature debug refusée")
tekoAlphaFile.withInputStream { tekoAlphaSigning.load(it) }
android {`,
      )
      .replace(
        "signingConfigs {",
        `signingConfigs {
        alpha {
            storeFile file(tekoAlphaSigning.getProperty("storeFile"))
            storePassword tekoAlphaSigning.getProperty("storePassword")
            keyAlias tekoAlphaSigning.getProperty("keyAlias")
            keyPassword tekoAlphaSigning.getProperty("keyPassword")
        }`,
      );
    // Cible uniquement la build release : le bloc debug porte aussi cette ligne.
    result.modResults.contents = result.modResults.contents.replace(
      /(release\s*\{[\s\S]*?)signingConfig signingConfigs.debug/,
      "$1signingConfig signingConfigs.alpha",
    );
    if (
      !/release\s*\{[\s\S]*?signingConfig signingConfigs.alpha/.test(result.modResults.contents)
    ) {
      throw new Error("La build release doit utiliser la clé alpha");
    }
    return result;
  });
  return withAndroidManifest(config, (result) => {
    const application = result.modResults.manifest.application[0];
    // HTTP réservé au banc USB local ; la distribution terrain exige HTTPS.
    application.$["android:usesCleartextTraffic"] =
      process.env.TEKO_ALLOW_LOCAL_HTTP === "1" ? "true" : "false";
    return result;
  });
};
