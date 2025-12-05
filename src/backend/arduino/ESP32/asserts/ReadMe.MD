Flash löschen

py -3 -m esptool --chip esp32 --port COM10 erase-flash

MicroPython flashen

py -3 -m esptool --chip esp32 --port COM10 --baud 460800 write-flash -z 0x1000 C:\Entwicklung\DogTraining\src\backend\arduino\ESP32\ESP32_GENERIC-20250911-v1.26.1.bin

Manuelles Aufräumen / Testen via mpremote (robuster)

Falls Pymakr weiterhin meckert, lade die Dateien manuell per mpremote hoch und prüfe den Remote-FS:

Liste Dateien auf dem ESP

py -3 -m mpremote connect COM10 fs ls

Datei löschen (falls vorhanden)

py -3 -m mpremote connect COM10 fs rm /main.py

(oder fs rm /somepath.py)

Verzeichnisinhalt sehen per REPL

py -3 -m mpremote connect COM10 repl

# Im REPL

import os
print(os.listdir())

# falls du ein Verzeichnis entfernen willst

os.remove('name.py')      # einzelne Datei
os.rmdir('foldername')    # nur wenn leer

Datei hochladen
Wechsle in dein Projektordner (oder gib vollen Pfad an):

cd C:\Entwicklung\ESP32Project
py -3 -m mpremote connect COM10 fs put main.py :/main.py
py -3 -m mpremote connect COM10 fs put boot.py :/boot.py

Neustart

py -3 -m mpremote connect COM10 reset

Wenn das klappt, läuft dein Skript und Pymakr-Probleme sind umgangen.
