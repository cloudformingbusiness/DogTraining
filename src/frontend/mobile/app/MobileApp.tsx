import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaView } from "react-native";
import styled, { ThemeProvider } from "styled-components/native";
import { TabBar } from "./components";
import { darkTheme, lightTheme } from "./themes";

import type {
  FotoDokumentation as FotoDokumentationType,
  Kalkulation as KalkulationType,
  Messdaten,
  Sicherheitsmassnahme,
} from "./utils/projectDataManager";

import Dashboard from "./screens/Dashboard";
import EntwicklungenScreen from "./screens/Entwicklungen";
import FotoDokumentation from "./screens/FotoDokumentation";
import Kalkulation from "./screens/Kalkulation";
import LoginView from "./screens/Login";
import MessdatenErfassung from "./screens/MessdatenErfassung";
import ProjektDetail from "./screens/ProjektDetail";
import Settings from "./screens/Settings";
import Sicherheitsmassnahmen from "./screens/Sicherheitsmassnahmen";

type Screen =
  | "dashboard"
  | "messdaten"
  | "projekt"
  | "fotodokumentation"
  | "sicherheit"
  | "kalkulation"
  | "settings"
  | "entwicklung";

const AppContainer = styled.View`
  flex: 1;
`;

const ScreenContainer = styled.View`
  flex: 1;
`;

const TabBarWrapper = styled.View`
  margin-bottom: 0px;
`;

export default function MobileApp() {
  // Daten-State für alle Views
  const [messdaten, setMessdaten] = React.useState<Messdaten[]>([]);
  const [fotos, setFotos] = React.useState<FotoDokumentationType[]>([]);
  const [sicherheit, setSicherheit] = React.useState<Sicherheitsmassnahme[]>(
    []
  );
  const [kalkulation, setKalkulation] = React.useState<KalkulationType[]>([]);
  const [isDark, setIsDark] = React.useState(false);
  const [currentScreen, setCurrentScreen] = React.useState<Screen>("dashboard");
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // 🔧 Beim Start Skip-Login prüfen
  useEffect(() => {
    setIsLoading(false); // Sofort nach Start Login anzeigen
    fetchServerStatus();
  }, []);

  const fetchServerStatus = async () => {
    try {
      const res = await fetch("https://api.cloudforming.de/api/status");
      const data = await res.json();
      console.log("Externer Server-Status:", data);
      // Du kannst die Daten auch im State speichern und anzeigen!
    } catch (err) {
      console.error("Fehler beim Abrufen des Server-Status:", err);
    }
  };

  // Skip-Login-Logik für Test entfernt

  const handleLogin = () => {
    console.log("handleLogin wurde ausgeführt!");
    setIsLoggedIn(true);
    setCurrentScreen("dashboard");
  };

  const handleLogout = async () => {
    // Skip-Login Einstellung NICHT löschen
    // Nur den Login-Status zurücksetzen
    setIsLoggedIn(false);
    setCurrentScreen("dashboard");
  };

  // Callback-Funktionen
  const handleMessdatenChange = (data: Messdaten[]) => setMessdaten(data);
  const handleFotoChange = (data: FotoDokumentationType[]) => setFotos(data);
  const handleSicherheitChange = (data: Sicherheitsmassnahme[]) =>
    setSicherheit(data);
  const handleKalkulationChange = (data: KalkulationType[]) =>
    setKalkulation(data);

  const renderScreen = () => {
    console.log("📱 Aktueller Screen:", currentScreen);

    // Beim Laden: Nichts anzeigen
    if (isLoading) {
      return null;
    }

    // Wenn nicht eingeloggt, zeige LoginView
    if (!isLoggedIn) {
      return <LoginView onLoginSuccess={handleLogin} />;
    }

    switch (currentScreen) {
      case "dashboard":
        return <Dashboard />;
      case "messdaten":
        return (
          <MessdatenErfassung
            messdaten={messdaten}
            onMessdatenChange={handleMessdatenChange}
          />
        );
      case "projekt":
        return <ProjektDetail />;
      case "fotodokumentation":
        return (
          <FotoDokumentation fotos={fotos} onFotoChange={handleFotoChange} />
        );
      case "sicherheit":
        return (
          <Sicherheitsmassnahmen
            sicherheit={sicherheit}
            onSicherheitChange={handleSicherheitChange}
          />
        );
      case "kalkulation":
        return (
          <Kalkulation
            kalkulation={kalkulation}
            onKalkulationChange={handleKalkulationChange}
          />
        );
      case "settings":
        return (
          <Settings
            toggleTheme={() => setIsDark((v) => !v)}
            onLogout={handleLogout}
          />
        );
      case "entwicklung":
        return <EntwicklungenScreen />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={{ flex: 1 }}>
        <AppContainer>
          <ScreenContainer testID="main-container">
            {renderScreen()}
          </ScreenContainer>
          {isLoggedIn && (
            <TabBarWrapper>
              <TabBar activeTab={currentScreen} onTabPress={setCurrentScreen} />
            </TabBarWrapper>
          )}
        </AppContainer>
      </SafeAreaView>
    </ThemeProvider>
  );
}
