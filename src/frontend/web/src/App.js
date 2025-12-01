import { useEffect, useState, useRef } from "react";
import "./App.css";

const ESP_IP = "192.168.4.1"; // anpassen, falls STA mode

export default function App() {
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState([]);
  const esRef = useRef(null);

  useEffect(() => {
    const url = `http://${ESP_IP}/events`;
    const es = new EventSource(url);
    es.onopen = () => setConnected(true);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.event === "TRIGGER") {
          const entry = { ts: data.ts, recv: Date.now() };
          setLog((l) => [entry, ...l].slice(0, 200));
        }
      } catch (e) {
        console.warn("Invalid event data", e);
      }
    };
    es.onerror = (e) => {
      console.warn("EventSource error", e);
      setConnected(false);
      // leave it; browser auto-reconnects by default
    };
    esRef.current = es;
    return () => {
      es.close();
    };
  }, []);

  return (
    <div className="app">
      <header>
        <h1>ESP32 Lichtschranke</h1>
        <div className={"status " + (connected ? "on" : "off")}>
          {connected ? "verbunden" : "getrennt"}
        </div>
      </header>

      <main>
        <section className="log">
          <h2>Letzte Trigger</h2>
          <table>
            <thead>
              <tr><th>#</th><th>Device TS (ms)</th><th>Empfangen</th><th>Diff (ms)</th></tr>
            </thead>
            <tbody>
              {log.map((item, i) => (
                <tr key={item.ts + "-" + i}>
                  <td>{i+1}</td>
                  <td>{item.ts}</td>
                  <td>{new Date(item.recv).toLocaleTimeString()}</td>
                  <td>{item.recv - item.ts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
