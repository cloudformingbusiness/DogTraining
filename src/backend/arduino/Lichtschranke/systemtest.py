import machine
import time
import ssd1306
import sh1106
def play_bvb():
	# BVB-Hymne (Heja BVB) - stark vereinfacht, Melodieauszug
	notes = [
		(392, 0.3), # G
		(392, 0.3), # G
		(440, 0.3), # A
		(392, 0.3), # G
		(349, 0.3), # F
		(392, 0.3), # G
		(523, 0.5), # C'
		(392, 0.3), # G
		(392, 0.3), # G
		(440, 0.3), # A
		(392, 0.3), # G
		(349, 0.3), # F
		(392, 0.3), # G
		(349, 0.5), # F
	]
	print("Spiele BVB-Hymne (Heja BVB)...")
	for freq, dur in notes:
		play_tone(freq, dur)
	if buzzer:
		buzzer.deinit()
	print("BVB-Hymne beendet.")



print("systemtest Run...")
# I2C-Scanner
def scan_i2c():
	print("Starte I2C-Scan...")
	i2c = machine.I2C(scl=machine.Pin(22), sda=machine.Pin(21))
	devices = i2c.scan()
	if devices:
		print("Gefundene I2C-Adressen:")
		for device in devices:
			print(hex(device))
	else:
		print("Keine I2C-Geräte gefunden!")



# Summer/Buzzer an GPIO 23 (PWM für passiven Summer)
buzzer_pin = 23
buzzer = None

def play_tone(freq, duration):
    global buzzer
    if buzzer is None:
        buzzer = machine.PWM(machine.Pin(buzzer_pin))
    buzzer.freq(freq)
    buzzer.duty(512)
    time.sleep(duration)
    buzzer.duty(0)
    time.sleep(0.05)

def play_starwars():
	# Star Wars Theme (vereinfachte Melodie)
	notes = [
		(440, 0.4), # A
		(440, 0.4), # A
		(440, 0.4), # A
		(349, 0.3), # F
		(523, 0.1), # C'
		(440, 0.4), # A
		(349, 0.3), # F
		(523, 0.1), # C'
		(440, 0.8), # A
		(659, 0.4), # E'
		(659, 0.4), # E'
		(659, 0.4), # E'
		(698, 0.3), # F'
		(523, 0.1), # C'
		(415, 0.4), # G#
		(349, 0.3), # F
		(523, 0.1), # C'
		(440, 0.8), # A
	]
	print("Spiele Star Wars Theme...")
	for freq, dur in notes:
		play_tone(freq, dur)
	if buzzer:
		buzzer.deinit()
	print("Star Wars Theme beendet.")



def LedTest():
	# Pin-Definitionen
	PIN_GREEN = 2
	PIN_RED = 15

	green_led = machine.Pin(PIN_GREEN, machine.Pin.OUT)
	red_led = machine.Pin(PIN_RED, machine.Pin.OUT)

	print("LED-Test gestartet.")

	# Testsequenz: Beide Lampen blinken abwechselnd 2x
	for i in range(2):
		green_led.on()
		red_led.off()
		print("Grün AN, Rot AUS")
		time.sleep(0.4)
		green_led.off()
		red_led.on()
		print("Grün AUS, Rot AN")
		time.sleep(0.4)
		green_led.off()
		red_led.off()
		print("Beide AUS")
		time.sleep(0.2)

	print("LED-Test beendet.")

def display_test_SH1106():
    print("Starte SH1106 Display-Test...")
    clear_display_SH1106()
    i2c = machine.I2C(scl=machine.Pin(22), sda=machine.Pin(21))
    display = sh1106.SH1106_I2C(128, 64, i2c)
    time.sleep(0.2)
    # 1. Füllmuster
    for i in range(0, 64, 8):
        display.fill(0)
        display.fill_rect(0, i, 128, 4, 1)
        display.show()
        time.sleep(0.05)
    # 2. Textanimation
    for x in range(-32, 128, 4):
        display.fill(0)
        display.text('OK', x, 10, 1)
        display.show()
        time.sleep(0.03)
    # 3. Linien
    display.fill(0)
    for y in range(0, 32, 4):
        display.hline(0, y, 128, 1)
    for x in range(0, 128, 8):
        display.vline(x, 0, 32, 1)
    display.show()
    time.sleep(0.5)
    # 4. Invertieren
    display.invert(True)
    time.sleep(0.5)
    display.invert(False)
    display.fill(0)
    display.text('Display SH1106!', 12, 10, 1)
    display.show()
    time.sleep(1)

def display_test_SSD1306():
    print("Starte SSD1306 Display-Test...")
    i2c = machine.I2C(scl=machine.Pin(22), sda=machine.Pin(21))
    display = ssd1306.SSD1306_I2C(128, 64, i2c)
    time.sleep(0.2)
    #display.rotate(True)  # 180 Grad drehen, falls unterstützt
    # 1. Füllmuster
    for i in range(0, 64, 8):
        display.fill(0)
        display.fill_rect(0, i, 128, 4, 1)
        display.show()
        time.sleep(0.05)
    # 2. Textanimation
    for x in range(-32, 128, 4):
        display.fill(0)
        display.text('OK', x, 10, 1)
        display.show()
        time.sleep(0.03)
    # 3. Linien
    display.fill(0)
    for y in range(0, 32, 4):
        display.hline(0, y, 128, 1)
    for x in range(0, 128, 8):
        display.vline(x, 0, 32, 1)
    display.show()
    time.sleep(0.5)
    # 4. Invertieren
    display.invert(True)
    time.sleep(0.5)
    display.invert(False)
    display.fill(0)
    display.text('Display SSD1306!', 12, 10, 1)
    display.show()
    time.sleep(1)

def clear_display_SH1106():
    i2c = machine.I2C(scl=machine.Pin(22), sda=machine.Pin(21))
    display = sh1106.SH1106_I2C(128, 64, i2c)
    display.fill(0)
    display.show()
    



# Systemstart-Testsequenz

#scan_i2c()
play_starwars()
LedTest()
display_test_SSD1306()
#display_test_SH1106()
print("Systemstart-Testsequenz abgeschlossen.")
