import Config from "react-native-config";

const API_BASE_URL = Config.API_BASE_URL;

export async function getStatus() {
  const res = await fetch(`${API_BASE_URL}/status`);
  return res.json();
}
