# http_server.py
import uasyncio as asyncio
import json
import socket
import network
import machine
   

# HTTP-Server aktivieren/deaktivieren
ENABLE_HTTP = True

print("http_server Run...")

class HTTPServer:
    def __init__(self, mqtt_handler):
        self.mqtt_handler = mqtt_handler
        self.users = []
        # Lichtschranke/Messung
        self.lichtschranke_aktiv = False
        self.messung_laeuft = False
        self.mess_start = 0
        self.mess_ende = 0
        self.mess_ergebnis = None
        # Pins für Start/Stop
        self.pin_start = machine.Pin(4, machine.Pin.IN, machine.Pin.PULL_UP)
        self.pin_stop = machine.Pin(5, machine.Pin.IN, machine.Pin.PULL_UP)
        self.pin_start.irq(trigger=machine.Pin.IRQ_FALLING, handler=self._start_messung_irq)
        self.pin_stop.irq(trigger=machine.Pin.IRQ_FALLING, handler=self._stop_messung_irq)

    def _start_messung_irq(self, pin):
        if self.lichtschranke_aktiv and not self.messung_laeuft:
            import time
            self.messung_laeuft = True
            self.mess_start = time.ticks_ms()
            self.mess_ende = 0
            self.mess_ergebnis = None
            print("Messung per Taster gestartet!")

    def _stop_messung_irq(self, pin):
        if self.messung_laeuft:
            import time
            self.mess_ende = time.ticks_ms()
            self.mess_ergebnis = self.mess_ende - self.mess_start
            self.messung_laeuft = False
            print("Messung per Taster gestoppt! Ergebnis: %d ms" % self.mess_ergebnis)

    async def handle_client(self, client):
        try:
            request = client.recv(1024).decode('utf-8')
            # 1. Lichtschranke aktiv/inaktiv
            if request.startswith('POST /lichtschranke'):
                if 'aktiv=1' in request:
                    self.lichtschranke_aktiv = True
                    response = json.dumps({"lichtschranke": "aktiv"})
                elif 'aktiv=0' in request:
                    self.lichtschranke_aktiv = False
                    response = json.dumps({"lichtschranke": "inaktiv"})
                else:
                    response = json.dumps({"error": "Parameter aktiv fehlt"})
                client.send('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n')
                client.send(response)
            # 2. Status abfragen
            elif request.startswith('GET /lichtschranke'):
                status = "aktiv" if self.lichtschranke_aktiv else "inaktiv"
                client.send('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n')
                client.send(json.dumps({"lichtschranke": status}))
            # 3. Zeitmessung starten
            elif request.startswith('POST /messung_start'):
                if self.lichtschranke_aktiv:
                    import time
                    self.messung_laeuft = True
                    self.mess_start = time.ticks_ms()
                    self.mess_ende = 0
                    self.mess_ergebnis = None
                    response = json.dumps({"messung": "gestartet"})
                else:
                    response = json.dumps({"error": "Lichtschranke nicht aktiv"})
                client.send('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n')
                client.send(response)
            # 4. Messung beenden (simuliert, in echt per Sensor)
            elif request.startswith('POST /messung_stop'):
                if self.messung_laeuft:
                    import time
                    self.mess_ende = time.ticks_ms()
                    self.mess_ergebnis = self.mess_ende - self.mess_start
                    self.messung_laeuft = False
                    response = json.dumps({"messung": "beendet", "zeit_ms": self.mess_ergebnis})
                else:
                    response = json.dumps({"error": "Messung läuft nicht"})
                client.send('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n')
                client.send(response)
            # 5. Messergebnis abfragen
            elif request.startswith('GET /messung_ergebnis'):
                if self.mess_ergebnis is not None:
                    response = json.dumps({"zeit_ms": self.mess_ergebnis})
                else:
                    response = json.dumps({"error": "Kein Messergebnis vorhanden"})
                client.send('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n')
                client.send(response)
            # User-API und Default
            elif request.startswith('POST /user'):
                try:
                    name = request.split('name=')[1].split(' ')[0]
                    self.users.append(name)
                    response = json.dumps({"created": name})
                    client.send('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n')
                    client.send(response)
                    self.mqtt_handler.publish("User erstellt: " + name)
                except:
                    client.send('HTTP/1.1 400 Bad Request\r\n\r\n')
            elif request.startswith('GET /'):
                client.send('HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n')
                client.send(json.dumps({"status": "ok"}))
            else:
                client.send('HTTP/1.1 404 Not Found\r\n\r\n')
        finally:
            client.close()

    async def loop(self):
        if not ENABLE_HTTP:
            print("HTTP-Server ist deaktiviert.")
            while True:
                await asyncio.sleep(1)
        addr = socket.getaddrinfo('0.0.0.0', 80)[0][-1]
        s = socket.socket()
        s.bind(addr)
        s.listen(5)
        s.setblocking(False)
        ip = network.WLAN(network.STA_IF).ifconfig()[0]
        if ip == '0.0.0.0':
            ip = network.WLAN(network.AP_IF).ifconfig()[0]
        print("HTTP Server läuft auf %s:80" % ip)
        while True:
            try:
                client, _ = s.accept()
                asyncio.create_task(self.handle_client(client))
            except:
                await asyncio.sleep(0.01)
