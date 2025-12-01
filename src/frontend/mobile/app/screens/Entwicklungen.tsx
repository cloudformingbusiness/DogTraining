import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Alert, Platform, View } from "react-native";
import styled from "styled-components/native";
import {
  Button,
  Card,
  CardText,
  Input,
  Select,
  Switch,
  Text,
} from "../components";
// Styled Components für Layout
const Wrapper = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background || "#fff"};
`;

const Header = styled.View`
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

interface WebhookProfile {
  name: string;
  baseUrl: string;
  apiKey: string;
  authToken: string;
  description?: string;
  isCustom?: boolean;
}

type StatusType = "info" | "error" | "success";

interface Status {
  message: string;
  type: StatusType;
}

const getStatusStyle = (type: StatusType) => {
  switch (type) {
    case "error":
      return {
        backgroundColor: "#FFEBEE",
        borderColor: "#E57373",
        color: "#C62828",
      };
    case "success":
      return {
        backgroundColor: "#E8F5E9",
        borderColor: "#81C784",
        color: "#2E7D32",
      };
    default:
      return {
        backgroundColor: "#fff",
        borderColor: "#e0e0e0",
        color: "#555",
      };
  }
};

const EntwicklungenScreen = () => {
  const [status, setStatus] = useState<Status>({
    message: "Bereit.",
    type: "info",
  });
  // STATE & INITIALISIERUNG
  // DEV/PROD-Modus State
  const [isDevMode, setIsDevMode] = useState(false); // Standard: PROD-Modus
  const [initialized, setInitialized] = useState(false);
  const [dataStorageMode, setDataStorageMode] = useState("local");
  const [isDatabaseConfigExpanded, setIsDatabaseConfigExpanded] =
    useState(false);
  const [databaseHost, setDatabaseHost] = useState("");
  const [databasePort, setDatabasePort] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [databaseUser, setDatabaseUser] = useState("");
  const [databasePassword, setDatabasePassword] = useState("");
  const [databaseApiKey, setDatabaseApiKey] = useState("");
  const [isAddProfileMode, setIsAddProfileMode] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileUrl, setNewProfileUrl] = useState("");
  const [newProfileApiKey, setNewProfileApiKey] = useState("");
  const [newProfileToken, setNewProfileToken] = useState("");
  const [newProfileDescription, setNewProfileDescription] = useState("");
  const [selectedWebhookProfile, setSelectedWebhookProfile] =
    useState("production");
  const [customProfiles, setCustomProfiles] = useState<{
    [key: string]: WebhookProfile;
  }>({});
  const [webhookProfiles, setWebhookProfiles] = useState<{
    [key: string]: WebhookProfile;
  }>({});
  const [allProfiles, setAllProfiles] = useState<{
    [key: string]: WebhookProfile;
  }>({});
  const [currentProfile, setCurrentProfile] = useState<WebhookProfile>({
    name: "Production",
    baseUrl: "",
    apiKey: "",
    authToken: "",
    description: "",
  });
  const [editableBaseUrl, setEditableBaseUrl] = useState("");
  const [editableApiKey, setEditableApiKey] = useState("");
  const [editableAuthToken, setEditableAuthToken] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // TODO DEV/PROD-Modus und weitere Settings aus Storage lesen (nur einmal beim Mount)
  useEffect(() => {
    // Initialisiere DEV/PROD-Modus und lade Settings aus Storage
    (async () => {
      let val;
      if (Platform.OS === "web") {
        val = window.localStorage.getItem("devLoginEnabled");
        if (val === null) {
          window.localStorage.setItem("devLoginEnabled", "true");
          val = "true";
          console.log(
            "[Entwicklungen] devLoginEnabled (web) nicht gefunden, auf true gesetzt"
          );
        }
      } else {
        val = await AsyncStorage.getItem("devLoginEnabled");
        if (val === null) {
          await AsyncStorage.setItem("devLoginEnabled", "true");
          val = "true";
          console.log(
            "[Entwicklungen] devLoginEnabled (native) nicht gefunden, auf true gesetzt"
          );
        }
      }
      setIsDevMode(val === "true");
      setInitialized(true);

      // Weitere Settings
      const storedMode = await AsyncStorage.getItem("dataStorageMode");
      if (storedMode === "database" || storedMode === "local") {
        setDataStorageMode(storedMode);
      }
      // ...existing code für weitere Settings...
    })();
  }, []);

  // Hilfsfunktion zum Speichern von Custom Profiles
  const saveCustomProfiles = async (profiles: {
    [key: string]: WebhookProfile;
  }) => {
    await AsyncStorage.setItem(
      "customWebhookProfiles",
      JSON.stringify(profiles)
    );
    setCustomProfiles(profiles);
    setAllProfiles({ ...webhookProfiles, ...profiles });
  };

  // Callback für Webhook-Profil-Auswahl
  const handleProfileChange = async (profileKey: string) => {
    setSelectedWebhookProfile(profileKey);
    await AsyncStorage.setItem("selectedWebhookProfile", profileKey);
    const profile = allProfiles[profileKey];
    if (profile) {
      setCurrentProfile(profile);
      setEditableBaseUrl(profile.baseUrl);
      setEditableApiKey(profile.apiKey);
      setEditableAuthToken(profile.authToken);
    }
  };

  // Profil löschen
  const deleteProfile = async (profileKey: string) => {
    const updatedProfiles = { ...customProfiles };
    delete updatedProfiles[profileKey];
    await saveCustomProfiles(updatedProfiles);
    setIsAddProfileMode(false);
    setSelectedWebhookProfile("production");
    await AsyncStorage.setItem("selectedWebhookProfile", "production");
    // StatusMessage entfernt
    handleProfileChange("production");
  };
  // ...existing code...
  const showCurrentConfig = () => {
    Alert.alert(
      "Aktuelle Webhook-Konfiguration",
      `Base URL: ${editableBaseUrl}\nAPI-Key: ${
        editableApiKey ? "***" : "N/A"
      }\nAuth-Token: ${editableAuthToken ? "***" : "N/A"}`
    );
  };

  const startEditMode = () => setIsEditMode(true);
  const cancelEdit = () => setIsEditMode(false);

  const saveEditedConfig = async () => {
    const config = {
      baseUrl: editableBaseUrl,
      apiKey: editableApiKey,
      authToken: editableAuthToken,
    };
    const profileKey = selectedWebhookProfile;
    const profileToSave = { ...allProfiles[profileKey], ...config };
    try {
      if (customProfiles[profileKey]) {
        const updatedCustomProfiles = {
          ...customProfiles,
          [profileKey]: profileToSave,
        };
        await saveCustomProfiles(updatedCustomProfiles);
      } else {
        await AsyncStorage.setItem(
          `webhook_profile_${profileKey}`,
          JSON.stringify(profileToSave)
        );
      }

      setCurrentProfile(profileToSave);
      setAllProfiles({ ...allProfiles, [profileKey]: profileToSave });
      setIsEditMode(false);
      // StatusMessage entfernt
    } catch (error) {
      // StatusMessage entfernt
    }
  };

  const handleStorageModeChange = async (mode: "local" | "database") => {
    setDataStorageMode(mode);
    await AsyncStorage.setItem("dataStorageMode", mode);
    // StatusMessage entfernt
  };

  const getDatabaseUrl = () => {
    if (!databaseHost) return "";
    let protocol = "https";
    // Immer http für localhost oder 127.0.0.1
    if (
      typeof databaseHost === "string" &&
      (databaseHost === "localhost" || databaseHost === "127.0.0.1")
    ) {
      protocol = "http";
    } else if (isDevMode) {
      protocol = "http";
    }
    const apiPort = databasePort || (protocol === "http" ? "3000" : "5433");
    return `${protocol}://${databaseHost}:${apiPort}`;
  };

  const saveDatabaseConfigWithAlert = async () => {
    const config = {
      host: databaseHost,
      port: databasePort,
      name: databaseName,
      user: databaseUser,
      password: databasePassword,
      apiKey: databaseApiKey,
    };
    try {
      await AsyncStorage.setItem("databaseConfig", JSON.stringify(config));
      // StatusMessage entfernt
    } catch (error) {
      // StatusMessage entfernt
    }
  };

  const testDatabaseConnection = async () => {
    // API-Server-URL abhängig vom Modus
    let apiServerUrl = isDevMode
      ? "http://localhost:3000"
      : "https://api.cloudforming.de";
    const testUrl = `${apiServerUrl}/api/test-db-connection`;
    setStatus({ message: "Teste Datenbankverbindung...", type: "info" });
    try {
      const response = await fetch(testUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": databaseApiKey,
        },
        body: JSON.stringify({
          host: databaseHost,
          port: databasePort,
          name: databaseName,
          user: databaseUser,
          password: databasePassword,
        }),
      });
      let result = null;
      try {
        result = await response.json();
        if (response.ok) {
          setStatus({
            message: "✅ Datenbankverbindung erfolgreich!",
            type: "success",
          });
        } else {
          setStatus({
            message: `❌ Fehler: ${result.error || "Unbekannter Fehler"}`,
            type: "error",
          });
        }
      } catch (jsonError) {
        setStatus({
          message: "❌ Fehler beim Verarbeiten der Server-Antwort.",
          type: "error",
        });
        result = null;
      }
    } catch (error) {
      setStatus({
        message: "❌ Fehler bei der Verbindung zum API-Server.",
        type: "error",
      });
    }
  };

  const addNewProfile = async () => {
    if (!newProfileName || !newProfileUrl) {
      // StatusMessage entfernt
      return;
    }
    const newKey = newProfileName.toLowerCase().replace(/\s+/g, "_");
    if (allProfiles[newKey]) {
      // StatusMessage entfernt
      return;
    }
    const newProfile = {
      name: newProfileName,
      baseUrl: newProfileUrl,
      apiKey: newProfileApiKey,
      authToken: newProfileToken,
      description: newProfileDescription,
      isCustom: true,
    };
    const updatedProfiles = { ...customProfiles, [newKey]: newProfile };
    await saveCustomProfiles(updatedProfiles);
    setIsAddProfileMode(false);
    setNewProfileName("");
    setNewProfileUrl("");
    setNewProfileApiKey("");
    setNewProfileToken("");
    setNewProfileDescription("");
    await handleProfileChange(newKey);
    // StatusMessage entfernt
  };

  //TODO DEV/PROD-Modus speichern (nur bei Umschalten)
  const handleDevModeSwitch = (value: boolean) => {
    setIsDevMode(value);
    if (Platform.OS === "web") {
      window.localStorage.setItem("devLoginEnabled", value ? "true" : "false");
      console.log(
        "[Entwicklungen] devLoginEnabled gesetzt (web):",
        value ? "true" : "false"
      );
    } else {
      AsyncStorage.setItem("devLoginEnabled", value ? "true" : "false");
      console.log(
        "[Entwicklungen] devLoginEnabled gesetzt (native):",
        value ? "true" : "false"
      );
    }

    // Datenbank-Einstellungen abhängig vom Modus setzen
    if (value) {
      // DEV-MODE
      setDatabaseHost("api.cloudforming.de");
      setDatabasePort("5433");
      setDatabaseName("baulogpro");
      setDatabaseUser("postgres");
      setDatabasePassword(
        "963FoxsMD3kZJRXxXoFINT86PzCF886nRVVjoyWiycGgfV1BipJhUkrKYlnAp3IE"
      );
    } else {
      // PROD-MODE
      setDatabaseHost("api.cloudforming.de");
      setDatabasePort("5433");
      setDatabaseName("baulogpro");
      setDatabaseUser("produser");
      setDatabasePassword("");
    }
  };

  return (
    <Wrapper>
      <ScrollContainer
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Header */}
        <Header>
          <HeaderTitle>
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <HeaderIcon>🛠️</HeaderIcon>
              <Text
                variant="h1"
                numberOfLines={2}
                style={{ flexShrink: 1, flexWrap: "wrap", textAlign: "left" }}
              >
                Entwicklung & Info
              </Text>
            </View>
          </HeaderTitle>
          <CardText style={{ marginTop: 8, opacity: 0.8, textAlign: "left" }}>
            Entwickler-Einstellungen und technische Informationen
          </CardText>
        </Header>

        {/* Umschalter für DEV-/PROD-Mode ganz oben */}
        <Card title="⚡ App-Modus wählen">
          <CardText>
            <Text style={{ fontSize: 15 }}>
              Wähle, ob die App im Entwicklungsmodus (DEV) oder Produktionsmodus
              (PROD) läuft.
            </Text>
          </CardText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontWeight: "bold" }}>
              Modus: {isDevMode ? "DEV-MODE" : "PROD-MODE"}
            </Text>
            <Switch
              value={isDevMode}
              onValueChange={handleDevModeSwitch}
              disabled={!initialized}
            />
          </View>
        </Card>
        {/* Datenspeicherung */}
        <Card title="💾 Datenspeicherung">
          <CardText style={{ marginBottom: 16 }}>
            gespeichert werden sollen.
          </CardText>
          <Select
            label="Speichermodus wählen"
            selectedValue={dataStorageMode}
            onSelect={(value) =>
              handleStorageModeChange(value as "local" | "database")
            }
            options={[
              { label: "📱 Lokal (Gerät)", value: "local" },
              { label: "🗄️ Externe Datenbank", value: "database" },
            ]}
          />
          <View
            style={{
              marginTop: 12,
              padding: 12,
              backgroundColor:
                dataStorageMode === "local" ? "#E8F5E9" : "#E3F2FD",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <CardText style={{ fontSize: 13 }}>
              {dataStorageMode === "local" ? (
                <>
                  <Text style={{ fontWeight: "600" }}>
                    📱 Lokaler Speicher aktiv
                  </Text>
                  {"\n"}
                  {"\n"}✅ Alle Projektdaten werden sicher auf Ihrem Gerät
                  gespeichert
                  {"\n"}✅ Funktioniert auch ohne Internetverbindung
                  {"\n"}✅ Schneller Zugriff auf Ihre Daten
                  {"\n"}⚠️ Daten sind nur auf diesem Gerät verfügbar
                </>
              ) : (
                <>
                  <Text style={{ fontWeight: "600" }}>
                    🗄️ Datenbank-Speicher aktiv
                  </Text>
                  {"\n"}
                  {"\n"}✅ Daten sind auf allen Geräten verfügbar
                  {"\n"}✅ Automatische Synchronisation
                  {"\n"}✅ Zentrale Datensicherung
                  {"\n"}⚠️ Benötigt aktive Internetverbindung
                </>
              )}
            </CardText>
          </View>
          <Button
            variant="secondary"
            onPress={() =>
              setIsDatabaseConfigExpanded(!isDatabaseConfigExpanded)
            }
          >
            <Text>
              {isDatabaseConfigExpanded
                ? "🗄️ ▼ Datenbank-Einstellungen (ausblenden)"
                : "🗄️ ▶ Datenbank-Einstellungen (konfigurieren)"}
            </Text>
          </Button>
          {isDatabaseConfigExpanded && (
            <View style={{ marginTop: 16, marginBottom: 8, gap: 8 }}>
              <Select
                label="Modus wählen"
                selectedValue={isDevMode ? "dev" : "prod"}
                onSelect={async (value) => {
                  if (value === "dev") {
                    setIsDevMode(true);
                    // Werte aus .env
                    setDatabaseHost("api.cloudforming.de");
                    setDatabasePort("5433");
                    setDatabaseName("baulogpro");
                    setDatabaseUser("postgres");
                    setDatabasePassword(
                      "963FoxsMD3kZJRXxXoFINT86PzCF886nRVVjoyWiycGgfV1BipJhUkrKYlnAp3IE"
                    );
                    await AsyncStorage.setItem(
                      "databaseConfig",
                      JSON.stringify({
                        host: "api.cloudforming.de",
                        port: "5433",
                        name: "baulogpro",
                        user: "postgres",
                        password:
                          "963FoxsMD3kZJRXxXoFINT86PzCF886nRVVjoyWiycGgfV1BipJhUkrKYlnAp3IE",
                        apiKey: databaseApiKey,
                        protocol: "http",
                      })
                    );
                    // Starte lokalen Server
                    try {
                      await fetch("http://localhost:3000/api/start-server");
                    } catch (err) {}
                  } else if (value === "prod") {
                    setIsDevMode(false);
                    setDatabaseHost("api.cloudforming.de");
                    setDatabasePort("5433");
                    setDatabaseName("baulogpro");
                    setDatabaseUser("produser");
                    setDatabasePassword("");
                    await AsyncStorage.setItem(
                      "databaseConfig",
                      JSON.stringify({
                        host: "api.cloudforming.de",
                        port: "5433",
                        name: "baulogpro",
                        user: "produser",
                        password: "",
                        apiKey: databaseApiKey,
                        protocol: "https",
                      })
                    );
                  }
                }}
                options={[
                  { label: "Produktiv", value: "prod" },
                  { label: "Lokal/Entwicklung", value: "dev" },
                ]}
              />
              <Input
                label="Host"
                placeholder="z.B. api.cloudforming.de"
                value={databaseHost}
                onChangeText={setDatabaseHost}
              />
              <Input
                label="Port"
                placeholder="5433"
                value={databasePort}
                onChangeText={setDatabasePort}
                keyboardType="numeric"
              />
              <Input
                label="Datenbankname"
                placeholder="baulogpro"
                value={databaseName}
                onChangeText={setDatabaseName}
              />
              <Input
                label="Benutzer"
                placeholder="postgres"
                value={databaseUser}
                onChangeText={setDatabaseUser}
              />
              <Input
                label="Passwort"
                placeholder="••••••••"
                value={databasePassword}
                onChangeText={setDatabasePassword}
                secureTextEntry
              />
              <Input
                label="API-Key (optional)"
                placeholder="API-Key"
                value={databaseApiKey}
                onChangeText={setDatabaseApiKey}
              />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Button variant="primary" onPress={saveDatabaseConfigWithAlert}>
                  <Text>💾 Einstellungen speichern</Text>
                </Button>
                <Button variant="secondary" onPress={testDatabaseConnection}>
                  <Text>🔌 Verbindung testen</Text>
                </Button>
              </View>
            </View>
          )}
        </Card>
        {/* Webhook Konfiguration */}
        <Card title="🔐 Webhook Konfiguration">
          <CardText>
            Zentrale Verwaltung der N8N Webhook-Zugangsdaten für alle
            App-Funktionen.
          </CardText>

          <Select
            label="🔧 Webhook-Profil auswählen"
            options={Object.entries(allProfiles).map(([key, profile]) => ({
              label: profile.name,
              value: key,
            }))}
            selectedValue={selectedWebhookProfile}
            onSelect={handleProfileChange}
          />

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
              marginTop: 12,
            }}
          >
            <Button
              variant="secondary"
              onPress={() => setIsAddProfileMode(!isAddProfileMode)}
            >
              <Text>
                {isAddProfileMode ? "❌ Abbrechen" : "➕ Neues Profil"}
              </Text>
            </Button>
            {customProfiles[selectedWebhookProfile] && (
              <Button
                variant="secondary"
                onPress={() => deleteProfile(selectedWebhookProfile)}
              >
                <Text>🗑️ Profil löschen</Text>
              </Button>
            )}
          </View>

          {isAddProfileMode ? (
            <Card title="➕ Neues Webhook-Profil erstellen">
              <Input
                label="🏷️ Profilname"
                placeholder="z.B. Mein Test-Webhook"
                value={newProfileName}
                onChangeText={setNewProfileName}
              />
              <Input
                label="🌐 URL"
                placeholder="https://n8n.example.com/webhook/..."
                value={newProfileUrl}
                onChangeText={setNewProfileUrl}
              />
              <Input
                label="🔑 API-Key (optional)"
                value={newProfileApiKey}
                onChangeText={setNewProfileApiKey}
              />
              <Input
                label="🔒 Token (optional)"
                value={newProfileToken}
                onChangeText={setNewProfileToken}
              />
              <Input
                label="📝 Beschreibung (optional)"
                value={newProfileDescription}
                onChangeText={setNewProfileDescription}
              />
              <Button variant="primary" onPress={addNewProfile}>
                <Text>💾 Profil speichern</Text>
              </Button>
            </Card>
          ) : (
            <Card title={`Aktives Profil: ${currentProfile.name}`}>
              <Text style={{ fontSize: 13, marginBottom: 4 }}>
                🌐 URL: {editableBaseUrl || "❌ Nicht gesetzt"}
              </Text>
              <Text style={{ fontSize: 13, marginBottom: 4 }}>
                🔑 API-Key:{" "}
                {editableApiKey ? "***********" : "❌ Nicht gesetzt"}
              </Text>
              <Text style={{ fontSize: 13, marginBottom: 12 }}>
                🎫 Token:{" "}
                {editableAuthToken ? "***********" : "❌ Nicht gesetzt"}
              </Text>

              {!isEditMode ? (
                <View style={{ gap: 8 }}>
                  <Button variant="primary" onPress={showCurrentConfig}>
                    <Text>🔍 Konfiguration anzeigen</Text>
                  </Button>
                  <Button variant="secondary" onPress={startEditMode}>
                    <Text>✏️ Werte bearbeiten</Text>
                  </Button>
                </View>
              ) : (
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      marginBottom: 8,
                      fontWeight: "600",
                    }}
                  >
                    ✏️ Werte bearbeiten:
                  </Text>
                  <Input
                    label="🌐 Webhook Base URL"
                    placeholder="https://n8n.cloudforming.de/webhook"
                    value={editableBaseUrl}
                    onChangeText={setEditableBaseUrl}
                  />
                  <Input
                    label="🔑 API Key"
                    placeholder="Ihr N8N API Key..."
                    value={editableApiKey}
                    onChangeText={setEditableApiKey}
                  />
                  <Input
                    label="🎫 Auth Token"
                    placeholder="Bearer Token..."
                    value={editableAuthToken}
                    onChangeText={setEditableAuthToken}
                  />
                  <View style={{ gap: 8, marginTop: 8 }}>
                    <Button variant="primary" onPress={saveEditedConfig}>
                      <Text>💾 Änderungen speichern</Text>
                    </Button>
                    <Button variant="secondary" onPress={cancelEdit}>
                      <Text>❌ Abbrechen</Text>
                    </Button>
                  </View>
                </View>
              )}
            </Card>
          )}
        </Card>
      </ScrollContainer>
      {/* Statusbox am unteren Rand */}
      <View
        style={{
          padding: 16,
          alignItems: "center",
          backgroundColor: "#f7f7f7",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 600,
            minHeight: 96,
            backgroundColor: getStatusStyle(status.type).backgroundColor,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: getStatusStyle(status.type).borderColor,
            padding: 16,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: getStatusStyle(status.type).color,
              textAlign: "center",
              fontSize: 16,
            }}
          >
            <Text style={{ fontWeight: "bold" }}>Status:</Text> {status.message}
          </Text>
        </View>
      </View>
    </Wrapper>
  );
};

export default EntwicklungenScreen;
