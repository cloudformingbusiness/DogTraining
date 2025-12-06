import { Picker } from "@react-native-picker/picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Switch, View } from "react-native";
import styled from "styled-components/native";
import {
  getCurrentData,
  manualStart,
  manualStop,
  resetMeasurement,
  setSensorState,
} from "../api/esp32";
import { Button, Card, CardText, Text } from "../components";
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
  elevation: 0; /* Remove shadow on Android */
  shadow-opacity: 0; /* Remove shadow on iOS */
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

const ScrollContainer = styled.ScrollView.attrs({
  contentContainerStyle: {
    paddingBottom: 30,
  },
})`
  flex: 1;
`;

const TimeText = styled.Text<{ theme: AppTheme }>`
  font-family: "Menlo";
  font-size: 52px; /* Slightly larger */
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text}; /* Better contrast */
  margin-vertical: 20px;
  text-align: center;
  letter-spacing: 1px; /* More space between characters */
`;

const PickerContainer = styled.View<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden; /* Important for border-radius on Android */
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
`;

const StyledPicker = styled(Picker)<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
`;

const ButtonContainer = styled.View`
  flex-direction: row;
  justify-content: space-around;
  margin-top: 20px;
`;

const ManualModeContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
`;

interface MessungScreenProps {
  dogs: Dog[];
  addToHistory: (entry: HistoryEntry) => void;
}

const formatTime = (ms: number) => {
  if (ms < 0) ms = 0;
  const minutes = String(Math.floor(ms / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  const milliseconds = String(ms % 1000).padStart(3, "0");
  return `${minutes}:${seconds}.${milliseconds}`;
};

// Custom hook to get the previous value of a prop or state
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

const MessungScreen: React.FC<MessungScreenProps> = ({
  dogs,
  addToHistory,
}) => {
  const [status, setStatus] = useState("Nicht verbunden");
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isSensorActive, setIsSensorActive] = useState(true);
  const [selectedDog, setSelectedDog] = useState<string | null>(
    dogs.length > 0 ? dogs[0].name : null
  );
  const [localStartTime, setLocalStartTime] = useState(0);

  const fetchStatus = useCallback(async () => {
    // Don't fetch if manual mode is on and timer is running locally
    if (isManualMode && isRunning) return;

    try {
      const data = await getCurrentData();
      setStatus(data.state === "running" ? "Messung läuft" : "Bereit");
      setIsRunning(data.state === "running");
      setIsSensorActive(data.sensor_active);

      if (data.elapsed !== null) {
        setTime(data.elapsed);
      }

      // Logic for when a run finishes automatically via light barrier
      if (
        !isManualMode &&
        data.state === "idle" &&
        wasRunning && // check if it was running before this fetch
        data.finish > data.start
      ) {
        const finishedRunTime = data.finish - data.start;
        const dogName = data.participant?.dog_name || selectedDog;
        if (dogName) {
          addToHistory({
            dog: dogName,
            team: dogs.find((d) => d.name === dogName)?.team || "Unbekannt",
            time: finishedRunTime / 1000, // convert ms to s for history
          });
        }
        // Reset time for next run
        setTime(0);
        await resetMeasurement();
      }
    } catch (error) {
      setStatus("Verbindungsfehler");
      setIsRunning(false);
      // Don't log AbortError as it's expected on timeout
      if ((error as Error).name !== "AbortError") {
        console.error("Error fetching status:", error);
      }
    }
  }, [isManualMode, isRunning, addToHistory, selectedDog, dogs]);

  useEffect(() => {
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (!selectedDog && dogs.length > 0) {
      setSelectedDog(dogs[0].name);
    }
  }, [dogs, selectedDog]);

  const handleManualStart = async () => {
    console.log("handleManualStart: Button pressed");
    try {
      const result = await manualStart();
      if (result.status === "manual_start") {
        setIsRunning(true);
        setLocalStartTime(Date.now());
        setTime(0); // Reset display time
        setStatus("Manuelle Messung läuft...");
      } else {
        Alert.alert("Fehler", result.error || "Start fehlgeschlagen.");
      }
    } catch (error) {
      Alert.alert("Fehler", "Starten der Messung fehlgeschlagen.");
      console.error(error);
    }
  };

  const handleManualStop = async () => {
    console.log("handleManualStop: Button pressed");
    try {
      const result = await manualStop();
      if (result.status === "manual_stop" && result.result) {
        setIsRunning(false);
        setLocalStartTime(0);
        setTime(result.elapsed_ms);
        setStatus(`Manuell gestoppt: ${formatTime(result.elapsed_ms)}`);
        if (selectedDog) {
          addToHistory({
            dog: selectedDog,
            team: dogs.find((d) => d.name === selectedDog)?.team || "Unbekannt",
            time: result.elapsed_ms / 1000,
          });
        }
      } else {
        Alert.alert("Fehler", result.error || "Stop fehlgeschlagen.");
      }
    } catch (error) {
      Alert.alert("Fehler", "Stoppen der Messung fehlgeschlagen.");
      console.error(error);
    }
  };

  const handleToggleSensor = async () => {
    console.log("handleToggleSensor: Button pressed");
    try {
      const newState = !isSensorActive;
      const result = await setSensorState(newState);
      if (result.sensor_enabled === newState) {
        setIsSensorActive(newState);
        setStatus(newState ? "Sensor aktiviert" : "Sensor deaktiviert");
      }
    } catch (error) {
      Alert.alert("Fehler", "Sensorstatus konnte nicht geändert werden.");
    }
  };

  const handleReset = async () => {
    console.log("handleReset: Button pressed");
    try {
      await resetMeasurement();
      setTime(0);
      setIsRunning(false);
      setLocalStartTime(0);
      setStatus("Zurückgesetzt");
    } catch (error) {
      Alert.alert("Fehler", "Zurücksetzen der Messung fehlgeschlagen.");
      console.error(error);
    }
  };

  // Local timer for manual mode display
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isRunning && isManualMode && localStartTime > 0) {
      interval = setInterval(() => {
        setTime(Date.now() - localStartTime);
      }, 50); // Update UI faster for smooth display
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, isManualMode, localStartTime]);

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
            Live-Daten und manuelle Steuerung
          </CardText>
        </Header>

        <View style={{ padding: 16 }}>
          <Card title="ESP32 Status">
            <CardText>Status: {status}</CardText>
          </Card>
          <Card title="Modus">
            <ManualModeContainer>
              <Text>Manuelle Messung</Text>
              <Switch
                value={isManualMode}
                onValueChange={(value) => {
                  setIsManualMode(value);
                  // Reset state when switching modes
                  handleReset();
                }}
              />
            </ManualModeContainer>
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

          <Card title="Gemessene Zeit">
            <TimeText>{formatTime(time)}</TimeText>
          </Card>

          {isManualMode ? (
            <Card title="Manuelle Steuerung">
              <ButtonContainer>
                <Button
                  onPress={handleManualStart}
                  disabled={isRunning}
                  variant="primary"
                >
                  Start
                </Button>
                <Button
                  onPress={handleManualStop}
                  disabled={!isRunning}
                  variant="danger"
                >
                  Stop
                </Button>
                <Button
                  onPress={handleReset}
                  disabled={isRunning}
                  variant="secondary"
                >
                  Reset
                </Button>
              </ButtonContainer>
            </Card>
          ) : (
            <Card title="Sensor Steuerung">
              <ButtonContainer>
                <Button
                  onPress={handleToggleSensor}
                  variant={isSensorActive ? "secondary" : "primary"}
                >
                  {isSensorActive ? "Sensor Deaktivieren" : "Sensor Aktivieren"}
                </Button>
                <Button onPress={handleReset} variant="secondary">
                  Reset
                </Button>
              </ButtonContainer>
            </Card>
          )}
        </View>
      </ScrollContainer>
    </Wrapper>
  );
};

export default MessungScreen;
