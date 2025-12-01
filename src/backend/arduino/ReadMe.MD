Flash löschen

py -3 -m esptool --chip esp32 --port COM10 erase-flash

MicroPython flashen

py -3 -m esptool --chip esp32 --port COM10 --baud 460800 write-flash -z 0x1000 C:\Entwicklung\DogTraining\src\backend\arduino\ESP32\ESP32_GENERIC-20250911-v1.26.1.bin
