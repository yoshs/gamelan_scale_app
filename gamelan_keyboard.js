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
    const octave = group.octaves?.[index] ?? 0;
    const output = document.querySelector('#song-note');
    output.value = note === null ? '休' : noteSymbol(note, octave);
    output.setAttribute('aria-label', note === null ? '現在は休符' : `現在の音：${note}番、${octave === 0 ? '中央' : `${Math.abs(octave)}オクターブ${octave < 0 ? '下' : '上'}`}`);
    document.querySelector('#song-position').textContent = `${index + 1} / ${group.notes.length} 拍`;
  } else {
    document.querySelector('#song-note').value = '—';
    document.querySelector('#song-note').setAttribute('aria-label', '現在の音');
    document.querySelector('#song-position').textContent = '';
  }
}

function preparePlayback() {}

function noteSymbol(note, octave = 0) {
  return String(note) + (octave > 0 ? '\u0307' : '\u0323').repeat(Math.abs(octave));
}

const songSelect = document.querySelector('#song-select');
const songScore = document.querySelector('#song-score');
let selectedSong;
let song;

function selectSong(id) {
  const piece = songLibrary.find(item => item.id === id);
  if (!piece) return;
  clearPlayback();
  selectedSong = piece;
  songSelect.value = piece.id;
  if (piece.layout && piece.layout !== pelogLayout) {
    pelogLayout = piece.layout;
    pelogLayoutInput.value = piece.layout;
    renderKeyboard('p');
  }
  const sections = piece.sections.map(section => ({
    name: section.name, rows: section.rows.map(parseSongRow)
  }));
  const beats = sections.flatMap(section => section.rows.flat());
  song = {
    scale: piece.scale, notes: beats.map(beat => beat.note),
    octaves: beats.map(beat => beat.octave), steps: [], song: true
  };
  document.querySelector('#song-name').textContent = piece.title;
  document.querySelector('#song-kana').textContent = piece.kana;
  document.querySelector('#song-difficulty').textContent = piece.difficulty;
  document.querySelector('#song-description').textContent = `${scales[piece.scale].name}・パテット・${piece.pathet}。${piece.sourceNote}`;
  document.querySelector('#song-practice').textContent = piece.practice;
  document.querySelector('#original-score-description').textContent = `この資料の骨格旋律を使用しています。${piece.sourceNote} 原譜の表示にはインターネット接続が必要です。`;
  for (const id of ['#original-score-link', '#song-source-link']) {
    document.querySelector(id).href = piece.sourceUrl;
  }
  document.querySelector('#song-source-link').textContent = `出典：${piece.sourceLabel}`;
  const pdf = document.querySelector('#song-pdf');
  pdf.src = `${piece.sourceUrl}#page=1&view=FitH`;
  pdf.title = `${piece.title}の原譜（PDF）`;
  songScore.setAttribute('aria-label', `${piece.title}の数字譜。${beats.length}拍`);
  songScore.replaceChildren();
  for (const section of sections) {
    const heading = document.createElement('h5');
    heading.className = 'song-section-title';
    heading.textContent = section.name;
    songScore.append(heading);
    for (const rowBeats of section.rows) {
      const row = document.createElement('div');
      row.className = 'song-row';
      for (let start = 0; start < rowBeats.length; start += 4) {
        const gatra = document.createElement('div');
        gatra.className = 'song-gatra';
        for (const { note, octave } of rowBeats.slice(start, start + 4)) {
          const beat = document.createElement('span');
          beat.className = `step song-beat${note === null ? ' rest' : ''}`;
          if (note === null) beat.textContent = '・';
          else {
            const label = document.createElement('span');
            label.className = `key-number${octave < 0 ? ' lower' : ' upper'}`;
            label.dataset.dots = '·'.repeat(Math.abs(octave));
            label.textContent = note;
            beat.append(label);
          }
          const register = octave === 0 ? '中央' : `${Math.abs(octave)}オクターブ${octave < 0 ? '下' : '上'}`;
          beat.setAttribute('aria-label', `${song.steps.length + 1}拍目：${note === null ? '休符' : `${note}番、${register}`}`);
          song.steps.push(beat);
          gatra.append(beat);
        }
        row.append(gatra);
      }
      songScore.append(row);
    }
  }
}

const difficultyGroups = new Map();
for (const piece of [...songLibrary].sort((a, b) => a.level - b.level)) {
  if (!difficultyGroups.has(piece.level)) {
    const group = document.createElement('optgroup');
    group.label = piece.difficulty;
    difficultyGroups.set(piece.level, group);
    songSelect.append(group);
  }
  const option = document.createElement('option');
  option.value = piece.id;
  option.textContent = `${piece.title}（${piece.kana}）`;
  difficultyGroups.get(piece.level).append(option);
}
songSelect.addEventListener('change', () => selectSong(songSelect.value));
document.querySelector('#stop-song').addEventListener('click', () => clearPlayback());
document.querySelector('#play-song').addEventListener('click', () => {
  if (selectedSong.layout && selectedSong.layout !== pelogLayout) {
    pelogLayout = selectedSong.layout;
    pelogLayoutInput.value = pelogLayout;
    renderKeyboard('p');
  }
  playLoop({ ...song, beatSeconds: 60 / Number(document.querySelector('#song-tempo').value) });
});

selectSong('manyarsewu');
