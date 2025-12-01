from machine import Pin
import time

# LED-Pin (eingebaute LED ist oft auf Pin 2)
led = Pin(2, Pin.OUT)

print("ESP32 Testprogramm gestartet!")

while True:
    led.on()
    print("LED ON")
    time.sleep(0.5)

    led.off()
    print("LED OFF")
    time.sleep(0.5)