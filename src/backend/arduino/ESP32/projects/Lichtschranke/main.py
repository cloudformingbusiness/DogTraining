# main.py – Minimaler Webserver für ESP32 (MicroPython)

# Kombinierte Webserver- und Lichtschranken-API
from microdot import Microdot, Response
import machine
import time
import ujson
import os

Response.default_content_type = "application/json"
app = Microdot()


# --- Lichtschranken-API-Endpunkte und Logik ---
PIN_SENSOR = 33
PIN_MANUAL_START = 25
PIN_MANUAL_STOP = 26
DEBOUNCE_MS = 10
MIN_ELAPSED_MS = 500
MAX_ELAPSED_MS = 600000
RESULTS_FILE = "results.jsonl"
DEVICE_NAME = "esp32-01"

state = "idle"
sensor_enabled = True
manual_active = False
last_trigger = 0
start_ts_us = 0
finish_ts_us = 0
current_participant = None

pin_sensor = machine.Pin(PIN_SENSOR, machine.Pin.IN, machine.Pin.PULL_UP)

hardware_buttons_available = False
try:
  pin_manual_start = machine.Pin(PIN_MANUAL_START, machine.Pin.IN, machine.Pin.PULL_UP)
  pin_manual_stop = machine.Pin(PIN_MANUAL_STOP, machine.Pin.IN, machine.Pin.PULL_UP)
  hardware_buttons_available = True
except Exception:
  hardware_buttons_available = False

def micros_now():
  return time.ticks_us()

def ms_from_us(us):
  return us // 1000

def elapsed_ms_from_us(start_us, end_us):
  return time.ticks_diff(end_us, start_us) // 1000

def save_result(result):
  try:
    with open(RESULTS_FILE, "a") as f:
      f.write(ujson.dumps(result) + "\n")
    return True
  except Exception as e:
    print("Speichern fehlgeschlagen:", e)
    return False

def load_all_results(limit=None):
  results = []
  try:
    if not RESULTS_FILE in os.listdir():
      return results
  except Exception:
    pass
  try:
    with open(RESULTS_FILE, "r") as f:
      for line in f:
        line = line.strip()
        if not line:
          continue
        try:
          results.append(ujson.loads(line))
        except Exception:
          continue
  except Exception as e:
    print("Fehler beim Laden results:", e)
  if limit:
    return results[-limit:]
  return results

def make_result_payload(start_us, finish_us, participant, device=DEVICE_NAME):
  now_ms = ms_from_us(micros_now())
  elapsed_ms = elapsed_ms_from_us(start_us, finish_us) if start_us and finish_us else None
  result = {
    "device": device,
    "dog_id": participant.get("dog_id") if participant else None,
    "dog_name": participant.get("dog_name") if participant else None,
    "club_id": participant.get("club_id") if participant else None,
    "lane": participant.get("lane") if participant else None,
    "start_ms": ms_from_us(start_us) if start_us else None,
    "finish_ms": ms_from_us(finish_us) if finish_us else None,
    "elapsed_ms": elapsed_ms,
    "timestamp_received_ms": now_ms
  }
  return result

def reset_run():
  global start_ts_us, finish_ts_us, state, manual_active, current_participant
  start_ts_us = 0
  finish_ts_us = 0
  state = "idle"
  manual_active = False
  current_participant = None

def sensor_callback(pin):
  global state, start_ts_us, finish_ts_us, last_trigger, sensor_enabled, manual_active, current_participant
  if not sensor_enabled:
    print("Sensor deaktiviert - kein Trigger")
    return
  if manual_active:
    print("Manueller Lauf aktiv - Sensor ignoriert")
    return
  now = micros_now()
  if time.ticks_diff(now, last_trigger) < DEBOUNCE_MS * 1000:
    print("Debounce - Trigger ignoriert")
    return
  last_trigger = now
  if state == "idle":
    start_ts_us = now
    state = "running"
    print("Lichtschranke: START erkannt (ts_us=%d)" % start_ts_us)
  elif state == "running":
    if time.ticks_diff(now, start_ts_us) // 1000 >= MIN_ELAPSED_MS:
      finish_ts_us = now
      result = make_result_payload(start_ts_us, finish_ts_us, current_participant)
      saved = save_result(result)
      print("Lichtschranke: ZIEL erkannt (ts_us=%d, elapsed=%d ms)" % (finish_ts_us, elapsed_ms_from_us(start_ts_us, finish_ts_us)))
      state = "idle"
      manual_active = False
      current_participant = None
    else:
      print("Ziel zu früh erkannt - ignoriert")

pin_sensor.irq(trigger=machine.Pin.IRQ_FALLING, handler=sensor_callback)


def manual_start_button_cb(pin):
    manual_start_via_hw()

def manual_stop_button_cb(pin):
    manual_stop_via_hw()

def manual_start_via_hw():
    global state, start_ts_us, manual_active, last_trigger
    now = micros_now()
    if time.ticks_diff(now, last_trigger) < DEBOUNCE_MS * 1000:
        return
    last_trigger = now
    if state == "running":
        return
    start_ts_us = now
    state = "running"
    manual_active = True

def manual_stop_via_hw():
    global state, finish_ts_us, manual_active, start_ts_us, current_participant, last_trigger
    now = micros_now()
    if time.ticks_diff(now, last_trigger) < DEBOUNCE_MS * 1000:
        return
    last_trigger = now
    if state != "running":
        return
    if time.ticks_diff(now, start_ts_us)//1000 >= MIN_ELAPSED_MS:
        finish_ts_us = now
        result = make_result_payload(start_ts_us, finish_ts_us, current_participant)
        save_result(result)
        state = "idle"
        manual_active = False
        current_participant = None

