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
  <title>ESP32 Lichtschranke</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .container { width: 100%; max-width: 500px; padding: 20px; }
    header { text-align: center; margin-bottom: 20px; }
    header h1 { color: #1c1e21; font-size: 24px; }
    footer { text-align: center; margin-top: 20px; color: #8a8d91; font-size: 12px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, .1), 0 8px 16px rgba(0, 0, 0, .1); padding: 20px; margin-bottom: 20px; }
    .info-card p { margin: 5px 0; color: #606770; }
    .stopwatch-card h3 { text-align: center; color: #1c1e21; margin-top: 0; }
    #stopwatch-display { font-family: "Menlo", "Consolas", "Monaco", monospace; font-size: 3em; text-align: center; color: #1c1e21; margin: 20px 0; }
    .button-container { display: flex; justify-content: space-around; gap: 10px; }
    .button-container button { flex-grow: 1; border: none; border-radius: 6px; padding: 12px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background-color 0.2s; }
    #start-btn { background-color: #42b72a; color: white; }
    #start-btn:hover:not(:disabled) { background-color: #36a420; }
    #stop-btn { background-color: #fa3e3e; color: white; }
    #stop-btn:hover:not(:disabled) { background-color: #e03030; }
    #reset-btn { background-color: #6c757d; color: white; }
    #reset-btn:hover:not(:disabled) { background-color: #5a6268; }
    button:disabled { background-color: #ccd0d5; color: #8a8d91; cursor: not-allowed; }
    .toggle-container { display: flex; justify-content: space-between; align-items: center; padding: 10px; background-color: #f0f2f5; border-radius: 6px; margin-bottom: 20px; }
    .switch { position: relative; display: inline-block; width: 50px; height: 28px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 28px; }
    .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
    input:checked + .slider { background-color: #1877f2; }
    input:checked + .slider:before { transform: translateX(22px); }
    #status-message { text-align: center; margin-top: 15px; font-weight: bold; }
  </style>
  </head>
  <body>
  <div class="container">
    <header><h1>ESP32 Lichtschranke</h1></header>
    <main>
      <div class="card stopwatch-card">
        <h3>Manuelle Zeitmessung</h3>
        <div class="toggle-container">
          <label for="manual-mode-switch">Manuelle Messung</label>
          <label class="switch">
            <input type="checkbox" id="manual-mode-switch">
            <span class="slider"></span>
          </label>
        </div>
        <div id="stopwatch-display">00:00:00.000</div>
        <div class="button-container">
          <button id="start-btn" disabled>Start</button>
          <button id="stop-btn" disabled>Stop</button>
          <button id="reset-btn" disabled>Reset</button>
        </div>
        <p id="status-message"></p>
      </div>
      <div class="card info-card">
        <p><b>Status:</b> Verbunden</p>
        <p><b>API:</b> <a href="/simple-status">/simple-status</a></p>
      </div>
    </main>
    <footer>&copy; 2025 DogTraining ESP32</footer>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const manualModeSwitch = document.getElementById('manual-mode-switch');
      const startBtn = document.getElementById('start-btn');
      const stopBtn = document.getElementById('stop-btn');
      const resetBtn = document.getElementById('reset-btn');
      const display = document.getElementById('stopwatch-display');
      const statusMessage = document.getElementById('status-message');

      let timer = null;
      let startTime = 0;
      let running = false;

      function updateDisplay() {
        const elapsed = Date.now() - startTime;
        const minutes = String(Math.floor(elapsed / 60000)).padStart(2, '0');
        const seconds = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
        const milliseconds = String(elapsed % 1000).padStart(3, '0');
        display.textContent = `${minutes}:${seconds}:${milliseconds}`;
      }

      function setStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? '#fa3e3e' : '#42b72a';
      }

      function updateButtonStates(isManualMode, isRunning) {
          startBtn.disabled = !isManualMode || isRunning;
          stopBtn.disabled = !isManualMode || !isRunning;
          resetBtn.disabled = !isManualMode || isRunning;
      }

      manualModeSwitch.addEventListener('change', () => {
        const isManual = manualModeSwitch.checked;
        if (!isManual && running) {
            // If toggled off during a run, stop and reset everything
            clearInterval(timer);
            timer = null;
            running = false;
            display.textContent = '00:00:00.000';
            setStatus('Manuelle Messung deaktiviert.');
        }
        updateButtonStates(isManual, running);
      });

      startBtn.addEventListener('click', async () => {
        setStatus('Starte Messung...');
        try {
          const response = await fetch('/manual/start', { method: 'POST' });
          const data = await response.json();
          if (response.ok && data.status === 'manual_start') {
            startTime = Date.now();
            running = true;
            timer = setInterval(updateDisplay, 10);
            updateButtonStates(true, true);
            setStatus('Messung läuft...');
          } else {
            setStatus(data.error || 'Start fehlgeschlagen', true);
          }
        } catch (e) {
          setStatus('Fehler: Keine Verbindung', true);
        }
      });

      stopBtn.addEventListener('click', async () => {
        setStatus('Stoppe Messung...');
        try {
          const response = await fetch('/manual/stop', { method: 'POST' });
          const data = await response.json();
          if (response.ok && data.status === 'manual_stop') {
            clearInterval(timer);
            timer = null;
            running = false;
            const finalTime = data.elapsed_ms;
            const minutes = String(Math.floor(finalTime / 60000)).padStart(2, '0');
            const seconds = String(Math.floor((finalTime % 60000) / 1000)).padStart(2, '0');
            const milliseconds = String(finalTime % 1000).padStart(3, '0');
            display.textContent = `${minutes}:${seconds}:${milliseconds}`;
            updateButtonStates(true, false);
            setStatus(`Gestoppt: ${finalTime} ms`);
          } else {
            setStatus(data.error || 'Stop fehlgeschlagen', true);
          }
        } catch (e) {
          setStatus('Fehler: Keine Verbindung', true);
        }
      });

      resetBtn.addEventListener('click', async () => {
          setStatus('Setze zurück...');
          try {
            // Also call the backend reset to be safe
            const response = await fetch('/reset', { method: 'POST' });
            if(response.ok) {
                running = false;
                clearInterval(timer);
                timer = null;
                display.textContent = '00:00:00.000';
                updateButtonStates(true, false);
                setStatus('Bereit für neue Messung.');
            } else {
                setStatus('Reset fehlgeschlagen', true);
            }
          } catch(e) {
              setStatus('Fehler: Keine Verbindung', true);
          }
      });
      
      // Initial state
      updateButtonStates(false, false);
    });
  </script>
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
    
