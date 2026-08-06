# Junco

An open flight computer for experimental and ultralight aircraft.

Cheap sensors, an ESP32, your phone as the display, and a black box on an SD card.
Built because ultralight and experimental pilots fly with an hour meter and an
altimeter while a $30 microcontroller can log everything.

**Status:** design and prototype. See [docs/roadmap.md](docs/roadmap.md).

---

## What it does

- **Air data and engine data**: altitude, climb rate, airspeed, tach, CHT, fuel
- **Display**: streams to a phone or tablet mounted on the dash, over Bluetooth,
  the same way an OBD adapter does
- **Automated pilot logging**: connect to the aircraft and get a full flight
  record, takeoff, route, speeds, times, ready for a logbook
- **Black box**: everything to SD card. Experimental pilots currently have nothing
- **Audio alerts** through the phone to a paired Bluetooth headset, which most
  ultralight pilots already wear
- **Angle of attack tone**, which is the highest-value loss-of-control
  intervention per dollar in light aviation

## Design principles

**The sensor network does the work.** The phone is a display and a speaker. Losing
the phone should not lose the flight data, so everything records locally.

**Open protocol on the wire.** Distributed sensors, standardized format, so someone
can adapt it to something nobody has thought of yet, including small drone flight
computers.

**Hand-solderable.** Through-hole, USB-C, off-the-shelf parts, 3D printed case.
A builder with a soldering iron should be able to make one.

**Open forever.** Anyone is free to build these, sell them, or fork this. There is
a donate link and no paywall.

## Architecture

ESP32 collects sensor data and sends it to the phone over Bluetooth. The phone's
own accelerometer, gyro, and barometer are used as additional sensors. A small
always-on screen on the dash provides backup so basic function survives losing the
phone connection.

See [docs/architecture.md](docs/architecture.md).

## Autopilot

Not out of scope, but deliberately staged. Junco as it exists reads, displays,
logs, and alerts. If it dies in flight, nothing happens.

The moment it moves a servo it becomes flight critical and needs a defined failure
mode, a manual reversion path, and a development standard. **Those are two products
with two standards, and the first must not quietly become the second.**

Where an authority version is being developed, it is on aircraft whose control
architecture is fail-safe by design. See the
[airframe project](https://github.com/allenmcghan/nuthatch) for one example: a
spoileron-controlled aircraft where the control is single-acting with spring
return, so a servo hardover closes the spoiler rather than jamming the stick.

## Repository layout

```
hardware/   schematic, board, case
firmware/   ESP32
app/        Android primary, iOS if it happens
docs/       architecture, protocol spec, roadmap
```

## Compatibility goal

Every type of experimental and ultralight aircraft: gyroplanes, fixed wing, mini
jets, paramotors. A config file describes the aircraft, all units software
selectable, with a web-based configuration tool.

## License

Hardware: CERN-OHL-S v2. Firmware and app: MIT.

## Disclaimer

**Not certified for any purpose. Not a substitute for required instruments.**

This is experimental hardware for experimental aircraft. If you build it and fly
it, you are responsible for its behavior and for your own airworthiness
determination. No warranty of any kind, expressed or implied.

Do not use as a primary flight reference.
