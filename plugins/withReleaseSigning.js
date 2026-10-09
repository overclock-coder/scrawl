// Adds a `release` signing config when SCRAWL_KEYSTORE_* properties exist in
// ~/.gradle/gradle.properties; otherwise release builds fall back to the debug key.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// scrawl-release-signing";

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    src = src.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        ${MARKER}
        if (project.hasProperty("SCRAWL_KEYSTORE_FILE")) {
            release {
                storeFile file(project.property("SCRAWL_KEYSTORE_FILE"))
                storePassword project.property("SCRAWL_KEYSTORE_PASSWORD")
                keyAlias project.property("SCRAWL_KEY_ALIAS")
                keyPassword project.property("SCRAWL_KEYSTORE_PASSWORD")
            }
        }`
    );

    // In the release buildType, prefer the release config when it exists.
    src = src.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig project.hasProperty("SCRAWL_KEYSTORE_FILE") ? signingConfigs.release : signingConfigs.debug`
    );

    cfg.modResults.contents = src;
    return cfg;
  });
};
