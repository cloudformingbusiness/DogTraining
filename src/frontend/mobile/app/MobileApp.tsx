import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native";
import styled, { ThemeProvider } from "styled-components/native";
import { TabBar } from "./components";
import { darkTheme, lightTheme } from "./themes";

import DashboardScreen from "./screens/DashboardScreen";
import LoginView from "./screens/Login";
import MessungScreen from "./screens/MessungScreen";
import SettingsScreen from "./screens/Settings";
import TeamScreen from "./screens/TeamScreen";
import VerlaufScreen from "./screens/VerlaufScreen";

type Screen = "dashboard" | "messung" | "team" | "verlauf" | "settings";

export interface Dog {
  name: string;
  team: string;
}

export interface HistoryEntry {
  dog: string;
  team: string;
  time: number;
}

export interface StatusMessage {
  type: "info" | "warning" | "error";
  text: string;
}

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
  const [isDark, setIsDark] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Zentraler App-State
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Funktionen zur Manipulation des zentralen States
  const handleAddDog = (dog: Dog) => {
    if (dog.name && dog.team && !dogs.some((d) => d.name === dog.name)) {
      setDogs([...dogs, dog]);
    }
  };

  const handleAddTeam = (team: string) => {
    if (team && !teams.includes(team)) {
      setTeams([...teams, team]);
    }
  };

  const handleBatchAdd = (newDogs: Dog[], newTeams: string[]) => {
    setDogs((prevDogs) => {
      const dogsToAdd = newDogs.filter(
        (newDog) => !prevDogs.some((d) => d.name === newDog.name)
      );
      return [...prevDogs, ...dogsToAdd];
    });

    setTeams((prevTeams) => {
      const uniqueNewTeams = [...new Set(newTeams)]; // Duplikate aus dem Import entfernen
      const teamsToAdd = uniqueNewTeams.filter(
        (newTeam) => !prevTeams.includes(newTeam)
      );
      return [...prevTeams, ...teamsToAdd];
    });
  };

  const addToHistory = (entry: HistoryEntry) => {
    setHistory((prev) => [entry, ...prev.slice(0, 9)]); // Behalte die letzten 10 Einträge
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const clearTeamsAndDogs = () => {
    setDogs([]);
    setTeams([]);
  };

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentScreen("dashboard");
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setCurrentScreen("dashboard");
  };

  const renderScreen = () => {
    if (isLoading) {
      return null;
    }
    if (!isLoggedIn) {
      return <LoginView onLoginSuccess={handleLogin} />;
    }

    switch (currentScreen) {
      case "dashboard":
        return (
          <DashboardScreen
            dogs={dogs}
            teams={teams}
            history={history}
            navigateTo={(s: Screen) => setCurrentScreen(s)}
          />
        );
      case "messung":
        return <MessungScreen dogs={dogs} addToHistory={addToHistory} />;
      case "team":
        return (
          <TeamScreen
            dogs={dogs}
            teams={teams}
            onAddDog={handleAddDog}
            onAddTeam={handleAddTeam}
            onBatchAdd={handleBatchAdd}
            onClearTeamsAndDogs={clearTeamsAndDogs}
          />
        );
      case "verlauf":
        return (
          <VerlaufScreen history={history} onClearHistory={clearHistory} />
        );
      case "settings":
        return (
          <SettingsScreen
            toggleTheme={() => setIsDark((v) => !v)}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <DashboardScreen
            dogs={dogs}
            teams={teams}
            history={history}
            navigateTo={(s: Screen) => setCurrentScreen(s)}
          />
        );
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
              <TabBar
                currentScreen={currentScreen}
                onScreenChange={(s: Screen) => setCurrentScreen(s)}
              />
            </TabBarWrapper>
          )}
        </AppContainer>
      </SafeAreaView>
    </ThemeProvider>
  );
}
