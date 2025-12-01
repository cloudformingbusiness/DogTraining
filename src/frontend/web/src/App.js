import React, { useCallback, useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://192.168.4.1"; // ESP32-IP im Lichtschranke-API WLAN

function App() {
  // Hundeliste und Teams
  const [dogs, setDogs] = useState([]); // [{name, team}]
  const [teams, setTeams] = useState([]);
  const [newDog, setNewDog] = useState("");
  const [newDogTeam, setNewDogTeam] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [selectedDog, setSelectedDog] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(""); // Neu: Ausgewähltes Team

  // Messung
  const [status, setStatus] = useState("offline");
  const [lastTime, setLastTime] = useState(0.0);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState("team"); // 'team', 'messung', 'history'

  // Hamburger-Menü für mobile Navigation
  const [navOpen, setNavOpen] = useState(false);

  // Status vom ESP32 abfragen
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      const dogObj = dogs.find((d) => d.name === selectedDog);
      if (status === "timing" && data.state === "finished" && selectedDog) {
        setHistory((prev) => [
          {
            dog: selectedDog,
            team: dogObj ? dogObj.team : "",
            time: data.last_time,
          },
          ...prev.slice(0, 4),
        ]);
      }
      setStatus(data.state);
      setLastTime(data.last_time);
    } catch (error) {
      setStatus("offline");
    }
  }, [status, selectedDog, dogs]);

  useEffect(() => {
    const intervalId = setInterval(fetchStatus, 2000);
    return () => clearInterval(intervalId);
  }, [fetchStatus]);

  // Hund hinzufügen (mit Team)
  const handleAddDog = () => {
    if (newDog && newDogTeam && !dogs.some((d) => d.name === newDog)) {
      setDogs([...dogs, { name: newDog, team: newDogTeam }]);
      setNewDog("");
      setNewDogTeam("");
    }
  };

  // Team hinzufügen
  const handleAddTeam = () => {
    if (newTeam && !teams.includes(newTeam)) {
      setTeams([...teams, newTeam]);
      setNewTeam("");
    }
  };

  // Messung starten (nur für ausgewählten Hund)
  const handleStartMeasurement = async () => {
    if (!selectedDog) return;
    try {
      await fetch(`${API_BASE_URL}/start`);
    } catch (error) {
      setStatus("offline");
    }
  };

  // Messung zurücksetzen
  const handleResetMeasurement = async () => {
    try {
      await fetch(`${API_BASE_URL}/reset`);
      setLastTime(0.0);
      setStatus("idle");
    } catch (error) {
      setStatus("offline");
    }
  };

  // Historie löschen
  const handleClearHistory = () => setHistory([]);

  // Neue Funktion: Lichtschranke scharf stellen
  const handleArmLichtschranke = async () => {
    try {
      await fetch(`${API_BASE_URL}/arm`);
      // Optional: Status sofort auf 'timing' setzen, falls gewünscht
      // setStatus('timing');
    } catch (error) {
      setStatus("offline");
    }
  };

  // Button-Text
  const getButtonText = () => {
    if (!selectedDog) return "Hund auswählen";
    switch (status) {
      case "idle":
        return "Messung starten";
      case "timing":
        return "Messung läuft...";
      case "finished":
        return "Neue Messung starten";
      default:
        return "Offline";
    }
  };

  // Lokale Speicherung für Teams, Hunde und History
  useEffect(() => {
    // Initial aus localStorage laden
    const savedTeams = localStorage.getItem("teams");
    const savedDogs = localStorage.getItem("dogs");
    const savedHistory = localStorage.getItem("history");
    if (savedTeams) setTeams(JSON.parse(savedTeams));
    if (savedDogs) setDogs(JSON.parse(savedDogs));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    // Speichern bei Änderung
    localStorage.setItem("teams", JSON.stringify(teams));
  }, [teams]);
  useEffect(() => {
    localStorage.setItem("dogs", JSON.stringify(dogs));
  }, [dogs]);
  useEffect(() => {
    localStorage.setItem("history", JSON.stringify(history));
  }, [history]);

  // Teams aus Datei laden
  const handleImportTeams = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        // Unterstützt CSV und JSON
        const text = event.target.result;
        let importedTeams = [];
        if (file.name.endsWith(".json")) {
          importedTeams = JSON.parse(text);
        } else {
          importedTeams = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        }
        // Nur neue Teams hinzufügen
        setTeams((prev) => [
          ...prev,
          ...importedTeams.filter((t) => !prev.includes(t)),
        ]);
      } catch (err) {
        alert("Fehler beim Import: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Teams & Hunde aus CSV importieren
  const handleImportTeamsDogs = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        // CSV: Team;Hund
        const importedDogs = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [team, name] = line.split(";");
            return { name: name?.trim(), team: team?.trim() };
          })
          .filter((item) => item.name && item.team);
        const importedTeams = importedDogs.map((item) => item.team);
        // Teams ergänzen
        setTeams((prev) => [
          ...prev,
          ...importedTeams.filter((t) => !prev.includes(t)),
        ]);
        // Hunde ergänzen
        setDogs((prev) => [
          ...prev,
          ...importedDogs.filter(
            (d) => !prev.some((p) => p.name === d.name && p.team === d.team)
          ),
        ]);
      } catch (err) {
        alert("Fehler beim Import: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Dummy-Teamdatei herunterladen
  const handleDownloadTeamsTemplate = () => {
    const csv = "Team A\nTeam B\nTeam C";
    const json = JSON.stringify(["Team A", "Team B", "Team C"], null, 2);
    const blob = new Blob([csv], { type: "text/csv" });
    const blobJson = new Blob([json], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const urlJson = window.URL.createObjectURL(blobJson);
    // Download-Buttons anzeigen
    const a = document.createElement("a");
    a.href = url;
    a.download = "teams.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };
  const handleDownloadTeamsJsonTemplate = () => {
    const json = JSON.stringify(["Team A", "Team B", "Team C"], null, 2);
    const blobJson = new Blob([json], { type: "application/json" });
    const urlJson = window.URL.createObjectURL(blobJson);
    const a = document.createElement("a");
    a.href = urlJson;
    a.download = "teams.json";
    a.click();
    window.URL.revokeObjectURL(urlJson);
  };

  // Dummydatei mit Teams und Hunden herunterladen
  const handleDownloadTeamsDogsTemplate = () => {
    // CSV: Team;Hund
    const csv = "Team A;Bello\nTeam A;Rex\nTeam B;Luna\nTeam C;Max";
    // JSON: [{team, name}]
    const json = JSON.stringify(
      [
        { team: "Team A", name: "Bello" },
        { team: "Team A", name: "Rex" },
        { team: "Team B", name: "Luna" },
        { team: "Team C", name: "Max" },
      ],
      null,
      2
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const blobJson = new Blob([json], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const urlJson = window.URL.createObjectURL(blobJson);
    // Download-Buttons anzeigen
    const a = document.createElement("a");
    a.href = url;
    a.download = "teams_hunde.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    const aJson = document.createElement("a");
    aJson.href = urlJson;
    aJson.download = "teams_hunde.json";
    aJson.click();
    window.URL.revokeObjectURL(urlJson);
  };

  return (
    <div className="App">
      <header className="App-header">
        {/* Vereinslogo und App-Name oben */}
        <div className="app-header">
          <img src="/logo.png" alt="Vereinslogo" className="app-logo" />
          <div className="app-title-group">
            <h1 className="app-title">Dog Training</h1>
            <span className="app-verein">
              Hundesportverein Musterstadt e.V.
            </span>
          </div>
          <button className="hamburger" onClick={() => setNavOpen(!navOpen)}>
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>
        <nav className={`main-nav${navOpen ? " nav-open" : ""}`}>
          <button
            className={page === "team" ? "nav-active" : ""}
            onClick={() => {
              setPage("team");
              setNavOpen(false);
            }}
          >
            Teams & Hunde
          </button>
          <button
            className={page === "messung" ? "nav-active" : ""}
            onClick={() => {
              setPage("messung");
              setNavOpen(false);
            }}
          >
            Messung
          </button>
          <button
            className={page === "history" ? "nav-active" : ""}
            onClick={() => {
              setPage("history");
              setNavOpen(false);
            }}
          >
            Historie
          </button>
          <button
            className={page === "auswertung" ? "nav-active" : ""}
            onClick={() => {
              setPage("auswertung");
              setNavOpen(false);
            }}
          >
            Teilauswertung
          </button>
        </nav>
      </header>
      <main className="App-main">
        {page === "team" && (
          <>
            <div className="card control-card">
              <h2>Hunde & Teams</h2>
              <div className="input-group">
                <input
                  type="text"
                  value={newDog}
                  onChange={(e) => setNewDog(e.target.value)}
                  placeholder="Hundename"
                />
                <select
                  value={newDogTeam}
                  onChange={(e) => setNewDogTeam(e.target.value)}
                >
                  <option value="">Team wählen</option>
                  {teams.map((team, idx) => (
                    <option key={idx} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddDog}
                  disabled={!newDog || !newDogTeam}
                >
                  Hund hinzufügen
                </button>
              </div>
              <div className="input-group">
                <input
                  type="text"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  placeholder="Teamname"
                />
                <button onClick={handleAddTeam}>Team hinzufügen</button>
              </div>
              <div className="input-group">
                <input
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={handleImportTeams}
                  style={{ marginTop: 8 }}
                />
                <label style={{ fontSize: "0.95rem", color: "#888" }}>
                  Teams aus Datei laden (CSV/JSON)
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleImportTeamsDogs}
                  style={{ marginTop: 8 }}
                />
                <label style={{ fontSize: "0.95rem", color: "#888" }}>
                  Teams & Hunde aus CSV laden (Team;Hund)
                </label>
                <button
                  type="button"
                  onClick={handleDownloadTeamsDogsTemplate}
                  style={{ marginLeft: 8 }}
                >
                  Teams & Hunde CSV-Beispiel herunterladen
                </button>
              </div>
            </div>
            <div className="card team-card">
              <h2>Team-Übersicht</h2>
              {teams.length > 0 ? (
                <ul className="team-list">
                  {teams.map((team, idx) => (
                    <li key={idx}>
                      <b>{team}</b>
                      {dogs.filter((dog) => dog.team === team).length > 0 && (
                        <span>
                          {" "}
                          {dogs
                            .filter((dog) => dog.team === team)
                            .map((dog) => dog.name)
                            .join(", ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-history">Noch keine Teams angelegt.</p>
              )}
            </div>
          </>
        )}
        {page === "messung" && (
          <div className="card control-card">
            <h2>Steuerung</h2>
            <div className="select-group" style={{ marginBottom: "18px" }}>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">Team auswählen</option>
                {teams.map((team, idx) => (
                  <option key={idx} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
            <div className="select-group">
              <select
                value={selectedDog}
                onChange={(e) => setSelectedDog(e.target.value)}
                disabled={!selectedTeam}
              >
                <option value="">Hund aus Team auswählen</option>
                {dogs
                  .filter((dog) => dog.team === selectedTeam)
                  .map((dog, idx) => (
                    <option key={idx} value={dog.name}>
                      {dog.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="status-info">
              <span
                className={status === "offline" ? "api-offline" : "api-online"}
              >
                API-Server: {status === "offline" ? "OFFLINE" : "AKTIV"}
              </span>
              <span
                className={status === "timing" ? "armed-on" : "armed-off"}
                style={{ marginLeft: "18px" }}
              >
                Lichtschranke: {status === "timing" ? "SCHARF" : "NICHT SCHARF"}
              </span>
            </div>
            <div className={`status-display status-${status}`}>
              Status: <span>{status.toUpperCase()}</span>
            </div>
            <div className="result-display">
              Letzte Messung: <span>{lastTime.toFixed(2)} s</span>
            </div>
            <div className="button-group">
              <button
                onClick={handleStartMeasurement}
                disabled={
                  status === "timing" ||
                  status === "offline" ||
                  !selectedDog ||
                  !selectedTeam
                }
                className="button-start"
              >
                {getButtonText()}
              </button>
              <button
                onClick={handleArmLichtschranke}
                disabled={
                  status !== "idle" ||
                  status === "offline" ||
                  !selectedDog ||
                  !selectedTeam
                }
                className="button-arm"
              >
                Lichtschranke scharf stellen
              </button>
              <button
                onClick={handleResetMeasurement}
                disabled={status === "offline"}
                className="button-reset"
              >
                Reset
              </button>
            </div>
          </div>
        )}
        {page === "history" && (
          <div className="card history-card">
            <div className="history-header">
              <h2>Mess-Historie</h2>
              <button
                onClick={handleClearHistory}
                className="button-clear-history"
              >
                Löschen
              </button>
            </div>
            {history.length > 0 ? (
              <ul>
                {history.map((entry, idx) => (
                  <li key={idx}>
                    <b>{entry.dog}</b>
                    {entry.team ? ` (${entry.team})` : ""}:{" "}
                    {entry.time.toFixed(2)} s
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-history">Noch keine Messungen aufgezeichnet.</p>
            )}
          </div>
        )}
        {page === "auswertung" && (
          <div className="card auswertung-card">
            <h2>Teilauswertung</h2>
            {teams.length > 0 ? (
              <ul className="auswertung-list">
                {teams.map((team, idx) => {
                  const teamDogs = dogs.filter((dog) => dog.team === team);
                  const teamResults = history.filter(
                    (entry) => entry.team === team
                  );
                  const avg =
                    teamResults.length > 0
                      ? (
                          teamResults.reduce((sum, e) => sum + e.time, 0) /
                          teamResults.length
                        ).toFixed(2)
                      : null;
                  return (
                    <li key={idx}>
                      <b>{team}</b>: {teamDogs.length} Hunde,{" "}
                      {teamResults.length} Messungen
                      {avg && <span> | Ø Zeit: {avg} s</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="no-history">Noch keine Teams angelegt.</p>
            )}
          </div>
        )}
      </main>
      <footer className="App-footer">
        <p>&copy; 2025 DogTraining App</p>
      </footer>
    </div>
  );
}

export default App;

/* CSS für Header, Logo und Titel
In App.css ergänzen:
.app-header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 0 10px 0;
  border-bottom: 2px solid #e3f2fd;
  margin-bottom: 18px;
}
.app-logo {
  height: 54px;
  width: 54px;
  object-fit: contain;
  border-radius: 8px;
  background: #fff;
  border: 1.5px solid #e3f2fd;
}
.app-title-group {
  display: flex;
  flex-direction: column;
}
.app-title {
  font-size: 2rem;
  color: var(--primary-color);
  margin: 0;
}
.app-verein {
  font-size: 1.1rem;
  color: var(--text-light-color);
}
*/
