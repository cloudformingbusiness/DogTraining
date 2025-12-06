import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import { Alert, Button, StyleSheet, View } from "react-native";
import RNPickerSelect from "react-native-picker-select";
import styled, { useTheme } from "styled-components/native";
import { Card, CardText, Text } from "../components";
import { Dog } from "../MobileApp";
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

const Input = styled.TextInput`
  background-color: ${(props) => props.theme.card};
  color: ${(props) => props.theme.text};
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 16px;
`;

const ListItem = styled.View`
  background-color: ${(props) => props.theme.card};
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 10px;
`;

const DogName = styled.Text`
  font-size: 18px;
  color: ${(props) => props.theme.text};
  font-weight: 500;
`;

const TeamName = styled.Text`
  font-size: 14px;
  color: ${(props) => props.theme.muted};
  margin-top: 4px;
`;

interface TeamScreenProps {
  dogs: Dog[];
  teams: string[];
  onAddDog: (dog: Dog) => void;
  onAddTeam: (team: string) => void;
  onBatchAdd: (newDogs: Dog[], newTeams: string[]) => void;
  onClearTeamsAndDogs: () => void;
}

const TeamScreen: React.FC<TeamScreenProps> = ({
  dogs,
  teams,
  onAddDog,
  onAddTeam,
  onBatchAdd,
  onClearTeamsAndDogs,
}) => {
  const [dogName, setDogName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const theme = useTheme() as AppTheme;

  const handleAddDog = () => {
    const teamToUse = selectedTeam === "new_team" ? newTeamName : selectedTeam;

    if (dogName && teamToUse) {
      onAddDog({ name: dogName, team: teamToUse });
      if (selectedTeam === "new_team" && !teams.includes(teamToUse)) {
        onAddTeam(teamToUse);
      }
      setDogName("");
      setSelectedTeam(null);
      setNewTeamName("");
    } else {
      Alert.alert("Fehler", "Bitte Hundename und Team angeben.");
    }
  };

  const handleExportCSV = async () => {
    if (dogs.length === 0) {
      Alert.alert(
        "Export nicht möglich",
        "Es sind keine Hunde zum Exportieren vorhanden."
      );
      return;
    }

    // Sortieren der Hunde nach Team und dann nach Name
    const sortedDogs = [...dogs].sort((a, b) => {
      if (a.team < b.team) return -1;
      if (a.team > b.team) return 1;
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    const csvHeader = "Team;Hund\n";
    const csvRows = sortedDogs
      .map((dog) => `${dog.team};${dog.name}`)
      .join("\n");
    const csvContent = csvHeader + csvRows;

    const date = new Date();
    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}`;
    const filename = `teams_hunde_export_${timestamp}.csv`;
    const fileUri = FileSystem.cacheDirectory + filename;

    try {
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Hundeliste exportieren",
      });
    } catch (error) {
      console.error("Fehler beim Exportieren der CSV:", error);
      Alert.alert(
        "Export fehlgeschlagen",
        "Die CSV-Datei konnte nicht erstellt oder geteilt werden."
      );
    }
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const content = await FileSystem.readAsStringAsync(uri);
        const lines = content.split("\n").filter((line) => line.trim() !== "");

        const newDogs: Dog[] = [];
        const newTeams: string[] = [];

        lines.forEach((line) => {
          const [team, dog] = line.split(";");
          if (team && dog) {
            const teamTrimmed = team.trim();
            const dogTrimmed = dog.trim();
            newDogs.push({ name: dogTrimmed, team: teamTrimmed });
            newTeams.push(teamTrimmed);
          }
        });

        if (newDogs.length > 0) {
          onBatchAdd(newDogs, newTeams);
          Alert.alert(
            "Import erfolgreich",
            `${newDogs.length} Hunde wurden importiert.`
          );
        } else {
          Alert.alert(
            "Importinfo",
            "Keine gültigen Daten zum Importieren gefunden."
          );
        }
      }
    } catch (error) {
      console.error("Fehler beim Importieren der CSV:", error);
      Alert.alert(
        "Import fehlgeschlagen",
        "Die CSV-Datei konnte nicht gelesen werden."
      );
    }
  };

  const groupedDogs = useMemo(() => {
    if (!dogs) return [];
    const groups: { [key: string]: Dog[] } = dogs.reduce((acc, dog) => {
      const team = dog.team || "Ohne Team";
      if (!acc[team]) {
        acc[team] = [];
      }
      acc[team].push(dog);
      return acc;
    }, {} as { [key: string]: Dog[] });

    return Object.keys(groups).map((team) => ({
      title: team,
      data: groups[team],
    }));
  }, [dogs]);

  const pickerItems = [
    ...teams.map((team) => ({ label: team, value: team })),
    { label: "Neues Team erstellen...", value: "new_team" },
  ];

  const pickerStyles = StyleSheet.create({
    inputIOS: {
      fontSize: 16,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      color: theme.colors.text,
      paddingRight: 30,
      backgroundColor: theme.colors.card,
      marginBottom: 10,
    },
    inputAndroid: {
      fontSize: 16,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      color: theme.colors.text,
      paddingRight: 30,
      backgroundColor: theme.colors.card,
      marginBottom: 10,
    },
    placeholder: {
      color: "#999",
    },
  });

  return (
    <Wrapper>
      <ScrollContainer>
        <Header>
          <HeaderTitle>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <HeaderIcon>👥</HeaderIcon>
              <Text variant="h1">Team & Hunde</Text>
            </View>
          </HeaderTitle>
          <CardText style={{ marginTop: 8, opacity: 0.8 }}>
            Hunde und Teams für das Rennen verwalten
          </CardText>
        </Header>

        <View style={{ padding: 16 }}>
          <Card title="Daten importieren / exportieren">
            <View style={{ marginBottom: 10 }}>
              <Button
                title="Teams & Hunde aus CSV importieren"
                onPress={handleImportCSV}
              />
            </View>
            <Button
              title="Aktuelle Liste als CSV exportieren"
              onPress={handleExportCSV}
            />
          </Card>

          <Card title="Daten löschen">
            <Button
              title="Alle Teams & Hunde löschen"
              onPress={() => {
                Alert.alert(
                  "Bestätigen",
                  "Möchten Sie wirklich alle Teams und Hunde löschen?",
                  [
                    { text: "Abbrechen", style: "cancel" },
                    {
                      text: "Löschen",
                      onPress: onClearTeamsAndDogs,
                      style: "destructive",
                    },
                  ]
                );
              }}
              color="#ff3b30"
            />
          </Card>

          <Card title="Neuen Hund hinzufügen">
            <RNPickerSelect
              onValueChange={(value) => setSelectedTeam(value)}
              items={pickerItems}
              style={pickerStyles}
              placeholder={{ label: "Team auswählen", value: null }}
              value={selectedTeam}
            />
            {selectedTeam === "new_team" && (
              <Input
                placeholder="Neuer Teamname"
                placeholderTextColor="#999"
                value={newTeamName}
                onChangeText={setNewTeamName}
              />
            )}
            <Input
              placeholder="Name des Hundes"
              placeholderTextColor="#999"
              value={dogName}
              onChangeText={setDogName}
            />
            <Button title="Hund hinzufügen" onPress={handleAddDog} />
          </Card>

          {groupedDogs.length > 0 ? (
            groupedDogs.map((group) => (
              <Card key={group.title} title={group.title}>
                {group.data.map((dog) => (
                  <ListItem key={dog.name}>
                    <DogName>{dog.name}</DogName>
                  </ListItem>
                ))}
              </Card>
            ))
          ) : (
            <Card title="Teams / Hunde">
              <CardText>Noch keine Hunde gemeldet.</CardText>
            </Card>
          )}
        </View>
      </ScrollContainer>
    </Wrapper>
  );
};

export default TeamScreen;
