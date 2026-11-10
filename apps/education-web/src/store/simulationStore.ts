import { create } from 'zustand'
import type { SimulationInputs, SimulationTelemetry } from '../simulator/types'

interface SimulationState extends SimulationInputs, SimulationTelemetry {
  running: boolean
}

interface SimulationActions {
  setIgnition: (ignition: boolean) => void
  setThrottle: (throttle: number) => void
  setBrake: (brake: boolean) => void
  setRunning: (running: boolean) => void
  /** Called by the future engine adapter; telemetry is not derived in React. */
  updateTelemetry: (telemetry: SimulationTelemetry) => void
  reset: () => void
}

const initialState: SimulationState = {
  ignition: false,
  throttle: 0,
  brake: false,
  rpm: 0,
  soc: 80,
  voltage: 48,
  running: false,
}

const clampPercent = (value: number): number =>
  Math.min(100, Math.max(0, value))

export const useSimulationStore = create<SimulationState & SimulationActions>()(
  (set) => ({
    ...initialState,
    setIgnition: (ignition) =>
      set(ignition ? { ignition } : { ignition, throttle: 0, rpm: 0 }),
    setThrottle: (throttle) => {
      if (Number.isFinite(throttle)) set({ throttle: clampPercent(throttle) })
    },
    setBrake: (brake) => set({ brake }),
    setRunning: (running) => set({ running }),
    updateTelemetry: (telemetry) => {
      if (
        !Number.isFinite(telemetry.rpm) ||
        !Number.isFinite(telemetry.soc) ||
        !Number.isFinite(telemetry.voltage)
      ) return
      set({
        rpm: Math.max(0, telemetry.rpm),
        soc: clampPercent(telemetry.soc),
        voltage: Math.max(0, telemetry.voltage),
      })
    },
    reset: () => set({ ...initialState }),
  }),
)

