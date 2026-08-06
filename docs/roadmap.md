# Roadmap

## Phase 0, bench

Beta app that pairs with a cheap OBD Bluetooth or Wi-Fi adapter and renders car
data as an aircraft-style glass HUD. Run it on a phone first, then on a large
Android dash screen. Purpose is evaluating the UI before any aircraft hardware
exists, and testing whether phone accelerometer data is usable for attitude.

## Phase 1, v1 on a paramotor

Breadboard only, no custom board. Gateway and data node are one unit. Target
aircraft is a ParaPlane PM-2, which currently has an hour meter and an altimeter.

Scope: tach, altitude, climb rate, airspeed, SD logging, phone display,
audio alerts.

## Phase 2, the RC validation aircraft

Quarter-scale model of the airframe project. IMU, pitot, SD logging. First real
use of Junco as a data acquisition system rather than a display, producing logged
roll rate against stick position.

This is also where a control-authority version gets developed, on an aircraft where
a crash costs $600.

## Phase 3, distributed sensors

Shrink the sensors, distribute them around the aircraft, standardized protocol on
the wire. Multi-engine aircraft get one node with two sensor sets. Config file
describes the aircraft. Web-based configuration tool.

## Phase 4, kit

Bare boards plus components plus a printed case, sold as a full kit, direct.
Through-hole and hand-solderable. Enough kits to fund AirVenture trips, not a
business.

## Phase 5, boxed product

A small box that bolts to the frame, gets calibrated, and does as much as possible
in one package. Tested, certified where applicable, and manufactured by someone
other than the author.

The open version stays open, and builders inherit the associated risks.

## Under consideration

- SDR ADS-B receiver, possibly a transmitter
- Lidar fuel level sensing from the top of the tank, avoiding capacitive methods
- E-ink or high-brightness backup screen for direct sunlight

## The one goal that matters

Junco exists and lives on well beyond its author. Money is a bonus, not the point.
