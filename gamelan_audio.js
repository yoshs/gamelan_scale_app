'use strict';

const shared = [1, 2, 3, 5, 6];
const slendroHz = [269, 308, 353, 404, 466];
const scales = {
  s: { name: 'スレンドロ', notes: shared, cents: slendroHz.map(hz => 1200 * Math.log2(hz / slendroHz[0])) },
  p: { name: 'ペログ', notes: [1, 2, 3, 4, 5, 6, 7], cents: [0, 120, 267, 538, 667, 779, 977] }
};
const statusText = document.querySelector('#status');
let audioContext;
let master;
let activeNote = null;
let timers = [];
const voices = new Set();
const manualPointers = new Map();
let manualMode = false;
let loopActive = false;
let run = 0;
let basePitchHz = 269;
const basePitchInput = document.querySelector('#base-pitch');
const basePitchValue = document.querySelector('#base-pitch-value');

function updateBasePitch() {
  basePitchHz = Number(basePitchInput.value);
  basePitchValue.value = `${basePitchHz} Hz`;
  basePitchInput.setAttribute('aria-valuetext', `${basePitchHz} Hz`);
  for (const voice of voices) {
    const frequency = basePitchHz * 2 ** (voice.cents / 1200);
    for (const { oscillator, ratio } of voice.partials) {
      oscillator.frequency.setTargetAtTime(frequency * ratio, audioContext.currentTime, .015);
    }
  }
}

basePitchInput.addEventListener('input', updateBasePitch);
document.querySelector('#reset-pitch').addEventListener('click', () => {
  basePitchInput.value = basePitchInput.defaultValue;
  updateBasePitch();
});

function pitchCents(scale, note) {
  return scales[scale].cents[scales[scale].notes.indexOf(note)];
}

function refreshManualHighlights() {
  document.querySelectorAll('[data-note]').forEach(element => {
    const pressed = [...manualPointers.values()].some(touch =>
      element.dataset.scale === touch.scale && Number(element.dataset.note) === touch.note &&
      (element.dataset.octave === undefined || Number(element.dataset.octave) === touch.octave));
    element.classList.toggle('pressed', pressed);
  });
}

function releaseManualPointer(pointerId, cancelled = false) {
  const touch = manualPointers.get(pointerId);
  if (touch) touch.cancelled = cancelled;
  manualPointers.delete(pointerId);
  refreshManualHighlights();
}

async function playManualNote(scale, note, octave, pointerId) {
  // Keep a backing loop running while manual strikes overlap it.
  if (!manualMode) {
    if (!loopActive) clearPlayback();
    manualMode = true;
  }
  const request = run;
  const touch = { scale, note, octave, cancelled: false };
  manualPointers.set(pointerId, touch);
  statusText.textContent = '';
  preparePlayback([{ scale, notes: [note] }]);
  refreshManualHighlights();
  try {
    await readyAudio();
    if (request !== run || touch.cancelled) return;
    strike(scale, note, audioContext.currentTime + .005, {}, undefined, true, octave);
  } catch {
    if (request === run) {
      statusText.textContent = '音声を開始できませんでした。もう一度ボタンを押してください。';
      releaseManualPointer(pointerId, true);
    }
  }
}

function bindPlayableKey(key, scale, note, octave = 0) {
  key.addEventListener('pointerdown', event => {
    // Touch contacts are handled together below, including simultaneous
    // contacts reported in a single Safari touch event.
    if (event.pointerType === 'touch') return;
    if (event.button !== 0) return;
    event.preventDefault();
    try { key.setPointerCapture?.(event.pointerId); } catch { /* Capture is optional. */ }
    playManualNote(scale, note, octave, event.pointerId);
  });
  key.addEventListener('pointerup', event => releaseManualPointer(event.pointerId));
  key.addEventListener('pointercancel', event => releaseManualPointer(event.pointerId, true));
  key.addEventListener('lostpointercapture', event => releaseManualPointer(event.pointerId, true));
  // Keyboard and screen-reader activation still use click; pointer clicks have
  // already sounded on pointerdown and must not trigger a second strike.
  key.addEventListener('click', event => {
    if (event.detail !== 0) return;
    const pointerId = Symbol('keyboard-activation');
    playManualNote(scale, note, octave, pointerId).finally(() => releaseManualPointer(pointerId));
  });
}

