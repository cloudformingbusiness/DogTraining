const API_BASE_URL = "http://192.168.4.1";

export interface ESPCurrentData {
  state: "idle" | "running";
  sensor_active: boolean;
  manual_active: boolean;
  participant: {
    dog_id: string;
    dog_name: string;
    club_id: string;
    lane: number;
  } | null;
  start: number;
  finish: number;
  elapsed: number | null;
}

export interface StatusMessage {
  type: "info" | "warning" | "error";
  text: string;
}

export interface ESPLogStatus {
  messages: StatusMessage[];
}

export const getCurrentData = async (): Promise<ESPCurrentData> => {
  // Use a timeout to avoid long waits
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 seconds

  try {
    const response = await fetch(`${API_BASE_URL}/current`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    // Don't log AbortError, it's an expected timeout
    if ((error as Error).name !== 'AbortError') {
      console.error("Error fetching current data:", error);
    }
    throw error;
  }
};

export const getESPSimpleStatus = async (): Promise<ESPLogStatus> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 Sekunden Timeout

  try {
    console.log(`Sende Anfrage an ${API_BASE_URL}/simple-status`);
    const response = await fetch(`${API_BASE_URL}/simple-status`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log("Antwort erhalten:", response.status, response.statusText);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const json = await response.json();
    console.log("Antwort-JSON:", json);
    return json;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("Fehler in getESPSimpleStatus: Timeout nach 5 Sekunden");
      throw new Error("Request timed out");
    }
    console.error("Fehler in getESPSimpleStatus:", error);
    throw error;
  }
};

export const manualStart = async () => {
  const response = await fetch(`${API_BASE_URL}/manual/start`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to start manual measurement");
  }
  return response.json();
};

export const manualStop = async () => {
  const response = await fetch(`${API_BASE_URL}/manual/stop`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to stop manual measurement");
  }
  return response.json();
};

export const startMeasurement = async () => {
  const response = await fetch(`${API_BASE_URL}/start`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to start measurement");
  }
  return response.json();
};

export const resetMeasurement = async () => {
  const response = await fetch(`${API_BASE_URL}/reset`, { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to reset measurement");
  }
  return response.json();
};

export const setSensorState = async (enable: boolean) => {
  const url = enable ? `${API_BASE_URL}/sensor/on` : `${API_BASE_URL}/sensor/off`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to set sensor state to ${enable}`);
  }
  return response.json();
};
