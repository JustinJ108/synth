const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);
gainNode.gain.value = 0.5;

const volumeSlider = document.getElementById('volume');
const waveformSelect = document.getElementById('waveform');

volumeSlider.addEventListener('input', () => {
  gainNode.gain.value = parseFloat(volumeSlider.value);
});

// Notes: two octaves starting at C3
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

const activeOscillators = {};

function startNote(freq, id) {
  if (activeOscillators[id]) return;
  audioCtx.resume();
  const osc = audioCtx.createOscillator();
  osc.type = waveformSelect.value;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  osc.connect(gainNode);
  osc.start();
  activeOscillators[id] = osc;
}

function stopNote(id) {
  const osc = activeOscillators[id];
  if (!osc) return;
  osc.stop();
  delete activeOscillators[id];
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

// Keyboard input
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