let knownTouchIds = new Set();

function handleKeyboardTouches(event) {
  const keyForTouch = touch => {
    const key = touch.target?.closest?.('.key');
    return key && document.contains(key) && key.dataset.scale && key.dataset.note ? key : null;
  };
  const contacts = [...event.touches].map(touch => ({ touch, key: keyForTouch(touch) })).filter(contact => contact.key);
  const liveIds = new Set(contacts.map(({ touch }) => `touch:${touch.identifier}`));
  // Only suppress gestures that begin on the instrument. The padding below
  // the keys remains available for horizontal scrolling.
  if ([...event.changedTouches].some(keyForTouch) && event.cancelable) event.preventDefault();
  for (const id of knownTouchIds) {
    if (!liveIds.has(id)) releaseManualPointer(id, event.type === 'touchcancel');
  }
  for (const { touch, key } of contacts) {
    const id = `touch:${touch.identifier}`;
    if (!knownTouchIds.has(id)) {
      playManualNote(key.dataset.scale, Number(key.dataset.note), Number(key.dataset.octave ?? 0), id);
    }
  }
  knownTouchIds = liveIds;
}

for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
  document.addEventListener(type, handleKeyboardTouches, { passive: false });
}

function resumeAudioOnGesture() {
  if (audioContext && audioContext.state !== 'running') audioContext.resume().catch(() => {});
}

// Some mobile browsers unlock audio on release rather than initial contact.
// Resolve any pending first-note resumes from that trusted gesture as well.
for (const type of ['touchend', 'pointerup', 'click', 'keydown']) {
  document.addEventListener(type, resumeAudioOnGesture, { capture: true });
}

function clearPlayback() {
  run += 1;
  manualMode = false;
  loopActive = false;
  for (const touch of manualPointers.values()) touch.cancelled = true;
  manualPointers.clear();
  refreshManualHighlights();
  timers.forEach(clearTimeout);
  timers = [];
  for (const voice of voices) {
    const time = audioContext.currentTime;
    voice.gain.gain.cancelScheduledValues(time);
    voice.gain.gain.setTargetAtTime(0.0001, time, 0.009);
    for (const oscillator of voice.oscillators) oscillator.stop(time + 0.055);
  }
  voices.clear();
  markNote();
  markPhrase();
}

async function readyAudio() {
  if (!audioContext) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Web Audio unavailable');
    audioContext = new Audio();
    master = audioContext.createGain();
    master.gain.value = 0.45;
    const limiter = audioContext.createDynamicsCompressor();
    master.connect(limiter).connect(audioContext.destination);
  }
  if (audioContext.state !== 'running') await audioContext.resume();
}

function voiceDuration(group, isLast) {
  return group.voice === 'sustained' ? (isLast ? .70 : .38) : 2.5;
}

function strike(scale, note, time, group, alteredCents, isLast, octave = 0) {
  const cents = (alteredCents ?? pitchCents(scale, note)) + octave * 1200;
  const frequency = basePitchHz * 2 ** (cents / 1200);
  const gain = audioContext.createGain();
  gain.gain.value = 1;
  gain.connect(master);
  const oscillators = [];
  const voice = { gain, oscillators, cents, partials: [] };
  voices.add(voice);
  const sustained = group.voice === 'sustained';
  const length = voiceDuration(group, isLast);
  const spectrum = sustained ?
    [[1, .25, length], [2, .095, length], [3, .040, length], [5, .020, length]] :
    [[1, .36, length], [2.76, .12, 1.3], [5.4, .049, .68], [8.93, .021, .36]];
  for (const [ratio, level, decay] of spectrum) {
    const partial = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    partial.frequency.value = frequency * ratio;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.linearRampToValueAtTime(level, time + (sustained ? .06 : .005));
    if (sustained) envelope.gain.setValueAtTime(level * .8, time + decay - .11);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    partial.connect(envelope).connect(gain);
    partial.start(time);
    partial.stop(time + decay + .03);
    partial.onended = () => {
      partial.disconnect();
      envelope.disconnect();
      if (ratio === 1) {
        voices.delete(voice);
        gain.disconnect();
      }
    };
    oscillators.push(partial);
    voice.partials.push({ oscillator: partial, ratio });
  }
}

