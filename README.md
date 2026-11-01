# APITech CAN Education

React + Vite + strict TypeScript foundation for a browser-first CAN education simulator.

Current UI preview: the home page is a CAN Education workspace inspired by the
customer's reference UI (dark panels, orange/blue accents and top navigation).
Navigation and topic selection work locally. Education content and telemetry areas
remain empty. No simulation store or telemetry is connected to this preview.
The previous dashboard/iframe components and unused starter images remain local
and are excluded from Git. The large customer reference HTML is also local-only.
Their appearance in the workspace tree below does not mean they are tracked.

The EV SYSTEM EXPLORER tab uses EvSystemExplorer.tsx, adapted from the
reference's Motion of Mechanic arrangement: a large system illustration,
component legend, display controls, and a right-hand inspector/telemetry area.
The EV diagram is an SVG concept illustration; its view presets adjust the
illustration presentation, not a 3D camera. Layer toggles and component selection
work locally. Playback/vehicle inputs remain disabled and telemetry is blank
until engine integration.

EV SIMULATION is a separate EvSimulation.tsx page inspired by SIMULATDATA:
vehicle inputs/scenario selection on the left, gauges/timeline in the center,
and network status/ECU nodes/frame preview on the right. Ignition, brake,
throttle, initial SOC and scenario selection are local UI state only; numerical
input settings are not simulated output. Reset inputs restores these UI defaults.
Start/Pause are disabled. Telemetry and CAN results stay blank pending engine work.
Shortcuts open the existing Monitor/Decoder placeholders or System Explorer.

## Run this checkout

For menu ownership, branch selection and commit workflow, see
[Branch guide](docs/BRANCH_GUIDE.md). New menu UI work uses separate
features/ui-* branches; shared navigation uses features/workspace-navigation.

Requires Node.js 22.12+ (Node 22.20 was used for validation).

```powershell
npm install
npm run dev
```

```powershell
npm run build
npm run lint
npm run preview
```

## Initialize a fresh project

Run these commands from the parent directory, not inside this existing checkout:

```powershell
npm create vite@latest apitech-can-education -- --template react-ts
cd apitech-can-education
npm install
npm install zustand @supabase/supabase-js react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

Configure vite.config.ts with plugins: [react(), tailwindcss()] and import
tailwindcss from '@tailwindcss/vite'. In src/index.css use:

```css
@import "tailwindcss";
```

Tailwind uses the current Vite plugin workflow; no tailwind init command is required.
Ensure "strict": true in both tsconfig.app.json and tsconfig.node.json.
This checkout also enables noUncheckedIndexedAccess for application code.

References: [Vite setup](https://vite.dev/guide/) and
[Tailwind Vite setup](https://tailwindcss.com/docs/installation/using-vite).

## Directory structure

Application/source tree (excludes .git, node_modules, dist and temporary scaffolding):

```text
apitech-can-education/
├── docs/
│   └── APITech_CAN_Bus_Education_Simulation_Handoff.md
├── public/
│   ├── assets/
│   │   └── API Motorcy SIM - Web (standalone) (2).html
│   ├── favicon.svg
│   └── icons.svg
├── content/
│   ├── README.md
│   ├── lessons/
│   │   └── .gitkeep
│   ├── scenarios/
│   │   └── .gitkeep
│   └── dbc/
│       └── training-network.json
├── src/
│   ├── assets/                    # Unused original Vite template images
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── ui/
│   │   ├── Dashboard.tsx
│   │   ├── EducationWorkspace.tsx
│   │   ├── EvSimulation.tsx
│   │   ├── EvSystemExplorer.tsx
│   │   ├── LabIcon.tsx
│   │   └── VehicleScene.tsx
│   ├── simulator/
│   │   ├── README.md
│   │   ├── SimulationClock.ts
│   │   └── types.ts
│   ├── decoder/
│   │   └── types.ts
│   ├── store/
│   │   └── simulationStore.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── README.md
├── APITech_CAN_Bus_Education_Simulation_Handoff.md  # Preserved source
└── API Motorcy SIM - Web (standalone) (2).html     # Preserved source
```

Original customer files remain at the root; copies are placed in docs/ and
public/assets/ without modifying the originals.

## Layer boundaries

- src/ui/: React controls, future CAN Monitor and Lesson Player, and iframe viewer.
- src/simulator/: pure TypeScript contracts and explicit fixed-step clock.
  Add ScenarioEngine, CanBusScheduler and ecu/{Vcu,Bms,Motor} here.
  No React, Zustand, DOM, wall-clock reads or networking in this layer.
- src/decoder/: independent signal definitions; add bit extraction and scaling here.
- src/store/: Zustand state and actions; a future adapter publishes engine snapshots.
- content/: bundled JSON configuration, lessons, scenarios and synthetic signal maps.
  Import JSON by relative path from source. It is not served as a public URL.
- public/assets/: files copied unchanged into the production build.

## SignalConfig

See src/decoder/types.ts. It includes name, start_bit, length, byte_order,
signed, factor, offset and optional unit/min/max.
Physical value = raw value * factor + offset.
Bit numbering follows DBC sawtooth convention: Intel start_bit identifies the LSB;
Motorola start_bit identifies the MSB. The decoder itself is not implemented yet.
Validate imported configuration at runtime: types alone do not validate JSON.

training-network.json defines the synthetic training BMS message 0x280
(decimal 640). E0 01 50 00 00 00 00 00 represents 48.0 V and 80% SOC.
This JSON mapping is not an actual Vector DBC parser or OEM specification.

## Zustand

src/store/simulationStore.ts exposes ignition, throttle, brake, rpm, soc,
voltage, running and typed actions. Percentages are clamped and non-finite
numeric updates are ignored. Components subscribe to individual fields:

```tsx
const throttle = useSimulationStore((state) => state.throttle)
const setThrottle = useSimulationStore((state) => state.setThrottle)
```

Engine integration can use useSimulationStore.getState().updateTelemetry(snapshot)
from an adapter outside the pure core. Reset the engine clock and scenario state
alongside the store when that adapter is implemented.

## Scope and next steps

This is initial boilerplate. Controls update the store; RPM is not calculated,
no CAN frames are emitted and the clock is not yet connected to a browser timer.
CAN Monitor, Lesson Player, ECU models, scheduler, decoder implementation and
scenario replay are future modules.

The customer clarified that the supplied standalone HTML is a UI reference only.
Develop the CAN education UI in React using that reference where appropriate.
Embedding the original file, 3D rendering and postMessage integration are not MVP
requirements. VehicleScene.tsx is an unused scaffold reference viewer.
It would embed the supplied standalone HTML in an allow-scripts sandbox.
Its runtime behavior has not been verified. postMessage synchronization requires a
verified, versioned contract and payload/source/origin validation; none is assumed.
The current sandbox gives the document an opaque origin.

The app needs no Supabase connection. The SDK is installed for a future phase;
no credentials or client are configured. Only a publishable key belongs in browser
configuration; keep service-role secrets on a server.

Browser-first architecture is in place; offline reload/install is not implemented.
Add a service worker and cache policy in a later phase for the production app.
The roughly 33 MB standalone reference is not a required offline learning asset.

BrowserRouter needs host fallback to index.html for deep links such as /vehicle.
Keep simulation code independent from that deployment choice.
