# mqtt_client.py
import uasyncio as asyncio
from umqtt.simple import MQTTClient


# MQTT aktivieren/deaktivieren
ENABLE_MQTT = False

MQTT_BROKER = "192.168.178.50"  # IP des PCs mit Mosquitto
MQTT_CLIENT_ID = "esp_local"
MQTT_TOPIC_SUB = b"esp/test/in"
MQTT_TOPIC_PUB = b"esp/test/out"

print("mqtt_client Run...")

class MQTTHandler:
    def __init__(self):
        if ENABLE_MQTT:
            self.client = MQTTClient(MQTT_CLIENT_ID, MQTT_BROKER)
            self.client.set_callback(self.callback)
            self.client.connect()
            self.client.subscribe(MQTT_TOPIC_SUB)
            print("MQTT verbunden mit Broker:", MQTT_BROKER)
        else:
            print("MQTT ist deaktiviert.")

    def callback(self, topic, msg):
        print("MQTT Nachricht erhalten:", topic, msg)

    async def loop(self):
        while True:
            if ENABLE_MQTT:
                try:
                    self.client.check_msg()
                except:
                    pass
            await asyncio.sleep(0.01)

    def publish(self, msg):
        if ENABLE_MQTT:
            self.client.publish(MQTT_TOPIC_PUB, msg)
        else:
            print("MQTT Publish ignoriert, da deaktiviert.")