async function play(groups) {
  clearPlayback();
  statusText.textContent = '';
  const request = run;
  try {
    await readyAudio();
  } catch {
    if (request === run) statusText.textContent = '音声を開始できませんでした。もう一度ボタンを押してください。';
    return;
  }
  if (request !== run) return;
  preparePlayback(groups);
  const start = audioContext.currentTime + .035;
  let offset = 0;
  let playbackEnd = 0;
  for (const group of groups) {
    const { scale, notes } = group;
    notes.forEach((note, index) => {
      const change = group.changes?.[index];
      const octave = group.octaves?.[index] ?? 0;
      if (note !== null) {
        strike(scale, note, start + offset, group, change?.cents, index === notes.length - 1, octave);
        playbackEnd = Math.max(playbackEnd, offset + voiceDuration(group, index === notes.length - 1) + .03);
      }
      timers.push(setTimeout(() => {
        if (change || note === null) markNote();
        else markNote(scale, note, octave);
        markPhrase(group, index);
      }, (offset + .035) * 1000));
      offset += group.beatSeconds ?? (group.voice === 'sustained' ? .43 : .33);
    });
    offset += .48;
  }
  timers.push(setTimeout(() => {
    clearPlayback();
    statusText.textContent = '';
  }, (Math.max(offset + .12, playbackEnd + .1) + .035) * 1000));
}

async function playLoop(group) {
  clearPlayback();
  loopActive = true;
  statusText.textContent = '';
  const request = run;
  try {
    await readyAudio();
  } catch {
    if (request === run) {
      loopActive = false;
      statusText.textContent = '音声を開始できませんでした。もう一度ボタンを押してください。';
    }
    return;
  }
  if (request !== run) return;
  preparePlayback([group]);
  const beatSeconds = group.beatSeconds ?? .33;
  const cycleLength = group.notes.length * beatSeconds;
  if (!(cycleLength > 0)) {
    loopActive = false;
    return;
  }
  const lookahead = Math.min(.15, cycleLength / 2);
  let nextStart = audioContext.currentTime + .035;

  function schedule(callback, time) {
    const id = setTimeout(() => {
      const index = timers.indexOf(id);
      if (index !== -1) timers.splice(index, 1);
      if (request === run) callback();
    }, Math.max(0, time - audioContext.currentTime) * 1000);
    timers.push(id);
  }

  function scheduleCycle() {
    if (request !== run) return;
    // Schedule the following cycle before this one ends. Keep existing tails
    // sounding across the boundary; never clear or restart the audio context.
    const start = Math.max(nextStart, audioContext.currentTime + .005);
    group.notes.forEach((note, index) => {
      const time = start + index * beatSeconds;
      const change = group.changes?.[index];
      const octave = group.octaves?.[index] ?? 0;
      if (note !== null) strike(group.scale, note, time, group, change?.cents, index === group.notes.length - 1, octave);
      schedule(() => {
        if (change || note === null) markNote();
        else markNote(group.scale, note, octave);
        markPhrase(group, index);
      }, time);
    });
    nextStart = start + cycleLength;
    schedule(scheduleCycle, nextStart - lookahead);
  }

  scheduleCycle();
}

window.addEventListener('pagehide', clearPlayback);
window.addEventListener('blur', () => {
  for (const pointerId of manualPointers.keys()) releaseManualPointer(pointerId, true);
});
window.addEventListener('pagehide', () => { knownTouchIds.clear(); });
