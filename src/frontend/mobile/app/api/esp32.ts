const API_BASE_URL = "http://192.168.4.1";

export interface ESPStatus {
  status: "Bereit" | "Läuft" | "Gestoppt" | "Fehler";
  time: number;
}

export interface StatusMessage {
  type: "info" | "warning" | "error";
  text: string;
}

export interface ESPLogStatus {
  messages: StatusMessage[];
}

export const getESPStatus = async (): Promise<ESPStatus> => {
  const response = await fetch(`${API_BASE_URL}/status`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
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
