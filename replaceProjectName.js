const fs = require("fs");
const path = require("path");

function replaceInFile(filePath, oldName, newName) {
  const content = fs.readFileSync(filePath, "utf8");
  const updated = content.replace(new RegExp(oldName, "g"), newName);
  fs.writeFileSync(filePath, updated);
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const filePath = path.join(dir, f);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, callback);
    } else if (filePath.match(/\.(js|jsx|ts|tsx|json|md)$/)) {
      callback(filePath);
    }
  });
}

const oldName = process.argv[2];
const newName = process.argv[3];
if (!oldName || !newName) {
  console.log('Verwendung: node replaceProjectName.js "AlterName" "NeuerName"');
  process.exit(1);
}

const rootDir = __dirname;
walkDir(rootDir, (filePath) => {
  replaceInFile(filePath, oldName, newName);
  console.log(`✔ Ersetzt in: ${filePath}`);
});

console.log("✅ Alle Vorkommen ersetzt!");
