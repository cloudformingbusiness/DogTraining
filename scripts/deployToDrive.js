import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const PROJECT_NAME = "BauLogPro"; // Passe ggf. dynamisch an
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORT_DIR = path.join(__dirname, "export", PROJECT_NAME);
const WEB_BUILD_SRC = path.join(
  __dirname,
  "..",
  "src",
  "frontend",
  "web",
  "build"
);
const APK_SRC = path.join(
  __dirname,
  "..",
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "release"
);
const AAB_SRC = path.join(
  __dirname,
  "..",
  "android",
  "app",
  "build",
  "outputs",
  "bundle",
  "release"
);

function logStep(step) {
  console.log("\n==============================");
  console.log(`==> ${step}`);
  console.log("==============================\n");
}

logStep("Starte Build der Web-App...");
execSync("cd src/frontend/web && npm run build", { stdio: "inherit" });

logStep("Starte Build der Android APK...");
execSync("cd android && gradlew.bat assembleRelease", { stdio: "inherit" });

logStep("Starte Build der Android AAB...");
execSync("cd android && gradlew.bat bundleRelease", { stdio: "inherit" });

logStep("Kopiere Web-Build in Export-Ordner...");
fs.ensureDirSync(EXPORT_DIR);
fs.copySync(WEB_BUILD_SRC, path.join(EXPORT_DIR, "web"), { overwrite: true });

logStep("Kopiere APKs in Export-Ordner...");
fs.ensureDirSync(path.join(EXPORT_DIR, "apk"));
const apkFiles = fs.readdirSync(APK_SRC).filter((f) => f.endsWith(".apk"));
for (const file of apkFiles) {
  fs.copyFileSync(path.join(APK_SRC, file), path.join(EXPORT_DIR, "apk", file));
}

logStep("Kopiere AABs in Export-Ordner...");
fs.ensureDirSync(path.join(EXPORT_DIR, "aab"));
fs.copySync(AAB_SRC, path.join(EXPORT_DIR, "aab"), { overwrite: true });

console.log(`\n✅ Export abgeschlossen: ${EXPORT_DIR}`);
