# boot.py
import network # type: ignore
import time
import systemtest

SSID = "Lichtschranke_ESP32"
PASSWORD = "Pass123word"

systemtest.run() # Führe Systemtest aus



def start_ap():
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    ap.config(essid=SSID, password=PASSWORD, authmode=3)  # 3 = WPA/WPA2-PSK

    # optionale feste IP
    try:
        ap.ifconfig(("192.168.4.1", "255.255.255.0", "192.168.4.1", "192.168.4.1"))
    except:
        pass

    while not ap.active():
        time.sleep(0.1)
    
    ip, netmask, gateway, dns = ap.ifconfig()
    print("==============================")
    print("   ESP32 Access Point aktiv!   ")
    print("------------------------------")
    print(f"  SSID:     {SSID}")
    print(f"  Passwort: {PASSWORD}")
    print(f"  IP:       {ip}")
    print(f"  Gateway:  {gateway}")
    print(f"  Netmask:  {netmask}")
    print(f"  DNS:      {dns}")
    print("==============================")

start_ap()