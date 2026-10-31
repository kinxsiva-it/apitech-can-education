/** Explicit fixed steps allow deterministic pause/reset/replay without wall-clock time. */
export class SimulationClock {
  private elapsedMs = 0
  readonly stepMs: number

  constructor(stepMs = 10) {
    if (!Number.isFinite(stepMs) || stepMs <= 0) {
      throw new RangeError('stepMs must be finite and positive')
    }
    this.stepMs = stepMs
  }

  get nowMs(): number {
    return this.elapsedMs
  }

  tick(): number {
    this.elapsedMs += this.stepMs
    return this.elapsedMs
  }

  reset(): void {
    this.elapsedMs = 0
  }
}

