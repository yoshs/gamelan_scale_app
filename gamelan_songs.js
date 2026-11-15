'use strict';

// Balungan transcriptions. One token = one beat; '.' = no new strike,
// '+' = octave above the central register, '-' = octave below it.
// Sources are linked per piece. Introductions and percussion are omitted.
const songLibrary = [
  {
    id: 'ricik-ricik', title: 'Lancaran Ricik-Ricik', kana: 'リチック・リチック',
    level: 1, difficulty: '入門', scale: 's', pathet: 'マニュラ',
    practice: '2つの旋律の繰り返しで、休符と高い1に慣れる。',
    sourceUrl: 'https://lsa.umich.edu/content/dam/cseas-assets/cseas-documents/gamelan/ricik_ricik_lesson_plan.pdf',
    sourceLabel: 'Vera H. Flaig／ミシガン大学の教材（PDF）',
    sourceNote: '教材の本体2行を、それぞれ2回ずつで1周として繰り返します。',
    sections: [
      { name: '前半（2回）', rows: [
        '. 3 . 5 | . 6 . 5 | . 6 . 5 | . 1+ . 6',
        '. 3 . 5 | . 6 . 5 | . 6 . 5 | . 1+ . 6'
      ] },
      { name: '後半（2回）', rows: [
        '. 3 . 2 | . 3 . 2 | . 3 . 2 | . 1+ . 6',
        '. 3 . 2 | . 3 . 2 | . 3 . 2 | . 1+ . 6'
      ] }
    ]
  },
  {
    id: 'manyarsewu', title: 'Lancaran Manyarséwu', kana: 'マニャル・セウ',
    level: 2, difficulty: '初級', scale: 's', pathet: 'マニュラ',
    practice: '休符を挟んで、少しずつ変わる旋律を追う。',
    sourceUrl: 'https://gamelanbvg.com/gendhing/pdf/sm/Manyarsewu.pdf',
    sourceLabel: 'Gendhing Jawiの数字譜（PDF）',
    sourceNote: '原譜の上段の本体4行を1周として繰り返します。Tambanは含みません。',
    sections: [{ name: '本体', rows: [
      '. 5 . 3 | . 5 . 3 | . 5 . 3 | . 6 . 5',
      '. 6 . 5 | . 6 . 5 | . 6 . 5 | . 3 . 2',
      '. 3 . 2 | . 3 . 2 | . 3 . 2 | . 1+ . 6',
      '. 1+ . 6 | . 1+ . 6 | . 1+ . 6 | . 5 . 3'
    ] }]
  },
  {
    id: 'bendrong', title: 'Lancaran Bèndrong', kana: 'ベンドロン',
    level: 2, difficulty: '初級', scale: 's', pathet: 'マニュラ',
    practice: '似た音型を繰り返しながら、着地音の違いを聴く。',
    sourceUrl: 'https://gamelanbvg.com/gendhing/pdf/sm/Bendrong.pdf',
    sourceLabel: 'Gendhing Jawiの数字譜（PDF）',
    sourceNote: '原譜の本体5行を1周として繰り返します。',
    sections: [{ name: '本体', rows: [
      '. 5 . 3 | . 5 . 2 | . 5 . 2 | . 5 . 3',
      '. 5 . 3 | . 5 . 2 | . 5 . 2 | . 5 . 6',
      '. 1+ . 6 | . 1+ . 5 | . 1+ . 5 | . 1+ . 6',
      '. 1+ . 6 | . 1+ . 5 | . 1+ . 5 | . 1+ . 6',
      '. 2 . 3 | . 2 . 1 | . 6 . 5 | . 2 . 3'
    ] }]
  },
  {
    id: 'udan-mas', title: 'Lancaran bubaran Udan Mas', kana: 'ウダン・マス',
    level: 3, difficulty: '初中級', scale: 'p', pathet: 'バラン', layout: 'barang',
    practice: '低音域で、7を含む途切れない音列を弾く。',
    sourceUrl: 'https://gamelanbvg.com/gendhing/pdf/p7/UdanMas.pdf',
    sourceLabel: 'Gendhing Jawiの数字譜（PDF）',
    sourceNote: '原譜の本体4行を1周として繰り返します。ペログの鍵盤をバランに切り替えます。',
    sections: [{ name: '本体', rows: [
      '6- 5- 3- 2- | 6- 5- 3- 2- | . 3- 2- 3- | 6- 5- 3- 2-',
      '6- 5- 3- 2- | 6- 5- 3- 2- | . 3- 2- 3- | 6- 5- 3- 2-',
      '7- 5- 6- 7- | 5- 6- 7- 2 | . 7- 6- 5- | 6- 7- 6- 5-',
      '7- 5- 6- 7- | 5- 6- 7- 2 | . 7- 6- 5- | 6- 7- 6- 5-'
    ] }]
  },
  {
    id: 'singanebah', title: 'Lancaran Singanebah', kana: 'シンガネバ',
    level: 2, difficulty: '初級', scale: 'p', pathet: 'バラン', layout: 'barang',
    practice: '休符を挟む短い音型で、ペログの7を聴き分ける。',
    sourceUrl: 'https://gamelanbvg.com/gendhing/pdf/p7/Singanebah.pdf',
    sourceLabel: 'Gendhing Jawiの数字譜（PDF）',
    sourceNote: '原譜の上段の本体3行を1周として繰り返します。Tambanは含みません。',
    sections: [{ name: '本体', rows: [
      '. 5 . 3 | . 5 . 3 | . 5 . 3 | . 6 . 7',
      '. 6 . 7 | . 6 . 7 | . 6 . 7 | . 3 . 2',
      '. 3 . 2 | . 3 . 2 | . 3 . 2 | . 5 . 3'
    ] }]
  },
  {
    id: 'kebogiro', title: 'Lancaran Kebogiro', kana: 'クボ・ギロ',
    level: 3, difficulty: '初中級', scale: 'p', pathet: 'バラン', layout: 'barang',
    practice: '繰り返す音型を、低音域と中央の音域で弾き分ける。',
    sourceUrl: 'https://gamelanbvg.com/gendhing/pdf/p7/Kebogiro.pdf',
    sourceLabel: 'Gendhing Jawiの数字譜（PDF）',
    sourceNote: 'Ompakの5行を1周として繰り返します。Tamban（janturan）は含みません。',
    sections: [{ name: 'Ompak', rows: [
      '. 6- . 5- | . 3- . 2- | . 3- . 2- | . 6- . 5-',
      '. 6- . 5- | . 3- . 2- | . 3- . 2- | . 6- . 5-',
      '. 6 . 5 | . 6 . 7 | . 6 . 7 | . 6 . 5',
      '. 6 . 5 | . 6 . 7 | . 6 . 7 | . 6 . 5',
      '. 7 . 6 | . 3 . 2 | . 3 . 2 | . 6- . 5-'
    ] }]
  },
  {
    id: 'kandhang-bubrah', title: 'Lancaran Kandhang Bubrah', kana: 'カンダン・ブブラ',
    level: 4, difficulty: '中級', scale: 'p', pathet: 'ネム', layout: 'bem',
    practice: '1を使うベムの鍵盤で、長い休符と連続する音列を弾く。',
    sourceUrl: 'https://gamelanbvg.com/gendhing/pdf/p6/KandhangBubrah.pdf',
    sourceLabel: 'Gendhing Jawiの数字譜（PDF）',
    sourceNote: 'Ompakの4行を1周として繰り返します。ペログの鍵盤をベムに切り替えます。',
    sections: [{ name: 'Ompak', rows: [
      '. . 3 . | 1 2 3 . | 6 5 2 1 | 3 2 1 6',
      '. . 3 . | 1 2 3 . | 6 5 2 1 | 3 2 1 6',
      '5 2 5 3 | 5 2 5 3 | 6 5 2 1 | 3 2 1 6',
      '5 2 5 3 | 5 2 5 3 | 6 5 2 1 | 3 2 1 6'
    ] }]
  },
  {
    id: 'puspawarna', title: 'Ketawang Puspawarna', kana: 'プスポワルノ',
    level: 4, difficulty: '中級', scale: 's', pathet: 'マニュラ',
    practice: '前半と後半の違いを聴き、高い2・3への移動を練習する。',
    sourceUrl: 'https://gamelanbvg.com/gendhing/pdf/sm/Puspawarna.pdf',
    sourceLabel: 'Gendhing Jawiの数字譜（PDF）',
    sourceNote: 'OmpakからNgelikへ、それぞれ1回ずつで1周として繰り返します。',
    sections: [
      { name: 'Ompak', rows: [
        '. 2 . 3 | . 2 . 1 | . 3 . 2 | . 1 . 6-'
      ] },
      { name: 'Ngelik', rows: [
        '. . 6 . | 2+ 3+ 2+ 1+ | 3+ 2+ 6 5 | 2 3 5 3',
        '. . 3 2 | 5 3 2 1 | . 3 . 2 | . 1 . 6-',
        '. 2 . 3 | . 2 . 1 | . 3 . 2 | . 1 . 6-'
      ] }
    ]
  },
  {
    id: 'wilujeng', title: 'Ladrang Wilujeng', kana: 'ウィルジェン',
    level: 5, difficulty: '中上級', scale: 's', pathet: 'マニュラ',
    practice: '長めの旋律で、連打・休符・音域の変化を組み合わせる。',
    sourceUrl: 'https://gamelanbvg.com/gendhing/pdf/sm/Wilujeng.pdf',
    sourceLabel: 'Gendhing Jawiの数字譜（PDF）',
    sourceNote: 'OmpakからNgelikへ、それぞれ1回ずつで1周として繰り返します。',
    sections: [
      { name: 'Ompak', rows: [
        '2 1 2 3 | 2 1 2 6- | 3 3 . . | 6 5 3 2',
        '5 6 5 3 | 2 1 2 6- | 2 1 2 3 | 2 1 2 6-'
      ] },
      { name: 'Ngelik', rows: [
        '. . 6 . | 1+ 5 1+ 6 | 3 5 6 1+ | 6 5 3 2',
        '6 6 . . | 1+ 5 1+ 6 | 1+ 1+ 3 2 | . 1 2 6-'
      ] }
    ]
  }
];

function parseSongRow(row) {
  const beats = row.split('|').flatMap(gatra => {
    const tokens = gatra.trim().split(/\s+/);
    if (tokens.length !== 4) throw new Error('Each gatra must contain four beats');
    return tokens.map(token => {
      if (token === '.') return { note: null, octave: 0 };
      const match = /^([123567])([+-]?)$/.exec(token);
      if (!match) throw new Error(`Invalid score token: ${token}`);
      return { note: Number(match[1]), octave: match[2] === '+' ? 1 : match[2] === '-' ? -1 : 0 };
    });
  });
  if (beats.length !== 16) throw new Error('Each score row must contain sixteen beats');
  return beats;
}