if hardware_buttons_available:
  pin_manual_start.irq(trigger=machine.Pin.IRQ_FALLING, handler=manual_start_button_cb)
  pin_manual_stop.irq(trigger=machine.Pin.IRQ_FALLING, handler=manual_stop_button_cb)

# --- API Endpunkte ---

# --- Webserver-Startseite ---
@app.route('/')
def index(request):
  html = """
  <!DOCTYPE html>
  <html lang='de'>
  <head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>ESP32 Webserver</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    header { background: #0077cc; color: #fff; padding: 1em; text-align: center; }
    main { padding: 2em; }
    footer { background: #eee; color: #333; text-align: center; padding: 1em; position: fixed; width: 100%; bottom: 0; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #ccc; padding: 2em; max-width: 400px; margin: 2em auto; }
  </style>
  </head>
  <body>
  <header>
    <h1>ESP32 Webserver</h1>
  </header>
  <main>
    <div class="card">
    <h2>Willkommen!</h2>
    <p>Du bist mit dem ESP32 verbunden.</p>
    <p>Microdot-Webserver läuft.</p>
    <p><a href="/simple-status">API-Status</a></p>
    </div>
  </main>
  <footer>
    &copy; 2025 DogTraining ESP32
  </footer>
  </body>
  </html>
  """
  return Response(html, headers={"Content-Type": "text/html"})

@app.route("/participant", methods=['POST'])
def set_participant(request):
  global current_participant, state
  try:
    payload = request.json
  except Exception:
    return ujson.dumps({"error": "invalid json"})
  if not payload:
    return ujson.dumps({"error": "no payload"})
  dog_id = payload.get("dog_id")
  dog_name = payload.get("dog_name")
  club_id = payload.get("club_id")
  lane = payload.get("lane", None)
  if not dog_id and not dog_name:
    return ujson.dumps({"error": "dog_id or dog_name required"})
  if state == "running":
    return ujson.dumps({"error": "run_active"})
  current_participant = {
    "dog_id": dog_id,
    "dog_name": dog_name,
    "club_id": club_id,
    "lane": lane
  }
  return ujson.dumps({"status": "participant_set", "participant": current_participant})

@app.route("/current")
def get_current(request):
  global start_ts_us, finish_ts_us, state, sensor_enabled, manual_active, current_participant
  elapsed = None
  if start_ts_us and finish_ts_us:
    elapsed = elapsed_ms_from_us(start_ts_us, finish_ts_us)
  elif start_ts_us and state == "running":
    elapsed = elapsed_ms_from_us(start_ts_us, micros_now())
  resp = {
    "state": state,
    "sensor_active": sensor_enabled,
    "manual_active": manual_active,
    "participant": current_participant,
    "start": ms_from_us(start_ts_us) if start_ts_us else 0,
    "finish": ms_from_us(finish_ts_us) if finish_ts_us else 0,
    "elapsed": elapsed
  }
  return ujson.dumps(resp)

@app.route("/results")
def get_results(request):
  q = request.args
  limit = None
  if "limit" in q:
    try:
      limit = int(q.get("limit"))
    except Exception:
      limit = None
  results = load_all_results(limit=limit)
  return ujson.dumps({"count": len(results), "results": results})

@app.route("/reset", methods=['POST'])
def reset(request):
  reset_run()
  return ujson.dumps({"status": "reset"})

@app.route("/sensor/on", methods=['POST'])
def sensor_on(request):
  global sensor_enabled
  sensor_enabled = True
  return ujson.dumps({"sensor_enabled": True})

@app.route("/sensor/off", methods=['POST'])
def sensor_off(request):
  global sensor_enabled
  sensor_enabled = False
  return ujson.dumps({"sensor_enabled": False})

@app.route("/manual/start", methods=['POST'])
def manual_start(request):
  global state, start_ts_us, manual_active, current_participant
  if state == "running":
    return ujson.dumps({"error": "already running"})
  now = micros_now()
  start_ts_us = now
  state = "running"
  manual_active = True
  return ujson.dumps({"status": "manual_start", "start_ms": ms_from_us(start_ts_us), "participant": current_participant})

@app.route("/manual/stop", methods=['POST'])
def manual_stop(request):
  global state, finish_ts_us, manual_active, start_ts_us, current_participant
  if state != "running":
    return ujson.dumps({"error": "no active run"})
  now = micros_now()
  if time.ticks_diff(now, start_ts_us)//1000 < MIN_ELAPSED_MS:
    return ujson.dumps({"error": "min_elapsed_not_reached"})
  finish_ts_us = now
  result = make_result_payload(start_ts_us, finish_ts_us, current_participant)
  save_result(result)
  elapsed = elapsed_ms_from_us(start_ts_us, finish_ts_us)
  state = "idle"
  manual_active = False
  current_participant = None
  return ujson.dumps({"status":"manual_stop", "finish_ms": ms_from_us(finish_ts_us), "elapsed_ms": elapsed, "result": result})

@app.route("/simple-status")
def simple_status(request):
  return ujson.dumps({"status": "ok"})

if __name__ == '__main__':
  print("Starte Webserver und API auf 0.0.0.0:80 ...")
  app.run(host='0.0.0.0', port=80)
    
