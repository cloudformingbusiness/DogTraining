@echo off
setlocal

REM --- Konfiguration ---
set "SSID=Lichtschranke_ESP32"
set "PASSWORD=Pass123word"
set "PROFILE_XML=%~dp0esp32_wlan_profile.xml"
set "ESP32_IP=192.168.4.1"

echo Erstelle temporaeres WLAN-Profil fuer %SSID%...

REM --- Erstelle die XML-Profildatei ---
(
    echo ^<?xml version="1.0"?^>
    echo ^<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1"^>
    echo     ^<name^>%SSID%^</name^>
    echo     ^<SSIDConfig^>
    echo         ^<SSID^>
    echo             ^<name^>%SSID%^</name^>
    echo         ^</SSID^>
    echo     ^</SSIDConfig^>
    echo     ^<connectionType^>ESS^</connectionType^>
    echo     ^<connectionMode^>auto^</connectionMode^>
    echo     ^<MSM^>
    echo         ^<security^>
    echo             ^<authEncryption^>
    echo                 ^<authentication^>WPA2PSK^</authentication^>
    echo                 ^<encryption^>AES^</encryption^>
    echo                 ^<useOneX^>false^</useOneX^>
    echo             ^</authEncryption^>
    echo             ^<sharedKey^>
    echo                 ^<keyType^>passPhrase^</keyType^>
    echo                 ^<protected^>false^</protected^>
    echo                 ^<keyMaterial^>%PASSWORD%^</keyMaterial^>
    echo             ^</sharedKey^>
    echo         ^</security^>
    echo     ^</MSM^>
    echo ^</WLANProfile^>
) > "%PROFILE_XML%"

REM --- Altes Profil loeschen und neues hinzufuegen ---
echo Loesche eventuell vorhandenes altes Profil...
netsh wlan delete profile name="%SSID%" >nul 2>&1

echo Fuege neues WLAN-Profil hinzu...
netsh wlan add profile filename="%PROFILE_XML%"

REM --- Mit dem WLAN verbinden ---
echo Verbinde mit %SSID%...
netsh wlan connect name="%SSID%"

REM --- Warte auf Verbindung durch Pingen des Gateways ---
echo Warte auf Verbindung mit dem ESP32 (%ESP32_IP%)...
:pingloop
REM Robuster Warte-Befehl, der "timeout" ersetzt
ping -n 2 127.0.0.1 >nul
ping -n 1 %ESP32_IP% | find "TTL=" >nul
if errorlevel 1 (
    echo -n .
    goto pingloop
)

echo.
echo Verbindung zum ESP32 hergestellt.

REM --- HTTP-Request an ESP32 API senden ---
echo Sende Status-Request an http://%ESP32_IP%/simple-status
curl --fail --max-time 5 "http://%ESP32_IP%/simple-status"
if errorlevel 1 (
    echo Request fehlgeschlagen.
    goto cleanup
)

echo.
echo Skript erfolgreich beendet.

:cleanup
REM --- Temporaere Profildatei loeschen ---
echo Raeume auf...
del "%PROFILE_XML%" >nul 2>&1
netsh wlan delete profile name="%SSID%" >nul 2>&1

endlocal
echo.
pause
