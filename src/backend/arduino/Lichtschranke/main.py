import machine
import time
import network
import socket
import random

# --- 1. Konfiguration ---
WIFI_AP_SSID = "Lichtschranke-API"
WIFI_AP_PASSWORD = "dogtraining"

# --- 2. Globale Variablen für Zustand und Simulation ---
measurement_state = 'idle'  # Zustände: 'idle', 'timing', 'finished'
last_measured_time = 0.0
simulation_end_time = 0 # Zeitpunkt, an dem die Simulation endet

# --- 3. Access Point starten ---
def start_access_point(ssid, password):
    ap = network.WLAN(network.AP_IF)
    ap.config(essid=ssid, password=password, authmode=network.AUTH_WPA2_PSK)
    ap.active(True)
    while not ap.active():
        time.sleep(1)
    print(f"Access Point gestartet! SSID: '{ssid}', IP: {ap.ifconfig()[0]}")
    return ap.ifconfig()[0]

# --- 4. API-Webserver ---
def start_api_server(ip):
    address = (ip, 80)
    connection = socket.socket()
    connection.bind(address)
    connection.listen(1)
    print(f"API-Server gestartet auf http://{ip}")

    global measurement_state, last_measured_time, simulation_end_time

    while True:
        try:
            client, addr = connection.accept()
            request = client.recv(1024)
            request_str = str(request)
            
            cors_header = "Access-Control-Allow-Origin: *\r\n"
            
            # --- API-Endpunkte ---

            # Anfrage zum Starten der Simulation
            if 'GET /start' in request_str:
                if measurement_state == 'idle' or measurement_state == 'finished':
                    print("Starte Messungs-Simulation...")
                    measurement_state = 'timing'
                    # Berechne, wann die Simulation enden soll (in Millisekunden)
                    simulated_delay_ms = random.uniform(1.5, 5.5) * 1000
                    simulation_end_time = time.ticks_add(time.ticks_ms(), int(simulated_delay_ms))
                    last_measured_time = round(simulated_delay_ms / 1000, 2)

                client.send("HTTP/1.1 200 OK\r\n" + cors_header + "Content-Type: application/json\r\n\r\n")
                client.send('{"status": "ok", "message": "simulation started"}')
            
            # Anfrage zum Abrufen des Status
            elif 'GET /status' in request_str:
                # Prüfen, ob die Simulation beendet ist
                if measurement_state == 'timing' and time.ticks_diff(simulation_end_time, time.ticks_ms()) <= 0:
                    measurement_state = 'finished'
                    print(f"Simulation beendet. Gemessene Zeit: {last_measured_time}s")

                response_json = f'{{"state": "{measurement_state}", "last_time": {last_measured_time}}}'
                client.send("HTTP/1.1 200 OK\r\n" + cors_header + "Content-Type: application/json\r\n\r\n")
                client.send(response_json)
                
                # Das Ergebnis bleibt sichtbar, bis eine neue Messung gestartet wird.
                # Der Reset zu 'idle' wurde entfernt.
                # if measurement_state == 'finished':
                #     measurement_state = 'idle'
            
            # Anfrage zum Zurücksetzen der Messung
            elif 'GET /reset' in request_str:
                print("Messung wird zurückgesetzt.")
                measurement_state = 'idle'
                last_measured_time = 0.0
                client.send("HTTP/1.1 200 OK\r\n" + cors_header + "Content-Type: application/json\r\n\r\n")
                client.send('{"status": "ok", "message": "measurement reset"}')

            # Alle anderen Anfragen
            else:
                # Ignoriere Favicon-Anfragen leise
                if 'favicon.ico' not in request_str:
                    print(f"Unbekannter Endpunkt angefragt: {request_str}")
                    client.send("HTTP/1.1 404 Not Found\r\n" + cors_header + "\r\n")
                    client.send('{"error": "endpoint not found"}')
                else:
                    # Für Favicon einfach Verbindung schließen
                    pass
                
            client.close()
        except OSError as e:
            print(f"Webserver-Fehler: {e}")


# --- Hauptprogramm ---
if __name__ == "__main__":
    ip_address = start_access_point(WIFI_AP_SSID, WIFI_AP_PASSWORD)
    if ip_address:
        start_api_server(ip_address)
