// audio.js: all sound is synthesised with WebAudio — no audio files,
// no network. Engine hum follows the throttle; rings chime; landings thud.
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let muted = false;

export function ensureAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
  } catch (err) {
    audioCtx = null;
  }
}

export function setEngineSound(throttle, flying) {
  if (!audioCtx || !engineOsc) return;
  const target = muted || !flying ? 0 : 0.02 + throttle * 0.05;
  engineGain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.1);
  engineOsc.frequency.setTargetAtTime(48 + throttle * 70, audioCtx.currentTime, 0.1);
}

export function setMuted(value) {
  muted = value;
  if (engineGain && audioCtx) engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
}

function blip(freq, delay, length) {
  if (!audioCtx || muted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + delay + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + length);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + length + 0.05);
}

export function playRingChime() {
  blip(880, 0, 0.25);
  blip(1318, 0.09, 0.3);
}

export function playLandingThud() {
  blip(180, 0, 0.2);
  blip(120, 0.05, 0.25);
}

export function playCrashSound() {
  if (!audioCtx || muted) return;
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.25;
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
}
