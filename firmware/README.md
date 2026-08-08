# Node firmware

Nothing here yet.

Phase 0 is an EMI reality check, not firmware: an ESP32-S3 and one baro sensor on a breadboard, ground runs at every RPM with the board where it will live, watching for I2C lockups, resets, and BLE dropouts. Log enclosure temperature at the same time, since the hardware is already running and that measurement decides whether a Pi-class build is viable on the cage. Write firmware after that answers.

Two compute paths are supported and both meet the same specifications. The ESP32-S3 build is an ESP-IDF project. A Pi-class build is Linux and carries extra requirements on its boot medium and shutdown path. See docs/prd.md section 23.

Nothing substantial can be written here before `spec/ble-telemetry.md` exists, because that link carries every value the pilot sees.
