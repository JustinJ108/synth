const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Resume context on any user interaction (required by browsers)
['click', 'keydown', 'touchstart'].forEach(evt =>
  document.addEventListener(evt, () => audioCtx.resume())
);

const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.5;
masterGain.connect(audioCtx.destination);

// LFO oscillator + depth scaler
const lfo = audioCtx.createOscillator();
const lfoGain = audioCtx.createGain();
lfo.type = 'sine';
lfo.frequency.value = 4;
lfoGain.gain.value = 0;
lfo.connect(lfoGain);
lfo.start();

// Connect LFO to master gain for tremolo by default (disconnected until depth > 0)
lfoGain.connect(masterGain.gain);

const volumeSlider    = document.getElementById('volume');
const waveformSelect  = document.getElementById('waveform');
const lfoRateSlider   = document.getElementById('lfo-rate');
const lfoDepthSlider  = document.getElementById('lfo-depth');
const lfoTargetSelect = document.getElementById('lfo-target');
const lfoRateDisplay  = document.getElementById('lfo-rate-display');
const lfoDepthDisplay = document.getElementById('lfo-depth-display');

// Sine sounds quieter than other waveforms — compensate
const waveformBoost = { sine: 2.0, square: 0.6, sawtooth: 0.7, triangle: 1.0 };

const notes = [
  { note: 'C3',  freq: 130.81, type: 'white', key: 'a' },
  { note: 'C#3', freq: 138.59, type: 'black', key: 'w' },
  { note: 'D3',  freq: 146.83, type: 'white', key: 's' },
  { note: 'D#3', freq: 155.56, type: 'black', key: 'e' },
  { note: 'E3',  freq: 164.81, type: 'white', key: 'd' },
  { note: 'F3',  freq: 174.61, type: 'white', key: 'f' },
  { note: 'F#3', freq: 185.00, type: 'black', key: 't' },
  { note: 'G3',  freq: 196.00, type: 'white', key: 'g' },
  { note: 'G#3', freq: 207.65, type: 'black', key: 'y' },
  { note: 'A3',  freq: 220.00, type: 'white', key: 'h' },
  { note: 'A#3', freq: 233.08, type: 'black', key: 'u' },
  { note: 'B3',  freq: 246.94, type: 'white', key: 'j' },
  { note: 'C4',  freq: 261.63, type: 'white', key: 'k' },
  { note: 'C#4', freq: 277.18, type: 'black', key: 'o' },
  { note: 'D4',  freq: 293.66, type: 'white', key: 'l' },
  { note: 'D#4', freq: 311.13, type: 'black', key: 'p' },
  { note: 'E4',  freq: 329.63, type: 'white', key: ';' },
];

const active = {}; // note id -> { osc, noteGain }

// --- LFO helpers ---

function lfoDepthScaled() {
  const raw = parseFloat(lfoDepthSlider.value); // 0-100
  // pitch: ±raw Hz deviation; amp: ±(raw * 0.004) gain (max ±0.4 out of 0.5 base)
  return lfoTargetSelect.value === 'pitch' ? raw : raw * 0.004;
}

function rewireLfo() {
  // Disconnect LFO from everything, then reconnect to correct target
  try { lfoGain.disconnect(); } catch (e) {}

  if (lfoTargetSelect.value === 'amp') {
    lfoGain.connect(masterGain.gain);
  } else {
    // Connect to each currently active oscillator's frequency
    Object.values(active).forEach(({ osc }) => lfoGain.connect(osc.frequency));
  }

  lfoGain.gain.value = lfoDepthScaled();
}

// --- Controls ---

volumeSlider.addEventListener('input', () => {
  masterGain.gain.value = parseFloat(volumeSlider.value);
});

lfoRateSlider.addEventListener('input', () => {
  const val = parseFloat(lfoRateSlider.value);
  lfo.frequency.value = val;
  lfoRateDisplay.textContent = val.toFixed(1) + ' Hz';
});

lfoDepthSlider.addEventListener('input', () => {
  lfoGain.gain.value = lfoDepthScaled();
  lfoDepthDisplay.textContent = lfoDepthSlider.value;
});

lfoTargetSelect.addEventListener('change', rewireLfo);

// --- Note on/off ---

function startNote(freq, id) {
  if (active[id]) return;

  const waveform = waveformSelect.value;
  const osc = audioCtx.createOscillator();
  osc.type = waveform;
  osc.frequency.value = freq;

  const noteGain = audioCtx.createGain();
  noteGain.gain.value = waveformBoost[waveform] || 1.0;

  osc.connect(noteGain);
  noteGain.connect(masterGain);
  osc.start();

  active[id] = { osc, noteGain };

  // If LFO is in pitch mode, wire it to this new oscillator
  if (lfoTargetSelect.value === 'pitch') {
    lfoGain.connect(osc.frequency);
  }
}

function stopNote(id) {
  const node = active[id];
  if (!node) return;
  // Cleanly disconnect LFO from this specific oscillator
  if (lfoTargetSelect.value === 'pitch') {
    try { lfoGain.disconnect(node.osc.frequency); } catch (e) {}
  }
  node.osc.stop();
  delete active[id];
}

// --- Build keyboard ---

const keyboard = document.getElementById('keyboard');
notes.forEach(({ note, freq, type, key }) => {
  const el = document.createElement('div');
  el.className = `key ${type}`;
  el.dataset.id = note;

  const label = document.createElement('span');
  label.className = 'key-label';
  label.textContent = key.toUpperCase();
  el.appendChild(label);

  el.addEventListener('mousedown',  () => { startNote(freq, note); el.classList.add('active'); });
  el.addEventListener('mouseup',    () => { stopNote(note);        el.classList.remove('active'); });
  el.addEventListener('mouseleave', () => { stopNote(note);        el.classList.remove('active'); });

  keyboard.appendChild(el);
});

// --- Keyboard shortcuts ---

const keyMap = {};
notes.forEach(({ note, freq, key }) => { keyMap[key] = { freq, note }; });

const keyEls = {};
notes.forEach(({ note }) => {
  keyEls[note] = keyboard.querySelector(`[data-id="${note}"]`);
});

document.addEventListener('keydown', (e) => {
  const k = e.key === ';' ? ';' : e.key.toLowerCase();
  if (e.repeat || !keyMap[k]) return;
  const { freq, note } = keyMap[k];
  startNote(freq, note);
  keyEls[note]?.classList.add('active');
});

document.addEventListener('keyup', (e) => {
  const k = e.key === ';' ? ';' : e.key.toLowerCase();
  if (!keyMap[k]) return;
  const { note } = keyMap[k];
  stopNote(note);
  keyEls[note]?.classList.remove('active');
});
