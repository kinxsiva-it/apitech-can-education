/** DBC sawtooth numbering: each byte's bits are numbered LSB 0 to MSB 7. */
export type ByteOrder = 'little_endian' | 'big_endian'

export interface SignalConfig {
  readonly name: string
  /** LSB for Intel/little endian; MSB for Motorola/big endian. */
  readonly start_bit: number
  readonly length: number
  readonly byte_order: ByteOrder
  readonly signed: boolean
  readonly factor: number
  readonly offset: number
  readonly unit?: string
  readonly min?: number
  readonly max?: number
}

export interface MessageConfig {
  readonly id: number
  readonly name: string
  readonly dlc: number
  readonly period_ms: number
  readonly signals: readonly SignalConfig[]
}

// Physical value = raw value * factor + offset.
// Validate external JSON before using these types: TypeScript is not runtime validation.

