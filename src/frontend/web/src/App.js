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
  const [timerValue, setTimerValue] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

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
    // CSV: Team;Hund (gruppiert, 5 Teams je 5 Hunde)
    const csv = [
      "Team 1;Bello",
      "Team 1;Rex",
      "Team 1;Luna",
      "Team 1;Max",
      "Team 1;Rocky",
      "",
      "Team 2;Sammy",
      "Team 2;Milo",
      "Team 2;Nala",
      "Team 2;Ben",
      "Team 2;Sally",
      "",
      "Team 3;Lucky",
      "Team 3;Emma",
      "Team 3;Bruno",
      "Team 3;Amy",
      "Team 3;Charly",
      "",
      "Team 4;Oscar",
      "Team 4;Kira",
      "Team 4;Leo",
      "Team 4;Maja",
      "Team 4;Teddy",
      "",
      "Team 5;Lenny",
      "Team 5;Paula",
      "Team 5;Simba",
      "Team 5;Frieda",
      "Team 5;Balu",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teams_hunde.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Teams & Hunde als CSV exportieren
  const handleExportTeamsDogsCSV = () => {
    if (!dogs || dogs.length === 0) {
      alert("Keine Hunde zum Exportieren vorhanden.");
      return;
    }
    // Gruppiert nach Team, Format: Team;Hund
    const grouped = dogs
      .sort((a, b) => a.team.localeCompare(b.team))
      .map((dog) => `${dog.team};${dog.name}`)
      .join("\n");
    const blob = new Blob([grouped], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teams_hunde_export.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Timer starten
  const startTimer = () => {
    setTimerRunning(true);
    setTimerValue(0);
    // Messung starten
    handleStartMeasurement();
  };

  // Timer stoppen
  const stopTimer = () => {
    setTimerRunning(false);
    // Status aktualisieren (z.B. auf 'finished' setzen)
    setStatus("finished");
  };

  // Timer zurücksetzen
  const resetTimer = () => {
    setTimerRunning(false);
    setTimerValue(0);
    // Messung zurücksetzen
    handleResetMeasurement();
  };

  // Timer-Logik für digitale Stoppuhr
  useEffect(() => {
    let intervalId;
    if (timerRunning && status === "timing") {
      intervalId = setInterval(() => {
        setTimerValue((prev) => prev + 10);
      }, 10);
    }
    // Timer stoppen, wenn Lichtschranke fertig
    if (status === "finished" && timerRunning) {
      setTimerRunning(false);
    }
    return () => clearInterval(intervalId);
  }, [timerRunning, status]);

  // Lichtschranke aktivieren/deaktivieren
  const [lichtschrankeAktiv, setLichtschrankeAktiv] = useState(false);
  const handleLichtschrankeToggle = async () => {
    if (!lichtschrankeAktiv) {
      await handleArmLichtschranke();
      setLichtschrankeAktiv(true);
    } else {
      await handleResetMeasurement();
      setLichtschrankeAktiv(false);
    }
  };

  // Farbschema-Logik
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.style.setProperty("--bg", "#f7f7fa");
      root.style.setProperty("--card", "#fff");
      root.style.setProperty("--text", "#222");
      root.style.setProperty("--primary", "#2196f3");
      root.style.setProperty("--accent", "#ff9800");
    } else if (theme === "dark") {
      root.style.setProperty("--bg", "#222");
      root.style.setProperty("--card", "#333");
      root.style.setProperty("--text", "#fff");
      root.style.setProperty("--primary", "#2196f3");
      root.style.setProperty("--accent", "#ff9800");
    } else if (theme === "orangeblue") {
      root.style.setProperty("--bg", "#fff8f0");
      root.style.setProperty("--card", "#fff");
      root.style.setProperty("--text", "#222");
      root.style.setProperty("--primary", "#ff9800");
      root.style.setProperty("--accent", "#2196f3");
    }
  }, [theme]);

  return (
    <div className={`App ${theme}`}>
      <header className="App-header">
        {/* Vereinslogo und App-Name oben */}
        <div className="app-header">
          <img src="/logo.svg" alt="Vereinslogo" className="app-logo" />
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
          <button
            className={page === "settings" ? "nav-active" : ""}
            onClick={() => {
              setPage("settings");
              setNavOpen(false);
            }}
          >
            Einstellungen
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <h2>Team-Übersicht (Gruppiert)</h2>
                <button
                  className="button-clear-teams"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Möchtest du wirklich alle Teams und Hunde unwiderruflich löschen?"
                      )
                    ) {
                      setTeams([]);
                      setDogs([]);
                    }
                  }}
                >
                  Teamliste löschen
                </button>
              </div>
              {dogs.length > 0 ? (
                <ul className="team-list-grouped">
                  {Array.from(new Set(dogs.map((d) => d.team)))
                    .sort()
                    .map((team, idx) => (
                      <li key={idx}>
                        <b>{team}</b>
                        <ul className="team-dog-list">
                          {dogs
                            .filter((dog) => dog.team === team)
                            .map((dog, i) => (
                              <li key={i} className="team-dog-item">
                                {dog.name}
                              </li>
                            ))}
                        </ul>
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
          <div
            className="card messung-card"
            style={{
              width: "100%",
              maxWidth: "600px",
              margin: "0 auto",
              padding: "2rem",
            }}
          >
            <h2>Messung</h2>
            <div
              className="messung-controls"
              style={{
                display: "flex",
                gap: "2rem",
                justifyContent: "center",
                marginBottom: "2rem",
              }}
            >
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  Team:
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "1.2rem",
                    padding: "0.7rem",
                    borderRadius: "0.7rem",
                    border: "1px solid #bbb",
                    background: "#f7f7fa",
                    marginBottom: "0.5rem",
                  }}
                >
                  <option value="">Team wählen</option>
                  {Array.from(new Set(dogs.map((d) => d.team)))
                    .sort()
                    .map((team, idx) => (
                      <option key={idx} value={team}>
                        {team}
                      </option>
                    ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  Hund:
                </label>
                <select
                  value={selectedDog}
                  onChange={(e) => setSelectedDog(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "1.2rem",
                    padding: "0.7rem",
                    borderRadius: "0.7rem",
                    border: "1px solid #bbb",
                    background: "#f7f7fa",
                    marginBottom: "0.5rem",
                  }}
                >
                  <option value="">Hund wählen</option>
                  {dogs
                    .filter((d) => d.team === selectedTeam)
                    .map((dog, idx) => (
                      <option key={idx} value={dog.name}>
                        {dog.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div style={{ textAlign: "center", margin: "1rem 0" }}>
              <button
                onClick={handleLichtschrankeToggle}
                style={{
                  background: lichtschrankeAktiv ? "#4caf50" : "#f44336",
                  color: "#fff",
                  padding: "0.7rem 2rem",
                  borderRadius: "0.7rem",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  boxShadow: "0 2px 8px #0002",
                }}
              >
                {lichtschrankeAktiv
                  ? "Lichtschranke deaktivieren"
                  : "Lichtschranke aktivieren"}
              </button>
            </div>
            <div
              className="messung-timer-block"
              style={{ margin: "2rem 0", textAlign: "center" }}
            >
              <div
                className="messung-timer"
                style={{
                  fontSize: "4rem",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                  background: "linear-gradient(90deg, #222 60%, #4caf50 100%)",
                  color: "#fff",
                  borderRadius: "2rem",
                  padding: "1.5rem 3rem",
                  display: "inline-block",
                  minWidth: "260px",
                  boxShadow: "0 4px 16px #0002",
                  border: "3px solid #4caf50",
                  marginBottom: "1.2rem",
                  textShadow: "0 2px 8px #0004",
                }}
              >
                {timerRunning
                  ? `${(timerValue / 1000).toFixed(2)} s`
                  : "0.00 s"}
              </div>
              <div
                className="messung-timer-buttons"
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  justifyContent: "center",
                  gap: "1.5rem",
                }}
              >
                <button
                  onClick={startTimer}
                  disabled={
                    timerRunning ||
                    !lichtschrankeAktiv ||
                    !selectedTeam ||
                    !selectedDog
                  }
                  style={{
                    background: "#2196f3",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    padding: "0.9rem 2.2rem",
                    borderRadius: "0.7rem",
                    border: "none",
                    boxShadow: "0 2px 8px #0002",
                    transition: "0.2s",
                  }}
                >
                  Start
                </button>
                <button
                  onClick={stopTimer}
                  disabled={!timerRunning}
                  style={{
                    background: "#ff9800",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    padding: "0.9rem 2.2rem",
                    borderRadius: "0.7rem",
                    border: "none",
                    boxShadow: "0 2px 8px #0002",
                    transition: "0.2s",
                  }}
                >
                  Stopp
                </button>
                <button
                  onClick={resetTimer}
                  disabled={timerRunning}
                  style={{
                    background: "#e0e0e0",
                    color: "#333",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    padding: "0.9rem 2.2rem",
                    borderRadius: "0.7rem",
                    border: "none",
                    boxShadow: "0 2px 8px #0001",
                    transition: "0.2s",
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    if (selectedTeam && selectedDog) {
                      setHistory((prev) => [
                        {
                          dog: selectedDog,
                          team: selectedTeam,
                          time: 0,
                          disq: true,
                          date: new Date().toISOString(),
                        },
                        ...prev,
                      ]);
                      setTimerRunning(false);
                      setTimerValue(0);
                    }
                  }}
                  disabled={timerRunning || !selectedTeam || !selectedDog}
                  style={{
                    background: "#f44336",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "1.2rem",
                    padding: "0.9rem 2.2rem",
                    borderRadius: "0.7rem",
                    border: "none",
                    boxShadow: "0 2px 8px #0002",
                    transition: "0.2s",
                  }}
                >
                  Disqualifikation
                </button>
              </div>
            </div>
            <div
              className="messung-history"
              style={{
                marginTop: "2rem",
                background: "#f7f7fa",
                borderRadius: "1rem",
                boxShadow: "0 2px 8px #0001",
                padding: "1.5rem",
              }}
            >
              <h3
                style={{
                  marginBottom: "1rem",
                  fontSize: "1.3rem",
                  color: "#333",
                  letterSpacing: "1px",
                }}
              >
                Letzte Messungen
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {history
                  .filter(
                    (h) => h.team === selectedTeam && h.dog === selectedDog
                  )
                  .slice(-5)
                  .reverse()
                  .map((entry, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "#fff",
                        borderRadius: "0.5rem",
                        boxShadow: "0 1px 4px #0001",
                        padding: "0.75rem 1.2rem",
                        marginBottom: "0.7rem",
                        fontSize: "1.1rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "bold",
                          color: entry.disq ? "#f44336" : "#222",
                        }}
                      >
                        {entry.disq
                          ? "Disqualifiziert"
                          : `${entry.time.toFixed(2)} s`}
                      </span>
                      {entry.date && !isNaN(new Date(entry.date).getTime()) && (
                        <span
                          style={{
                            color: "#666",
                            fontSize: "0.98rem",
                          }}
                        >
                          {new Date(entry.date).toLocaleString()}
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
              {history.filter(
                (h) => h.team === selectedTeam && h.dog === selectedDog
              ).length === 0 && (
                <div
                  style={{
                    color: "#888",
                    textAlign: "center",
                    marginTop: "1rem",
                  }}
                >
                  Noch keine Messungen für diesen Hund.
                </div>
              )}
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
                    <b style={{ color: entry.disq ? "#ff9800" : "#2196f3" }}>
                      {entry.dog}
                    </b>
                    {entry.team ? ` (${entry.team})` : ""}:
                    {entry.disq ? (
                      <span style={{ color: "#ff9800", fontWeight: "bold" }}>
                        Disqualifiziert
                      </span>
                    ) : (
                      <span style={{ color: "#2196f3" }}>{`${entry.time.toFixed(
                        2
                      )} s`}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-history">Noch keine Messungen aufgezeichnet.</p>
            )}
          </div>
        )}
        {page === "auswertung" && (
          <div
            className="card auswertung-card"
            style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}
          >
            <h2>Teilauswertung</h2>
            {Array.from(new Set(dogs.map((d) => d.team))).length > 0 ? (
              <div className="auswertung-rotated" style={{ overflowX: "auto" }}>
                <table
                  className="auswertung-table"
                  style={{ minWidth: "900px", width: "100%" }}
                >
                  <thead>
                    <tr>
                      <th style={{ minWidth: "120px" }}>Team</th>
                      <th style={{ minWidth: "120px" }}>Anzahl Hunde</th>
                      <th style={{ minWidth: "120px" }}>Anzahl Messungen</th>
                      <th style={{ minWidth: "120px" }}>Ø Team</th>
                      <th style={{ minWidth: "120px" }}>Hund</th>
                      <th style={{ minWidth: "120px" }}>Messungen Hund</th>
                      <th style={{ minWidth: "120px" }}>Ø Hund</th>
                      <th style={{ minWidth: "120px" }}>Disqualifikationen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(dogs.map((d) => d.team)))
                      .sort()
                      .map((team, idx) => {
                        const teamDogs = dogs.filter(
                          (dog) => dog.team === team
                        );
                        const teamResults = history.filter(
                          (entry) => entry.team === team
                        );
                        const avg =
                          teamResults.length > 0
                            ? (
                                teamResults.reduce(
                                  (sum, e) => sum + e.time,
                                  0
                                ) / teamResults.length
                              ).toFixed(2)
                            : null;
                        return teamDogs.map((dog, i) => {
                          const dogResults = history.filter(
                            (entry) =>
                              entry.dog === dog.name && entry.team === team
                          );
                          const dogAvg =
                            dogResults.length > 0
                              ? (
                                  dogResults.reduce(
                                    (sum, e) => sum + e.time,
                                    0
                                  ) / dogResults.length
                                ).toFixed(2)
                              : null;
                          const disqCount = dogResults.filter(
                            (e) => e.disq
                          ).length;
                          return (
                            <tr key={team + "-" + dog.name}>
                              {i === 0 && (
                                <>
                                  <td rowSpan={teamDogs.length}>{team}</td>
                                  <td rowSpan={teamDogs.length}>
                                    {teamDogs.length}
                                  </td>
                                  <td rowSpan={teamDogs.length}>
                                    {teamResults.length}
                                  </td>
                                  <td rowSpan={teamDogs.length}>
                                    {avg ? `Ø ${avg} s` : "-"}
                                  </td>
                                </>
                              )}
                              <td
                                style={{
                                  color: "#2196f3",
                                  fontWeight: "bold",
                                  textAlign: "right",
                                }}
                              >
                                {dog.name}
                              </td>
                              <td
                                style={{ color: "#2196f3", textAlign: "right" }}
                              >
                                {dogResults.length}
                              </td>
                              <td
                                style={{ color: "#2196f3", textAlign: "right" }}
                              >
                                {dogAvg ? `Ø ${dogAvg} s` : "-"}
                              </td>
                              <td
                                style={{
                                  color: disqCount > 0 ? "#ff9800" : "#2196f3",
                                  fontWeight: disqCount > 0 ? "bold" : "normal",
                                  textAlign: "right",
                                }}
                              >
                                {disqCount > 0 ? disqCount : "-"}
                              </td>
                            </tr>
                          );
                        });
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-history">Noch keine Teams angelegt.</p>
            )}
          </div>
        )}
        {page === "settings" && (
          <div
            className="card settings-card"
            style={{
              maxWidth: "600px",
              margin: "2rem auto",
              padding: "2rem",
              background: "#f7f7fa",
              borderRadius: "1rem",
              boxShadow: "0 2px 8px #0001",
            }}
          >
            <h2 style={{ marginBottom: "1.5rem" }}>Einstellungen</h2>
            <div style={{ marginBottom: "2rem" }}>
              <label
                style={{
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  marginBottom: "0.7rem",
                  display: "block",
                }}
              >
                Farbschema:
              </label>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                <button
                  onClick={() => setTheme("light")}
                  style={{
                    background: theme === "light" ? "#2196f3" : "#e0e0e0",
                    color: theme === "light" ? "#fff" : "#333",
                    fontWeight: "bold",
                    padding: "0.7rem 1.5rem",
                    borderRadius: "0.7rem",
                    border: "none",
                    boxShadow: "0 2px 8px #0001",
                  }}
                >
                  Tag
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  style={{
                    background: theme === "dark" ? "#222" : "#e0e0e0",
                    color: theme === "dark" ? "#fff" : "#333",
                    fontWeight: "bold",
                    padding: "0.7rem 1.5rem",
                    borderRadius: "0.7rem",
                    border: "none",
                    boxShadow: "0 2px 8px #0001",
                  }}
                >
                  Nacht
                </button>
                <button
                  onClick={() => setTheme("orangeblue")}
                  style={{
                    background: theme === "orangeblue" ? "#ff9800" : "#e0e0e0",
                    color: theme === "orangeblue" ? "#fff" : "#333",
                    fontWeight: "bold",
                    padding: "0.7rem 1.5rem",
                    borderRadius: "0.7rem",
                    border: "none",
                    boxShadow: "0 2px 8px #0001",
                  }}
                >
                  Orange/Blau
                </button>
              </div>
            </div>
            <div style={{ marginBottom: "2rem" }}>
              <label
                style={{
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  marginBottom: "0.7rem",
                  display: "block",
                }}
              >
                Statusanzeige:
              </label>
              <div
                style={{ display: "flex", gap: "2rem", alignItems: "center" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.7rem",
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>ESP32:</span>
                  <span
                    style={{
                      color: status === "offline" ? "#ff9800" : "#2196f3",
                      fontWeight: "bold",
                    }}
                  >
                    {status === "offline" ? "Offline" : "Online"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.7rem",
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>Lichtschranke:</span>
                  <span
                    style={{
                      color: lichtschrankeAktiv ? "#2196f3" : "#ff9800",
                      fontWeight: "bold",
                    }}
                  >
                    {lichtschrankeAktiv ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>
              </div>
            </div>
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
