const fs = require("fs");
const path = require("path");

function updateAppName(newName) {
  // Mobile: app.json
  const appJsonPath = path.join(
    __dirname,
    "src",
    "frontend",
    "mobile",
    "app.json"
  );
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    appJson.name = newName;
    appJson.displayName = newName;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log(`✔ Name in app.json geändert: ${newName}`);
  } else {
    console.log("⚠️ app.json nicht gefunden!");
  }

  // Web: package.json
  const webPkgPath = path.join(
    __dirname,
    "src",
    "frontend",
    "web",
    "package.json"
  );
  if (fs.existsSync(webPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(webPkgPath, "utf8"));
    pkg.name = newName;
    fs.writeFileSync(webPkgPath, JSON.stringify(pkg, null, 2));
    console.log(`✔ Name in Web package.json geändert: ${newName}`);
  } else {
    console.log("⚠️ Web package.json nicht gefunden!");
  }
}

// Name per Argument übergeben
const newName = process.argv[2];
if (!newName) {
  console.log(
    'Bitte neuen Namen als Argument übergeben! Beispiel: node setAppName.js "MeinAppName"'
  );
  process.exit(1);
}

updateAppName(newName);
