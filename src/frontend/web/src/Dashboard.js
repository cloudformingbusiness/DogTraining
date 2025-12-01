import {
  Box,
  Container,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import React from "react";

// Beispielhafte Projektdaten
const projekte = [
  {
    id: "P001",
    name: "Neubau Schule",
    status: "active",
    updatedAt: "2025-11-19",
  },
  {
    id: "P002",
    name: "Sanierung Rathaus",
    status: "completed",
    updatedAt: "2025-10-30",
  },
  {
    id: "P003",
    name: "Brückenerweiterung",
    status: "pending",
    updatedAt: "2025-11-01",
  },
];

const stats = [
  { label: "Projekte gesamt", value: projekte.length },
  {
    label: "Aktiv",
    value: projekte.filter((p) => p.status === "active").length,
  },
  {
    label: "Abgeschlossen",
    value: projekte.filter((p) => p.status === "completed").length,
  },
  {
    label: "Ausstehend",
    value: projekte.filter((p) => p.status === "pending").length,
  },
];

const Dashboard = () => (
  <Container maxWidth="md" sx={{ mt: 4 }}>
    <Typography variant="h4" gutterBottom>
      BauLogPro Dashboard
    </Typography>
    <Grid container spacing={3}>
      {stats.map((stat) => (
        <Grid item xs={12} sm={6} md={3} key={stat.label}>
          <Paper elevation={3} sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h6">{stat.label}</Typography>
            <Typography variant="h4" color="primary">
              {stat.value}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
    <Box mt={4}>
      <Typography variant="h5" gutterBottom>
        Projektübersicht
      </Typography>
      <Paper elevation={1} sx={{ p: 2 }}>
        <List>
          {projekte.map((projekt) => (
            <ListItem key={projekt.id} divider>
              <ListItemText
                primary={projekt.name}
                secondary={`Status: ${projekt.status} | Zuletzt geändert: ${projekt.updatedAt}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  </Container>
);

export default Dashboard;
