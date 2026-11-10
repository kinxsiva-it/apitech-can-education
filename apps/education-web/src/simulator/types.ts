/** Pure simulation contracts: never import React, Zustand or browser APIs here. */
export interface SimulationInputs {
  ignition: boolean
  throttle: number // percent, 0–100
  brake: boolean
}

export interface SimulationTelemetry {
  rpm: number
  soc: number // percent, 0–100
  voltage: number // volts
}

export interface CanFrame {
  readonly timestamp_ms: number
  readonly id: number
  readonly extended: boolean
  readonly data: Uint8Array // Classical CAN: 0–8 bytes; DLC is data.length.
  readonly source: 'VCU' | 'BMS' | 'Motor'
}

