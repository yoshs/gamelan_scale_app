'use strict';

const pelogLayoutInput = document.querySelector('#pelog-layout');
let pelogLayout = 'bem';

function markNote(scale, note, octave = 0) {
  if (scale === 'p' && (note === 1 || note === 7)) {
    const layout = note === 7 ? 'barang' : 'bem';
    if (layout !== pelogLayout) {
      pelogLayout = layout;
      pelogLayoutInput.value = layout;
      renderKeyboard('p');
    }
  }
  activeNote = scale ? { scale, note, octave } : null;
  document.querySelectorAll('[data-note]').forEach(element => {
    const matches = Boolean(activeNote) && element.dataset.scale === activeNote.scale &&
      Number(element.dataset.note) === activeNote.note &&
      (element.dataset.octave === undefined || Number(element.dataset.octave) === activeNote.octave);
    element.classList.toggle('active', matches);
    if (matches && element.classList.contains('key')) {
      const viewport = element.parentElement.parentElement;
      const left = element.offsetLeft;
      if (left < viewport.scrollLeft) viewport.scrollLeft = left;
      else if (left + element.offsetWidth > viewport.scrollLeft + viewport.clientWidth) {
        viewport.scrollLeft = left + element.offsetWidth - viewport.clientWidth;
      }
    }
  });
}

function keyboardNotes(scale) {
  const pattern = scale === 'p' && pelogLayout === 'barang' ? [6, 7, 2, 3, 5] : [6, 1, 2, 3, 5];
  let octave = -2;
  let previousCents = -Infinity;
  return Array.from({ length: 14 }, (_, index) => {
    const note = pattern[index % pattern.length];
    const cents = pitchCents(scale, note);
    if (cents < previousCents) octave += 1;
    previousCents = cents;
    return { note, octave };
  });
}

function renderKeyboard(scale) {
  const data = scales[scale];
  const keys = document.querySelector(`#${scale}-keys`);
  keys.replaceChildren();
  keyboardNotes(scale).forEach(({ note, octave }, index) => {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'key';
    key.style.setProperty('--step', index);
    key.dataset.scale = scale;
    key.dataset.note = note;
    key.dataset.octave = octave;
    const label = document.createElement('span');
    label.className = `key-number${octave < 0 ? ' lower' : ' upper'}`;
    label.textContent = note;
    label.dataset.dots = '·'.repeat(Math.abs(octave));
    key.append(label);
    const register = octave === 0 ? '中央の音域' : `${Math.abs(octave)}オクターブ${octave < 0 ? '下' : '上'}`;
    key.setAttribute('aria-label', `${data.name}の${note}番、${register}を鳴らす`);
    bindPlayableKey(key, scale, note, octave);
    keys.append(key);
  });
}

renderKeyboard('s');
renderKeyboard('p');
pelogLayoutInput.addEventListener('change', () => {
  clearPlayback();
  pelogLayout = pelogLayoutInput.value;
  renderKeyboard('p');
});

function markPhrase(group, index) {
  document.querySelectorAll('.step.active').forEach(step => {
    step.classList.remove('active');
    step.removeAttribute('aria-current');
  });
  group?.steps?.[index]?.classList.add('active');
  if (group?.song) {
    group.steps[index].setAttribute('aria-current', 'true');
    const note = group.notes[index];
    document.querySelector('#song-note').value = note === null ? '休' : String(note);
    document.querySelector('#song-position').textContent = `${index + 1} / ${group.notes.length} 拍`;
  } else {
    document.querySelector('#song-note').value = '—';
    document.querySelector('#song-position').textContent = '';
  }
}

function preparePlayback() {}

function keyboardGroup(scale) {
  const keys = keyboardNotes(scale);
  return { scale, notes: keys.map(key => key.note), octaves: keys.map(key => key.octave) };
}

document.querySelector('#compare').addEventListener('click', () => play([keyboardGroup('s'), keyboardGroup('p')]));
document.querySelector('#s-play').addEventListener('click', () => play([keyboardGroup('s')]));
document.querySelector('#p-play').addEventListener('click', () => play([keyboardGroup('p')]));

// Manyarséwu: main section only, transcribed from Gendhing Jawi's
// sléndro manyura score. Each null is one unstruck beat (balungan nibani).
// https://gamelanbvg.com/gendhing/pdf/sm/Manyarsewu.pdf
const songRows = [
  [null, 5, null, 3, null, 5, null, 3, null, 5, null, 3, null, 6, null, 5],
  [null, 6, null, 5, null, 6, null, 5, null, 6, null, 5, null, 3, null, 2],
  [null, 3, null, 2, null, 3, null, 2, null, 3, null, 2, null, 1, null, 6],
  [null, 1, null, 6, null, 1, null, 6, null, 1, null, 6, null, 5, null, 3]
];
const song = { scale: 's', notes: songRows.flat(), steps: [], song: true };
const songScore = document.querySelector('#song-score');
for (const notes of songRows) {
  const row = document.createElement('div');
  row.className = 'song-row';
  for (let start = 0; start < notes.length; start += 4) {
    const gatra = document.createElement('div');
    gatra.className = 'song-gatra';
    for (const note of notes.slice(start, start + 4)) {
      const beat = document.createElement('span');
      beat.className = `step song-beat${note === null ? ' rest' : ''}`;
      beat.textContent = note ?? '・';
      beat.setAttribute('aria-label', `${song.steps.length + 1}拍目：${note === null ? '休符' : `${note}番`}`);
      song.steps.push(beat);
      gatra.append(beat);
    }
    row.append(gatra);
  }
  songScore.append(row);
}
document.querySelector('#play-song').addEventListener('click', () => {
  play([{ ...song, beatSeconds: 60 / Number(document.querySelector('#song-tempo').value) }]);
});

