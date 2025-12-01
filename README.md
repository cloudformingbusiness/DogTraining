# 📱 Projektinstallation -- React Native / Expo

Dieses Projekt basiert auf **Expo** und ist so strukturiert,
dass das Mobile-Frontend unter\
`src/Frontend/Mobile` organisiert ist.\
Die native Android/iOS-Struktur wird automatisch über Expo erzeugt.

## 🚀 Voraussetzungen

Bevor du startest, installiere folgende Tools:

- **Node.js** (empfohlen: LTS-Version)
- **npm** (automatisch bei Node dabei)
- **Expo CLI (lokal über npx)**
- Optional (für native Builds):
- **Android Studio**
- **Xcode** (nur macOS)

## 📦 Projektinstallation

### 1. Repository klonen

``` bash
git clone <dein-repo-link>
cd <projektname>
```

### 2. Abhängigkeiten installieren (Für die mobile App)

Im **Projekt-Root**, dort wo die `package.json` liegt:

``` bash
npm install
```

## 🧱 Projektstruktur (Auszug)

``` bash

    ├── android/
    ├── ios/
    ├── app.json
    ├── App.tsx
    ├── package.json
    ├── babel.config.js
    ├── src/
    │   └── Frontend/
    │       ├── Mobile/
    │       └── Web/
    └── Backend/
```

## ▶️ Entwicklungen starten

``` bash
npx expo start
```

## 📲 Android-Ordner erzeugen (optional)

``` bash
npx expo prebuild
```

## 🔧 Nützliche Befehle

  Befehl                   Beschreibung
  ------------------------ --------------------------
  `npx expo start`         Dev-Server starten
  `npm install <paket>`    Neues Paket installieren
  `npx expo prebuild`      Native Ordner erzeugen
  `npx expo run:android`   Android-App bauen
  `npx expo run:ios`       iOS-App bauen

## 🌐 Web-Frontend (React)

Das Web-Frontend befindet sich im Ordner `src/Frontend/Web`.

### Neues Webprojekt anlegen

Im Projektordner:

```bash
npx create-react-app src/Frontend/Web
```

### Webprojekt starten

```bash
cd src/Frontend/Web
npm start
```

## 🛠 Backend

Das Backend befindet sich im Ordner `Backend`.

### Backend-Abhängigkeiten installieren

```bash
cd Backend
npm install
```

### Backend starten

```bash
npm start
```

## 📋 Build & Release

  ```bash
  cd android
  gradlew.bat assembleRelease
  gradlew.bat bundleRelease
  ```

## 📤 Export der Builds

Mit dem Skript `deployToDrive.js` werden die gebauten Dateien lokal abgelegt:

```bash
node deployToDrive.js
```

Die Ergebnisse findest du im Ordner:

- `export/BauLogPro/web`   → Web-Build
- `export/BauLogPro/apk`   → Android APK
- `export/BauLogPro/aab`   → Android App Bundle (AAB)

Das Skript zeigt den Fortschritt und Status direkt in der Konsole an.

## ⚡ VS Code Tasks

Siehe `.vscode/tasks.json` für vorkonfigurierte Tasks zum Starten und Bauen.

## ⚡ Dev Webserever

Siehe ['Entwicklung-Online-Webserver'](https://www.casemeetsbusiness.de/)

## 📝 Hinweise

- Expo-Version regelmäßig aktualisieren (`npm install expo@~54.0.25`)
- Android-Gerät autorisieren: <https://expo.fyi/authorize-android-device>

## 💬 Kontakt & Support

Bei Fragen oder Problemen bitte an das Entwicklerteam wenden.
"# BauLogPro"
"# BauLogPro"
