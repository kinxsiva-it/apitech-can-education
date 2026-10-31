# Teaching configuration

lessons/ holds future lesson definitions; scenarios/ holds future drive scripts.
dbc/training-network.json is a synthetic JSON signal map, not a Vector .dbc file.
Its decimal ID 640 is hexadecimal 0x280. Payload E0 01 50 00 00 00 00 00
represents 48.0 V and 80% SOC.

Vite can bundle this folder with relative JSON imports, for example:
import network from '../../content/dbc/training-network.json'
It is not a runtime public URL. Add runtime validation before accepting user files.
