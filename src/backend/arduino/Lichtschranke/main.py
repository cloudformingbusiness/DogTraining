# main.py
print("Main Run...")
import uasyncio as asyncio
import systemtest

from mqtt_client import MQTTHandler
from http_server import HTTPServer

mqtt_handler = MQTTHandler()
http_server = HTTPServer(mqtt_handler)

loop = asyncio.get_event_loop()
loop.create_task(mqtt_handler.loop())
loop.create_task(http_server.loop())
loop.run_forever()