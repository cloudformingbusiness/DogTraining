const fs = require("fs");
const path = require("path");

const newVersion = process.argv[2] || "1.0.0";

const files = [
  "package.json",
  "src/frontend/mobile/app/app.json",
  "android/build.gradle",
  "android/app/build.gradle",
  "src/frontend/web/package.json",
];

files.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");
    // package.json & app.json
    content = content.replace(/("version":\s*")[^"]+(")/g, `$1${newVersion}$2`);
    // android/app/build.gradle
    content = content.replace(
      /versionName\s*"[^"]+"/g,
      `versionName "${newVersion}"`
    );
    // android/build.gradle (AAB/APK Task)
    content = content.replace(
      /def version = '[^']+'/g,
      `def version = '${newVersion}'`
    );
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Version in ${file} auf ${newVersion} gesetzt.`);
  }
});

// APK/AAB-Dateinamen anpassen
const gradleAppPath = path.join(__dirname, "android/app/build.gradle");
if (fs.existsSync(gradleAppPath)) {
  let gradleContent = fs.readFileSync(gradleAppPath, "utf8");
  gradleContent = gradleContent.replace(
    /output\.outputFileName = ".*\.apk"/g,
    `output.outputFileName = "BauLogPro-release-${newVersion}.apk"`
  );
  gradleContent = gradleContent.replace(
    /output\.outputFileName = ".*\.aab"/g,
    `output.outputFileName = "BauLogPro-release-${newVersion}.aab"`
  );
  fs.writeFileSync(gradleAppPath, gradleContent, "utf8");
  console.log(
    `APK/AAB-Dateinamen in build.gradle auf BauLogPro-release-${newVersion} gesetzt.`
  );
}
