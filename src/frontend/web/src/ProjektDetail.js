import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import React from "react";

const fieldLabels = {
  name: "Projektname",
  status: "Status",
  adresse: "Adresse",
  lat: "Breite (Latitude)",
  lng: "Länge (Longitude)",
};

const ProjektDetail = ({ projekt, onBack }) => {
  if (!projekt) {
    return (
      <Paper
        elevation={4}
        sx={{ p: 4, borderRadius: 3, bgcolor: "background.paper" }}
      >
        <Typography variant="h4" gutterBottom color="primary">
          Projekt Details
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bitte wähle ein Projekt in der Übersicht aus.
        </Typography>
        {onBack && (
          <Button variant="contained" sx={{ mt: 3 }} onClick={onBack}>
            Zurück
          </Button>
        )}
      </Paper>
    );
  }

  return (
    <Paper
      elevation={4}
      sx={{ p: 4, borderRadius: 3, bgcolor: "background.paper" }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        <Chip
          label={projekt.status}
          color={
            projekt.status === "active"
              ? "success"
              : projekt.status === "completed"
              ? "primary"
              : "warning"
          }
          sx={{ mr: 2 }}
        />
        <Typography variant="h4" color="primary" sx={{ flexGrow: 1 }}>
          {projekt.name}
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box mb={2}>
        <Typography variant="subtitle1" color="text.secondary">
          <b>Adresse:</b> {projekt.adresse}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          <b>GPS:</b> {projekt.lat}, {projekt.lng}
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <List>
        {Object.entries(projekt).map(([key, value]) => {
          if (["name", "status", "adresse", "lat", "lng"].includes(key))
            return null;
          return (
            <ListItem key={key} divider sx={{ py: 1 }}>
              <ListItemText
                primary={<b>{fieldLabels[key] || key}</b>}
                secondary={
                  typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : String(value)
                }
              />
            </ListItem>
          );
        })}
      </List>
      <Box display="flex" justifyContent="flex-end" mt={3}>
        {onBack && (
          <Button variant="contained" color="primary" onClick={onBack}>
            Zurück zur Übersicht
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default ProjektDetail;
