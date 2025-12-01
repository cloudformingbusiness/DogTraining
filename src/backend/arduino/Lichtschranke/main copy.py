# main.py -- put your code here!# main.py
import network
import socket
import time
import ujson
from machine import Pin

# ---------- CONFIG ----------
SSID = "Lichtschranke"        # wenn du Station Mode willst, sonst setze AP_MODE True
PASSWORD = "Lichtschranke1234"
AP_MODE = True            # True = ESP als AccessPoint (handy verbindet zu 192.168.4.1)
LISTEN_PORT = 80
TRIGGER_PIN = 15          # Pin der Lichtschranke (anpassen)
DEBOUNCE_MS = 30
# ----------------------------

clients = []              # Liste offener SSE-Clients (socket objects)
event_flag = False
last_trigger_ms = 0

# --- GPIO / ISR ---
trigger = Pin(TRIGGER_PIN, Pin.IN, Pin.PULL_UP)

print("Using trigger pin:", TRIGGER_PIN)

led_pin = Pin(2, Pin.OUT)  # Onboard LED (ESP32)

while True:
    led_pin.value(1)
    time.sleep(0.5)
    led_pin.value(0)
    time.sleep(0.5)
    if trigger.value() == 0:
        break
    
def irq(pin):
    global event_flag, last_trigger_ms
    now = time.ticks_ms()
    # Debounce
    if now - last_trigger_ms > DEBOUNCE_MS:
        last_trigger_ms = now
        event_flag = True

trigger.irq(trigger=Pin.IRQ_FALLING | Pin.IRQ_RISING, handler=irq)

# --- WLAN ---
def start_ap():
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    ap.config(essid="ESP32-Timing", authmode=network.AUTH_OPEN)  # offenes AP; passe an
    while not ap.active():
        time.sleep(0.1)
    ip = ap.ifconfig()[0]
    print("AP mode, IP:", ip)
    return ip

def start_sta(ssid, pw):
    sta = network.WLAN(network.STA_IF)
    sta.active(True)
    sta.connect(ssid, pw)
    for _ in range(30):
        if sta.isconnected():
            break
        time.sleep(1)
    if not sta.isconnected():
        raise Exception("STA connect failed")
    ip = sta.ifconfig()[0]
    print("STA mode, IP:", ip)
    return ip

# choose mode
if AP_MODE:
    ip = start_ap()
else:
    try:
        ip = start_sta(SSID, PASSWORD)
    except Exception as e:
        print("STA failed, fallback to AP:", e)
        ip = start_ap()

# --- HTTP server (minimal) ---
addr = socket.getaddrinfo('0.0.0.0', LISTEN_PORT)[0][-1]
srv = socket.socket()
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(addr)
srv.listen(5)
srv.setblocking(False)
print("HTTP server listening on", addr)

# helper: send SSE-formatted message to client sock
def send_sse(sock, data):
    try:
        # SSE: data: <json>\n\n
        payload = "data: " + ujson.dumps(data) + "\n\n"
        sock.send(payload.encode())
        return True
    except Exception as e:
        print("send fail, removing client:", e)
        return False

# handle simple requests (index + events)
def handle_request(conn):
    try:
        req = conn.recv(1024)
        if not req:
            return False
        reqs = req.decode(errors='ignore').splitlines()
        if len(reqs) == 0:
            return False
        first = reqs[0]
        # GET /events
        if "GET /events" in first:
            # send SSE headers and keep socket open
            headers = (
                "HTTP/1.1 200 OK\r\n"
                "Content-Type: text/event-stream\r\n"
                "Cache-Control: no-cache\r\n"
                "Connection: keep-alive\r\n\r\n"
            )
            conn.send(headers.encode())
            conn.setblocking(False)
            clients.append(conn)
            print("SSE client connected, total:", len(clients))
            return None  # keep connection
        # GET / -> send a tiny page for testing
        elif "GET / " in first or "GET /HTTP" in first or "GET / HTTP" in first:
            body = """<html><head><meta charset="utf-8"><title>ESP32 SSE</title></head>
            <body><h1>ESP32 SSE Server</h1>
            <p>Use /events as EventSource endpoint.</p>
            </body></html>"""
            resp = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\n\r\n{}".format(len(body), body)
            conn.send(resp.encode())
            conn.close()
            return False
        else:
            # unknown -> 404
            resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n"
            conn.send(resp.encode())
            conn.close()
            return False
    except Exception as e:
        # connection error
        try:
            conn.close()
        except:
            pass
        return False

print("Ready. Open http://{}/ in the browser".format(ip))

# --- Main loop ---
try:
    while True:
        # accept new connections (non-blocking)
        try:
            cl, addr = srv.accept()
            # quick handle; handle_request will append to clients if /events
            res = handle_request(cl)
            # if handle_request returned None, it kept socket open and appended to clients
        except OSError:
            # no pending connection
            pass

        # if the ISR set the flag, broadcast event
        if event_flag:
            event_flag = False
            ts = time.ticks_ms()
            data = {"event":"TRIGGER", "ts": ts}
            # send to all clients, remove failed
            for c in clients[:]:
                ok = send_sse(c, data)
                if not ok:
                    try:
                        clients.remove(c)
                        c.close()
                    except:
                        pass
            # also print local
            print("Trigger:", ts, "clients:", len(clients))

        # lightly sleep
        time.sleep_ms(10)

except KeyboardInterrupt:
    print("Server stopped")
finally:
    srv.close()
    for c in clients:
        try:
            c.close()
        except:
            pass
