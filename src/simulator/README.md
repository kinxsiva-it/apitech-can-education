# Simulation core

Pure TypeScript only. SimulationClock advances only when the caller ticks it.
A later UI adapter should own browser timers and publish engine snapshots to Zustand.

Next modules: ScenarioEngine, CanBusScheduler and ecu/{Vcu,Bms,Motor}.
Keep ECU transitions deterministic: pass inputs and simulation time explicitly.
Schedule frames from simulation time, not Date.now() or setInterval() inside the core.
The initial scaffold does not yet produce CAN traffic or calculate motor telemetry.

