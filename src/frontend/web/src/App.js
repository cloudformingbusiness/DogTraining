import {
  AppBar,
  Button,
  Container,
  CssBaseline,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import React, { useState } from "react";
import { ReactComponent as Logo } from "./assets/logo.svg";
import ProjektDetail from "./ProjektDetail";
import ProjektUebersicht from "./ProjektUebersicht";
import Settings from "./Settings";

const App = () => {
  const [page, setPage] = useState("uebersicht");
  const [themeMode, setThemeMode] = useState("light");
  const [selectedProjekt, setSelectedProjekt] = useState(null);

  const theme = createTheme({
    palette: {
      mode: themeMode,
      primary: { main: "#1976d2" },
      secondary: { main: "#ffc107" },
    },
  });

  const handleNav = (target) => setPage(target);
  const handleProjektSelect = (projekt) => {
    setSelectedProjekt(projekt);
    setPage("detail");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Logo style={{ height: 40, marginRight: 16 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            BauLogPro Dashboard
          </Typography>
          <Button color="inherit" onClick={() => handleNav("uebersicht")}>
            Projekt Übersicht
          </Button>
          <Button color="inherit" onClick={() => handleNav("detail")}>
            Details Projekt
          </Button>
          <Button color="inherit" onClick={() => handleNav("settings")}>
            Settings
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {page === "uebersicht" && (
          <ProjektUebersicht onProjektSelect={handleProjektSelect} />
        )}
        {page === "detail" && (
          <ProjektDetail
            projekt={selectedProjekt}
            onBack={() => setPage("uebersicht")}
          />
        )}
        {page === "settings" && (
          <Settings theme={themeMode} setTheme={setThemeMode} />
        )}
      </Container>
    </ThemeProvider>
  );
};

export default App;
