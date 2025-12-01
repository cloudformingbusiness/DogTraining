import {
  Box,
  Chip,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

const projekte = [
  {
    id: "P001",
    name: "Neubau Schule",
    status: "active",
    adresse: "Musterstraße 12, 12345 Musterstadt",
    lat: 52.520008,
    lng: 13.404954,
  },
  {
    id: "P002",
    name: "Sanierung Rathaus",
    status: "completed",
    adresse: "Rathausplatz 1, 12345 Musterstadt",
    lat: 52.521008,
    lng: 13.405954,
  },
  {
    id: "P003",
    name: "Brückenerweiterung",
    status: "pending",
    adresse: "Brückenweg 5, 12345 Musterstadt",
    lat: 52.522008,
    lng: 13.406954,
  },
];

const center = [52.520008, 13.404954];

const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const ProjektUebersicht = ({ onProjektSelect }) => (
  <Container maxWidth="lg" sx={{ mt: 4 }}>
    <Typography variant="h3" gutterBottom color="primary">
      Projektübersicht
    </Typography>
    <Paper
      elevation={4}
      sx={{ p: 4, mb: 4, borderRadius: 3, bgcolor: "background.paper" }}
    >
      <Typography variant="h5" sx={{ mb: 2 }}>
        Projekte
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <List>
        {projekte.map((projekt) => (
          <ListItem
            key={projekt.id}
            divider
            button
            onClick={() => onProjektSelect(projekt)}
            sx={{
              borderRadius: 2,
              mb: 1,
              boxShadow: 1,
              transition: "0.2s",
              "&:hover": { boxShadow: 4, bgcolor: "#f5f5f5" },
            }}
          >
            <Box display="flex" alignItems="center" width="100%">
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
              <ListItemText
                primary={<Typography variant="h6">{projekt.name}</Typography>}
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {projekt.adresse}
                  </Typography>
                }
              />
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
    <Box sx={{ width: "100%", height: "600px", mb: 4 }}>
      <Paper
        elevation={4}
        sx={{ width: "100%", height: "100%", p: 2, borderRadius: 3 }}
      >
        <Typography variant="h5" gutterBottom color="primary">
          Standorte (OpenStreetMap)
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: "500px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {projekte.map((projekt) => (
            <Marker
              key={projekt.id}
              position={[projekt.lat, projekt.lng]}
              icon={redIcon}
            >
              <Popup>
                <b>{projekt.name}</b>
                <br />
                {projekt.adresse}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Paper>
    </Box>
  </Container>
);

export default ProjektUebersicht;
export { projekte };
