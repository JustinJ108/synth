const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Master gain
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.5;

// LFO
const lfo = audioCtx.createOscillator();
const lfoDepthNode = audioCtx.createGain();
lfo.type = 'sine';
lfo.frequency.value = 4;
lfoDepthNode.gain.value = 0;
lfo.connect(lfoDepthNode);
lfo.start();

const volumeSlider  = document.getElementById('volume');
const waveformSelect = document.getElementById('waveform');
const lfoRateSlider  = document.getElementById('lfo-rate');
const lfoDepthSlider = document.getElementById('lfo-depth');
const lfoTargetSelect = document.getElementById('lfo-target');
const lfoRateDisplay  = document.getElementById('lfo-rate-display');
const lfoDepthDisplay = document.getElementById('lfo-depth-display');

volumeSlider.addEventListener('input', () => {
  masterGain.gain.value = parseFloat(volumeSlider.value);
});

lfoRateSlider.addEventListener('input', () => {
  const val = parseFloat(lfoRateSlider.value);
  lfo.frequency.value = val;
  lfoRateDisplay.textContent = val.toFixed(1) + ' Hz';
});

lfoDepthSlider.addEventListener('input', () => {
  const val = parseFloat(lfoDepthSlider.value);
  lfoDepthDisplay.textContent = val;
  applyLfoToActive();
});

lfoTargetSelect.addEventListener('change', () => {
  rewireAllLfo();
});

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

// Gain multiplier per waveform — sine sounds quieter, boost it
const waveformGain = { sine: 1.8, square: 0.7, sawtooth: 0.8, triangle: 1.0 };

const activeNodes = {}; // id -> { osc, noteGain }

function getLfoDepth() {
  return parseFloat(lfoDepthSlider.value);
}

function connectLfo(osc, noteGain) {
  const target = lfoTargetSelect.value;
  const depth = getLfoDepth();
  lfoDepthNode.gain.value = depth;
  if (target === 'pitch') {
    lfoDepthNode.connect(osc.frequency);
  } else {
    lfoDepthNode.connect(noteGain.gain);
  }
}

function applyLfoToActive() {
  lfoDepthNode.gain.value = getLfoDepth();
}

function rewireAllLfo() {
  // Disconnect and reconnect for all active notes
  try { lfoDepthNode.disconnect(); } catch(e) {}
  Object.values(activeNodes).forEach(({ osc, noteGain }) => {
    connectLfo(osc, noteGain);
  });
}

function startNote(freq, id) {
  if (activeNodes[id]) return;
  audioCtx.resume();

  const waveform = waveformSelect.value;
  const osc = audioCtx.createOscillator();
  osc.type = waveform;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  const noteGain = audioCtx.createGain();
  noteGain.gain.value = waveformGain[waveform] || 1.0;

  osc.connect(noteGain);
  noteGain.connect(masterGain);
  osc.start();

  activeNodes[id] = { osc, noteGain };
  connectLfo(osc, noteGain);
}

function stopNote(id) {
  const nodes = activeNodes[id];
  if (!nodes) return;
  nodes.osc.stop();
  delete activeNodes[id];
  // Reconnect LFO to remaining active nodes
  try { lfoDepthNode.disconnect(); } catch(e) {}
  Object.values(activeNodes).forEach(({ osc, noteGain }) => connectLfo(osc, noteGain));
}

// Build keyboard
const keyboard = document.getElementById('keyboard');
notes.forEach(({ note, freq, type, key }) => {
  const el = document.createElement('div');
  el.className = `key ${type}`;
  el.dataset.id = note;

  const label = document.createElement('span');
  label.className = 'key-label';
  label.textContent = key.toUpperCase();
  el.appendChild(label);

  el.addEventListener('mousedown', () => { startNote(freq, note); el.classList.add('active'); });
  el.addEventListener('mouseup',   () => { stopNote(note);        el.classList.remove('active'); });
  el.addEventListener('mouseleave',() => { stopNote(note);        el.classList.remove('active'); });

  keyboard.appendChild(el);
});

const keyMap = {};
notes.forEach(({ note, freq, key }) => { keyMap[key] = { freq, note }; });

const keyEls = {};
notes.forEach(({ note }) => {
  keyEls[note] = keyboard.querySelector(`[data-id="${note}"]`);
});

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (e.repeat || !keyMap[k]) return;
  const { freq, note } = keyMap[k];
  startNote(freq, note);
  keyEls[note]?.classList.add('active');
});

document.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (!keyMap[k]) return;
  const { note } = keyMap[k];
  stopNote(note);
  keyEls[note]?.classList.remove('active');
});
