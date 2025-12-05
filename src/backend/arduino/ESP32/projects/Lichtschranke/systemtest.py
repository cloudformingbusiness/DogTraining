import machine
import time
import ssd1306
import sh1106


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
	print("Audiotest gestartet...")
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

	print("LED-Test gestartet...")

	# Testsequenz: Beide Lampen blinken abwechselnd 2x
	for i in range(2):
		green_led.on()
		red_led.off()
		#print("Grün AN, Rot AUS")
		time.sleep(0.2)
		green_led.off()
		red_led.on()
		#print("Grün AUS, Rot AN")
		time.sleep(0.2)
		green_led.off()
		red_led.off()
		#print("Beide AUS")
		time.sleep(0.2)


def clear_artifacts(display):
    """Übermalt den fehlerhaften linken Rand des SH1106-Displays."""
    display.fill_rect(0, 0, 8, 64, 0)

def rotate180(display):
    """Dreht den Framebuffer um 180 Grad. Kompatibel mit SH1106 und SSD1306."""
    
    # Prüfen, welcher Treiber verwendet wird und den richtigen Buffer auswählen
    if hasattr(display, 'buffer'):
        # SSD1306
        buffer = display.buffer
    elif hasattr(display, 'displaybuf'):
        # SH1106
        buffer = display.displaybuf
    else:
        # Unbekannter Treiber, nichts tun
        print("Warnung: Unbekannter Display-Treiber, Drehung nicht möglich.")
        return

    width = display.width
    pages = display.pages
    
    # Erstelle eine temporäre Kopie des Buffers
    temp_buffer = bytearray(buffer)
    
    for i in range(len(temp_buffer)):
        # Berechne die neue Position des Bytes
        page = i // width
        col = i % width
        
        new_page = pages - 1 - page
        new_col = width - 1 - col
        
        new_index = new_page * width + new_col
        
        # Rotiere die Bits innerhalb des Bytes
        original_byte = temp_buffer[i]
        rotated_byte = 0
        for j in range(8):
            if (original_byte >> j) & 1:
                rotated_byte |= 1 << (7 - j)
        
        buffer[new_index] = rotated_byte


def display_test_SH1106():
    print("Displaytest SH11306 gestartet...")
    i2c = machine.I2C(scl=machine.Pin(22), sda=machine.Pin(21))
    display = sh1106.SH1106_I2C(128, 64, i2c, rotate=0)
    time.sleep(0.2)
    
    display.fill(0)
    clear_artifacts(display)
    display.show()

    # 1. Füllmuster (optimiert gegen Flackern)
    old_i = -8
    for i in range(0, 64, 8):
        if old_i >= 0:
            display.fill_rect(0, old_i, 128, 4, 0)
        display.fill_rect(0, i, 128, 4, 1)
        clear_artifacts(display)
        display.show()
        old_i = i
        time.sleep(0.05)
        
    # 2. Textanimation (optimiert gegen Flackern)
    time.sleep(0.5)
    display.fill(0)
    old_x = -32
    text_width = 8 * len('OK')
    for x in range(-32, 128, 4):
        display.fill_rect(old_x, 10, text_width, 8, 0)
        display.text('OK', x, 10, 1)
        clear_artifacts(display)
        display.show()
        old_x = x
        time.sleep(0.03)
        
    # 3. Linien (statisch)
    time.sleep(0.5)
    display.fill(0)
    clear_artifacts(display)
    for y in range(0, 32, 4):
        display.hline(0, y, 128, 1)
    for x in range(0, 128, 8):
        display.vline(x, 32, 32, 1)
    display.show()
    time.sleep(0.5)
    
    # 4. Invertieren
    display.invert(True)
    time.sleep(0.5)
    display.invert(False)
    
    # Abschlussbildschirm
    display.fill(0)
    clear_artifacts(display)
    display.text('Display SH1106!', 8, 28, 1)
    display.show()
    time.sleep(2)

def display_test_SSD1306():
    print("Displaytest SSD1306 gestartet...")
    i2c = machine.I2C(scl=machine.Pin(22), sda=machine.Pin(21))
    display = ssd1306.SSD1306_I2C(128, 64, i2c)
    time.sleep(0.2)
    
    # Start mit leerem Bildschirm
    display.fill(0)
    rotate180(display)
    display.show()

    # 1. Füllmuster (optimiert gegen Flackern)
    old_i = -8
    for i in range(0, 64, 8):
        if old_i >= 0:
            display.fill_rect(0, old_i, 128, 4, 0) # Lösche alten Balken
        display.fill_rect(0, i, 128, 4, 1) # Zeichne neuen Balken
        rotate180(display)
        display.show()
        old_i = i
        time.sleep(0.05)
        
    # 2. Textanimation (optimiert gegen Flackern)
    time.sleep(0.5)
    display.fill(0)
    rotate180(display)
    display.show()
    
    old_x = -32
    text_width = 8 * len('OK')
    for x in range(-32, 128, 4):
        display.fill_rect(old_x, 10, text_width, 8, 0) # Lösche alten Text
        display.text('OK', x, 10, 1) # Zeichne neuen Text
        rotate180(display)
        display.show()
        old_x = x
        time.sleep(0.03)
        
    # 3. Linien (statisch)
    time.sleep(0.5)
    display.fill(0)
    for y in range(0, 32, 4):
        display.hline(0, y, 128, 1)
    for x in range(0, 128, 8):
        display.vline(x, 32, 32, 1)
    rotate180(display)
    display.show()
    time.sleep(0.5)
    
    # 4. Invertieren
    display.invert(True)
    time.sleep(0.5)
    display.invert(False)
    
    # Abschlussbildschirm
    display.fill(0)
    text = "SSD1306 Test OK"
    text_width = len(text) * 8
    x_pos = (display.width - text_width) // 2
    y_pos = (display.height - 8) // 2
    display.text(text, x_pos, y_pos, 1)
    rotate180(display)
    display.show()
    time.sleep(3)


def clear_display_SH1106():
    i2c = machine.I2C(scl=machine.Pin(22), sda=machine.Pin(21))
    display = sh1106.SH1106_I2C(128, 64, i2c)
    display.fill(0)
    display.show()
    


def run():
    # Systemstart-Testsequenz
    print("")
    print("############################")
    print("# Systemmtest gestartet... #")# I2C-Scanner
    print("############################")

    #scan_i2c()
    play_starwars()
    LedTest()
    #display_test_SH1106()
    display_test_SSD1306()


    print("############################")
    print("# Systemmtest ende.        #")      
    print("############################")
    print("")



