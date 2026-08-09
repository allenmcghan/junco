# Enclosure and air data hardware

Printable parts. Nothing here yet.

Print in ASA, 1.5 mm walls, mounted on grommet or wire rope isolators. No PLA anywhere, and nothing printed within a foot of a cylinder.

The two parts worth real design effort are the pitot and the static plenum, since nobody sells them cheaply and the plenum geometry determines whether the vario works or just reports throttle position.

A Pi-class build adds a third: a ducted ram air cooling path, which is what makes a 0 to 50C board viable on an engine cage. Its inlet is a pressure source, so it must not couple into the static plenum or disturb the pitot, and a vented enclosure still has to shield against CDI ignition. See docs/prd.md section 23.
