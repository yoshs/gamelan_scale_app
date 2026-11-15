'use strict';

const allTones = document.querySelector('#all-tones');
let showAll = false;

function markNote(scale, note) {
  activeNote = scale ? { scale, note } : null;
  document.querySelectorAll('[data-note]').forEach(element => {
    element.classList.toggle('active', Boolean(activeNote) &&
      element.dataset.scale === activeNote.scale && Number(element.dataset.note) === activeNote.note);
  });
}

function renderTracks() {
  for (const [scale, data] of Object.entries(scales)) {
    const track = document.querySelector(`#${scale}-track`);
    const visible = scale === 'p' && showAll ? data.notes : shared;
    track.replaceChildren(...visible.map((note, index) => {
      const dot = document.createElement('span');
      const cents = pitchCents(scale, note);
      const hz = (basePitchHz * 2 ** (cents / 1200)).toFixed(1);
      dot.className = 'dot';
      dot.style.left = `${cents / 12}%`;
      dot.style.setProperty('--label-row', index % 3);
      dot.dataset.scale = scale;
      dot.dataset.note = note;
      dot.title = `${note}番 · ${Math.round(cents)}セント · ${hz} Hz`;
      const label = document.createElement('span');
      label.className = 'dot-number';
      label.textContent = note;
      const metrics = document.createElement('span');
      metrics.className = 'dot-metrics';
      const interval = document.createElement('span');
      interval.textContent = `${Math.round(cents)}¢`;
      const frequency = document.createElement('span');
      frequency.textContent = `${hz} Hz`;
      metrics.append(interval, frequency);
      dot.append(label, metrics);
      return dot;
    }));
    track.setAttribute('aria-label', `${data.name}。1からの距離と周波数。${visible.map(note => `${note}番は${Math.round(pitchCents(scale, note))}セント、${(basePitchHz * 2 ** (pitchCents(scale, note) / 1200)).toFixed(1)} Hz`).join('、')}`);
  }
  markNote(activeNote?.scale, activeNote?.note, activeNote?.octave);
}

function setShowAll(next) {
  showAll = next;
  allTones.setAttribute('aria-pressed', String(showAll));
  allTones.textContent = showAll ? '5音での比較に戻す' : 'ペログの4・7も表示';
  document.querySelectorAll('#p-keys [data-note="4"], #p-keys [data-note="7"]').forEach(key => {
    key.classList.toggle('muted-key', !showAll);
  });
  document.querySelector('#caption').textContent = showAll ?
    'ペログは7音の調律。曲では、その中から選んだ5音を軸にすることがよくあります。' :
    '「3 → 5 → 6」に注目。ペログでは「3 → 5」で大きく跳び、そのあとは少しだけ上がります。';
  renderTracks();
}

function preparePlayback(groups) {
  if (groups.some(group => group.scale === 'p' && group.notes.some(note => note !== null && !shared.includes(note)))) {
    setShowAll(true);
  }
}

for (const [scale, data] of Object.entries(scales)) {
  const keys = document.querySelector(`#${scale}-keys`);
  data.notes.forEach((note, index) => {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'key';
    key.style.setProperty('--step', index);
    key.dataset.scale = scale;
    key.dataset.note = note;
    key.textContent = note;
    key.setAttribute('aria-label', `${data.name}の${note}番を鳴らす`);
    bindPlayableKey(key, scale, note);
    keys.append(key);
  });
}

function markPhrase(group, index) {
  document.querySelectorAll('.step.active').forEach(step => step.classList.remove('active'));
  group?.steps?.[index]?.classList.add('active');
}

allTones.addEventListener('click', () => setShowAll(!showAll));
function addPhrase(container, name, notes, options = {}) {
  const group = { scale: 's', name, notes, ...options };
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'phrase';
  const label = document.createElement('span');
  label.textContent = `▶ ${name}`;
  const steps = document.createElement('span');
  steps.className = 'steps';
  group.steps = notes.map((note, index) => {
    const step = document.createElement('span');
    const change = group.changes?.[index];
    step.className = 'step';
    step.textContent = change?.symbol ?? note;
    step.classList.toggle('changed', Boolean(change) || Boolean(group.emphasis?.includes(note)));
    step.classList.toggle('target', group.highlightEnding !== false && index === notes.length - 1);
    return step;
  });
  steps.append(...group.steps);
  button.append(label, steps);
  button.addEventListener('click', () => play([group]));
  container.append(button);
  return group;
}

const cadenceOptions = document.querySelector('#cadence-options');
for (const [name, ending] of [['ネム', 2], ['サンガ', 5], ['マニュラ', 6]]) {
  addPhrase(cadenceOptions, name, [1, 3, 2, ending]);
}

const miringOptions = document.querySelector('#miring-options');
const miringNotes = [5, 6, 5, 3, 2];
const plain = addPhrase(miringOptions, '鍵盤の音程', miringNotes, { voice: 'sustained' });
const miring = addPhrase(miringOptions, 'ミリンの例', miringNotes, {
  voice: 'sustained',
  changes: {
    1: { symbol: '5↗', label: '5と6の間', cents: (pitchCents('s', 5) + pitchCents('s', 6)) / 2 },
    3: { symbol: '3↓', label: '3より低い音', cents: pitchCents('s', 3) - 100 }
  }
});
document.querySelector('#miring-compare').addEventListener('click', () => play([plain, miring]));

const pelogFiveOptions = document.querySelector('#pelog-five-options');
const pelogFiveNotes = [
  ['1と3を使う', shared, []],
  ['3の代わりに4', [1, 2, 4, 5, 6], [4]],
  ['1の代わりに7', [2, 3, 5, 6, 7], [7]]
].map(([name, notes, emphasis]) =>
  addPhrase(pelogFiveOptions, name, notes, { scale: 'p', emphasis, highlightEnding: false })
);
document.querySelector('#pelog-five-compare').addEventListener('click', () => play(pelogFiveNotes));

const pelogPathetOptions = document.querySelector('#pelog-pathet-options');
const pelogPathetPhrases = [
  ['リマ', [5, 4, 2, 1], [4]],
  ['ネム', [2, 3, 6, 5, 2], [2, 5, 6]],
  ['バラン', [3, 5, 7, 6, 5], [7]]
].map(([name, notes, emphasis]) =>
  addPhrase(pelogPathetOptions, name, notes, { scale: 'p', emphasis })
);
document.querySelector('#pelog-pathet-compare').addEventListener('click', () => play(pelogPathetPhrases));

basePitchInput.addEventListener('input', renderTracks);
document.querySelector('#reset-pitch').addEventListener('click', renderTracks);

setShowAll(false);
