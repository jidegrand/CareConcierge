// Web Audio API alert tones — no external files needed
// All sounds generated programmatically

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioCtx
}

function playTone(
  frequency: number,
  duration: number,
  gain: number,
  type: OscillatorType = 'sine',
  delay = 0
): void {
  const ctx = getAudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay)

  gainNode.gain.setValueAtTime(0, ctx.currentTime + delay)
  gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)

  oscillator.start(ctx.currentTime + delay)
  oscillator.stop(ctx.currentTime + delay + duration + 0.05)
}

// Soft two-tone chime for standard requests
export function playNewRequest(): void {
  try {
    playTone(880, 0.18, 0.25, 'sine', 0)
    playTone(1100, 0.22, 0.2, 'sine', 0.18)
  } catch (_) {
    // Audio not available — silent fail
  }
}

// Urgent three-pulse alert
export function playUrgentAlert(): void {
  try {
    for (let i = 0; i < 3; i++) {
      playTone(1400, 0.12, 0.35, 'square', i * 0.2)
      playTone(1000, 0.08, 0.2, 'square', i * 0.2 + 0.13)
    }
  } catch (_) {
    // Audio not available — silent fail
  }
}

// Soft resolve confirmation
export function playResolve(): void {
  try {
    playTone(660, 0.1, 0.15, 'sine', 0)
    playTone(880, 0.18, 0.12, 'sine', 0.1)
  } catch (_) {
    // Audio not available — silent fail
  }
}

// Short confirmation beep for patient-side request receipts
export function playPatientReceipt(): void {
  try {
    playTone(1040, 0.12, 0.18, 'sine', 0)
    playTone(1320, 0.12, 0.14, 'sine', 0.12)
  } catch (_) {
    // Audio not available — silent fail
  }
}
