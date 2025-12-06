import React, { useState } from "react";
import { Button, View } from "react-native";
import styled from "styled-components/native";
import { getESPSimpleStatus } from "../api/esp32";
import { Card, CardText, Text } from "../components";
import { Dog, HistoryEntry, StatusMessage } from "../MobileApp";
import { AppTheme } from "../themes";

const Wrapper = styled.View<{ theme: AppTheme }>`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Header = styled.View<{ theme: AppTheme }>`
  padding: ${({ theme }) => theme.spacing.lg}px;
  padding-bottom: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.card};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const HeaderTitle = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const HeaderIcon = styled.Text`
  font-size: 28px;
  margin-right: 12px;
`;

const ScrollContainer = styled.ScrollView`
  flex: 1;
`;

const StatusFooter = styled.View<{ theme: AppTheme }>`
  padding: 10px;
  background-color: ${({ theme }) => theme.colors.card};
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.border};
`;

const StatusMessageContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 5px 0;
`;

const StatusIcon = styled.Text`
  font-size: 18px;
  margin-right: 10px;
`;

const StatusText = styled.Text<{
  theme: AppTheme;
  type: StatusMessage["type"];
}>`
  color: ${({ theme, type }) => {
    if (type === "error") return theme.colors.button.danger.background;
    if (type === "warning") return "#FFA500"; // Orange for warning
    return theme.colors.text;
  }};
  text-align: left;
  flex: 1;
`;

interface DashboardScreenProps {
  dogs: Dog[];
  teams: string[];
  history: HistoryEntry[];
  navigateTo: (screen: "messung" | "team" | "verlauf" | "settings") => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  dogs,
  teams,
  history,
  navigateTo,
}) => {
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lastMeasurement = history.length > 0 ? history[0] : null;

  const checkConnection = async () => {
    console.log("Button 'Verbindung testen' wurde gedrückt.");
    setError(null);
    setStatusMessages([]);
    try {
      const status = await getESPSimpleStatus();
      console.log("Erfolgreiche Antwort vom ESP32:", status);
      setStatusMessages(status.messages);
    } catch (e: any) {
      console.error("Fehler bei der Verbindung zum ESP32:", e);
      setError("Verbindung zum ESP32 fehlgeschlagen.");
      setStatusMessages([]);
    }
  };

  // useEffect(() => {
  //   checkConnection();
  // }, []);

  const getIconForType = (type: StatusMessage["type"]) => {
    switch (type) {
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "";
    }
  };

  return (
    <Wrapper>
      <ScrollContainer>
        <Header>
          <HeaderTitle>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <HeaderIcon>📊</HeaderIcon>
              <Text variant="h1">Dashboard</Text>
            </View>
          </HeaderTitle>
          <CardText style={{ marginTop: 8, opacity: 0.8 }}>
            Willkommen zurück! Hier ist deine Übersicht.
          </CardText>
        </Header>

        <View style={{ padding: 16 }}>
          <Card title="Verbindung">
            <View style={{ margin: 10 }}>
              <Button
                title="Verbindung testen"
                onPress={checkConnection}
                color="#007bff"
              />
            </View>
          </Card>

          <Card title="Statistik">
            <CardText>Gemeldete Teams: {teams.length}</CardText>
            <CardText>Gemeldete Hunde: {dogs.length}</CardText>
          </Card>

          <Card title="Letzte Messung">
            {lastMeasurement ? (
              <>
                <CardText>Team: {lastMeasurement.team}</CardText>
                <CardText>Hund: {lastMeasurement.dog}</CardText>
                <CardText>
                  Zeit: {(lastMeasurement.time / 1000).toFixed(2)}s
                </CardText>
              </>
            ) : (
              <CardText>Noch keine Messung durchgeführt.</CardText>
            )}
          </Card>

          <Card title="Schnellzugriff">
            <View style={{ marginBottom: 10 }}>
              <Button
                title="Neue Messung starten"
                onPress={() => navigateTo("messung")}
              />
            </View>
            <View style={{ marginBottom: 10 }}>
              <Button
                title="Teams & Hunde verwalten"
                onPress={() => navigateTo("team")}
              />
            </View>
            <View>
              <Button
                title="Verlauf anzeigen"
                onPress={() => navigateTo("verlauf")}
              />
            </View>
          </Card>
        </View>
      </ScrollContainer>
      {(statusMessages.length > 0 || error) && (
        <StatusFooter>
          {error ? (
            <StatusMessageContainer>
              <StatusIcon>❌</StatusIcon>
              <StatusText type="error">{error}</StatusText>
            </StatusMessageContainer>
          ) : (
            statusMessages.map((msg, index) => (
              <StatusMessageContainer key={index}>
                <StatusIcon>{getIconForType(msg.type)}</StatusIcon>
                <StatusText type={msg.type}>{msg.text}</StatusText>
              </StatusMessageContainer>
            ))
          )}
        </StatusFooter>
      )}
    </Wrapper>
  );
};

export default DashboardScreen;
