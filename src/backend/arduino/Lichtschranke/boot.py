import network

print("Boot Run...")

ap = network.WLAN(network.AP_IF)
ap.active(True)
ap.config(essid='ESP_API', password='12345678')

ip, netmask, gateway, dns = ap.ifconfig()
print('AP gestartet:')
print('  IP-Adresse:', ip)
print('  Netzmaske: ', netmask)
print('  Gateway:   ', gateway)
print('  DNS:       ', dns)
