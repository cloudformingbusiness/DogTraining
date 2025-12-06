import { Picker } from "@react-native-picker/picker";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, View } from "react-native";
import styled from "styled-components/native";
import { getESPStatus, resetMeasurement, startMeasurement } from "../api/esp32";
import { Card, CardText, Text } from "../components";
import { Dog, HistoryEntry } from "../MobileApp";
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

const TimeText = styled.Text`
  font-size: 48px;
  font-weight: bold;
  color: ${(props) => props.theme.primary};
  margin-vertical: 20px;
  text-align: center;
`;

const PickerContainer = styled.View`
  background-color: ${(props) => props.theme.card};
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden; /* Important for border-radius on Android */
`;

const StyledPicker = styled(Picker)`
  color: ${(props) => props.theme.text};
`;

const ButtonContainer = styled.View`
  flex-direction: row;
  justify-content: space-around;
  margin-top: 20px;
`;

interface MessungScreenProps {
  dogs: Dog[];
  addToHistory: (entry: HistoryEntry) => void;
}

const MessungScreen: React.FC<MessungScreenProps> = ({
  dogs,
  addToHistory,
}) => {
  const [status, setStatus] = useState("Nicht verbunden");
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDog, setSelectedDog] = useState<string | null>(
    dogs.length > 0 ? dogs[0].name : null
  );

  const fetchStatus = useCallback(async () => {
    try {
      const espStatus = await getESPStatus();
      setStatus(espStatus.status || "Bereit");
      setTime(espStatus.time || 0);
      setIsRunning(espStatus.status === "Läuft");

      if (
        espStatus.status === "Gestoppt" &&
        espStatus.time > 0 &&
        selectedDog
      ) {
        addToHistory({
          dog: selectedDog,
          team: dogs.find((d) => d.name === selectedDog)?.team || "Unbekannt",
          time: espStatus.time,
        });
        await resetMeasurement();
        setTime(0);
      }
    } catch (error) {
      setStatus("Verbindungsfehler");
      console.error(error);
    }
  }, [addToHistory, selectedDog, dogs]);

  useEffect(() => {
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (!selectedDog && dogs.length > 0) {
      setSelectedDog(dogs[0].name);
    }
  }, [dogs, selectedDog]);

  const handleStart = async () => {
    if (!selectedDog) {
      Alert.alert("Fehler", "Bitte wählen Sie zuerst einen Hund aus.");
      return;
    }
    try {
      await startMeasurement();
      setIsRunning(true);
    } catch (error) {
      Alert.alert("Fehler", "Starten der Messung fehlgeschlagen.");
      console.error(error);
    }
  };

  const handleReset = async () => {
    try {
      await resetMeasurement();
      setTime(0);
      setIsRunning(false);
    } catch (error) {
      Alert.alert("Fehler", "Zurücksetzen der Messung fehlgeschlagen.");
      console.error(error);
    }
  };

  return (
    <Wrapper>
      <ScrollContainer>
        <Header>
          <HeaderTitle>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <HeaderIcon>⏱️</HeaderIcon>
              <Text variant="h1">Zeitmessung</Text>
            </View>
          </HeaderTitle>
          <CardText style={{ marginTop: 8, opacity: 0.8 }}>
            Live-Daten vom ESP32 Sensor
          </CardText>
        </Header>

        <View style={{ padding: 16 }}>
          <Card title="ESP32 Status">
            <CardText>Status: {status}</CardText>
          </Card>

          <Card title="Gemessene Zeit">
            <TimeText>{time.toFixed(3)}s</TimeText>
          </Card>

          <Card title="Hund auswählen">
            <PickerContainer>
              <StyledPicker
                selectedValue={selectedDog}
                onValueChange={(itemValue) => setSelectedDog(itemValue)}
              >
                {dogs.map((dog) => (
                  <Picker.Item
                    key={dog.name}
                    label={`${dog.name} (${dog.team})`}
                    value={dog.name}
                  />
                ))}
              </StyledPicker>
            </PickerContainer>
          </Card>

          <Card title="Steuerung">
            <ButtonContainer>
              <Button
                title="Start"
                onPress={handleStart}
                disabled={isRunning}
              />
              <Button title="Reset" onPress={handleReset} color="#e74c3c" />
            </ButtonContainer>
          </Card>
        </View>
      </ScrollContainer>
    </Wrapper>
  );
};

export default MessungScreen;
