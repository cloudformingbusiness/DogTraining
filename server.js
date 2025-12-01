// Deployment Entry Point für Coolify
import { existsSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Debugging Docker Container...");
console.log("📁 Current Directory:", __dirname);
console.log("📁 Process CWD:", process.cwd());

// Debug: Liste Verzeichnisse auf
console.log("\n📂 Root Directory Contents:");
try {
  const rootContents = readdirSync(__dirname);
  console.log(rootContents);
} catch (e) {
  console.error("❌ Cannot read root directory:", e.message);
}

// Debug: Prüfe src Verzeichnis
const srcPath = path.join(__dirname, "src");
console.log("\n📂 Checking src directory:", srcPath);
if (existsSync(srcPath)) {
  console.log("✅ src exists");
  try {
    const srcContents = readdirSync(srcPath);
    console.log("src contents:", srcContents);
  } catch (e) {
    console.error("❌ Cannot read src directory:", e.message);
  }
} else {
  console.log("❌ src directory does not exist");
}

// Debug: Prüfe backend Verzeichnis
const backendPath = path.join(__dirname, "src", "backend");
console.log("\n📂 Checking backend directory:", backendPath);
if (existsSync(backendPath)) {
  console.log("✅ backend exists");
  try {
    const backendContents = readdirSync(backendPath);
    console.log("backend contents:", backendContents);
  } catch (e) {
    console.error("❌ Cannot read backend directory:", e.message);
  }
} else {
  console.log("❌ backend directory does not exist");
}

// Debug: Prüfe config Verzeichnis
const configPath = path.join(__dirname, "src", "backend", "server", "config");
console.log("\n📂 Checking config directory:", configPath);
if (existsSync(configPath)) {
  console.log("✅ config directory exists");
  try {
    const configContents = readdirSync(configPath);
    console.log("config contents:", configContents);
  } catch (e) {
    console.error("❌ Cannot read config directory:", e.message);
  }
} else {
  console.log("❌ config directory does not exist");
}

// Debug: Prüfe server.js Datei
const serverJsPath = path.join(
  __dirname,
  "src",
  "backend",
  "server",
  "controllers",
  "server.js"
);
console.log("\n📄 Checking server.js:", serverJsPath);
if (existsSync(serverJsPath)) {
  console.log("✅ server.js exists");
  // Importiere und starte den echten Server
  try {
    console.log("\n🚀 Starting actual server...");
    await import(serverJsPath);
  } catch (importError) {
    console.error("❌ Import failed:", importError.message);
  }
} else {
  console.log("❌ server.js does not exist");
}

console.log("\n🔍 Container debugging complete.");
