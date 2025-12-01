import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveLocally } from "./dataStorage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe("DataStore - saveLocally", () => {
  it("DataStore - speichert Daten lokal erfolgreich", async () => {
  (AsyncStorage.setItem as any).mockResolvedValueOnce(undefined);
    const result = await saveLocally("testKey", { foo: "bar" });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("testKey", JSON.stringify({ foo: "bar" }));
    expect(result.success).toBe(true);
  });

  it("DataStore - gibt Fehler zurück, wenn speichern fehlschlägt", async () => {
  (AsyncStorage.setItem as any).mockRejectedValueOnce(new Error("Speicherfehler"));
    const result = await saveLocally("testKey", { foo: "bar" });
    expect(result.success).toBe(false);
    expect(result.message).toBe("Speicherfehler");
  });
});
