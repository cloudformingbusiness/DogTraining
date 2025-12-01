import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import React from "react";

const Settings = ({ theme, setTheme }) => {
  const handleChange = (event) => {
    setTheme(event.target.value);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Einstellungen
      </Typography>
      <Typography variant="body1">
        Hier können Einstellungen für die Anwendung vorgenommen werden.
      </Typography>
      <FormControl component="fieldset" sx={{ mt: 2 }}>
        <FormLabel component="legend">Theme auswählen</FormLabel>
        <RadioGroup row value={theme} onChange={handleChange}>
          <FormControlLabel
            value="light"
            control={<Radio />}
            label="Tag (Light)"
          />
          <FormControlLabel
            value="dark"
            control={<Radio />}
            label="Nacht (Dark)"
          />
        </RadioGroup>
      </FormControl>
    </Paper>
  );
};

export default Settings;
