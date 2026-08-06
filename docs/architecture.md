# Architecture

## Data path

```
sensors ──I2C/CAN──> ESP32 node ──Bluetooth──> phone/tablet on dash
                          │
                          └──> SD card (black box, always)
                          └──> small dash screen (backup)
```

**The phone is a display, not the system.** Losing it loses the display and
nothing else. Everything writes to SD regardless.

Bluetooth rather than Wi-Fi, because joining an ESP32 access point kills cellular
data on the phone, and a native app that can hold both matters more than the
bandwidth.

## Sensors

| Signal | Source |
|---|---|
| Tach | engine tach wire |
| Altitude, climb rate | barometric |
| Airspeed | pitot, differential |
| Attitude, pitch | IMU, plus phone IMU |
| CHT / EGT | thermocouple |
| Fuel level | under evaluation, lidar from tank top preferred over capacitive |

## Dead sensor handling

Grey out the box but hold the last known value. Log the dropout. **One** audio
alert on disconnect, and no repeats for a flaky sensor. Tell the pilot after
landing so it gets fixed on the ground rather than in the air.

## Configuration

A single config file describes everything about an aircraft: sensors present,
scaling, limits, units, alert thresholds. All units software selectable. A
web-based tool generates it.

## Protocol

Standardized and open, on I2C or CAN. DroneCAN gets its own spec document,
referenced from the PRD. The intent is that a distributed node from someone else's
project can join the bus.

## Extensibility

The board carries extensive open expansion capability so others can adapt it to
things not yet thought of, including tiny drone flight computers. Framed as a
flight computer for experimental aircraft that owners can modify themselves,
with a standardized format, software, and protocol.
