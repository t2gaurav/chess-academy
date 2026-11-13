// Run with: node test.js
const assert = require('assert');
const C = require('./engine.js');
const LESSONS = require('./lessons.js');

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w';
assert.strictEqual(C.perft(C.parse(START), 1), 20);
assert.strictEqual(C.perft(C.parse(START), 2), 400);
assert.strictEqual(C.perft(C.parse(START), 3), 8902);
assert.strictEqual(C.perft(C.parse(START), 4), 197281);
console.log('perft ok');

let tasks = 0;
for (const lesson of LESSONS) {
  lesson.tasks.forEach((t, i) => {
    const name = `${lesson.id} #${i + 1}`;
    const pos = C.parse(t.fen);
    assert.strictEqual(pos.turn, 'w', name + ': white to move');
    assert(!C.inCheck(pos, 'b'), name + ': black must not start in check');
    assert.strictEqual(C.status(pos), 'ok', name + ': white must not start in check');
    if (t.type === 'check') {
      const checks = C.legalMoves(pos).filter(m => ['check', 'checkmate'].includes(C.status(C.make(pos, m))));
      assert(checks.length, name + ': has a checking move');
    } else if (t.type === 'mate') {
      assert(C.mateMoves(pos, t.n).length, name + `: mate in ${t.n} exists`);
      if (t.n > 1) assert.strictEqual(C.mateMoves(pos, t.n - 1).length, 0, name + ': is not an easier mate');
    } else {
      const reply = C.chooseDefence(C.make(pos, C.legalMoves(pos)[0]));
      assert(reply, name + ': defender has a move');
    }
    tasks++;
  });
}
console.log(`${tasks} tasks ok`);

// Castling and en passant against published reference counts
const perftCases = [
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -', 3, 97862],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -', 4, 43238]
];
for (const [fen, d, want] of perftCases) assert.strictEqual(C.perft(C.parse(fen), d), want);
console.log('castling and en passant perft ok');

// The computer finds the quickest mate in every lesson puzzle
const AI = require('./ai.js');
for (const lesson of LESSONS) for (const t of lesson.tasks) {
  if (t.type !== 'mate') continue;
  const pos = C.parse(t.fen), r = AI.bestMove(pos, 1500);
  assert(r.score > AI.MATE - 100, lesson.id + ': computer sees the mate');
  assert(C.mateMoves(pos, t.n).some(m => m[0] === r.move[0] && m[1] === r.move[1]), lesson.id + ': plays a mating move');
}
console.log('computer finds every mate');

// The friendly computer plays legal moves, takes a free queen, and finds a mate in one
{
  const win = C.parse('4k3/8/8/3q4/8/8/8/3RK3 w'); // the black queen on d5 is undefended and the rook can take it
  let took = 0;
  for (let i = 0; i < 30; i++) {
    const r = AI.casualMove(win);
    assert(C.legalMoves(win).some(m => m[0] === r.move[0] && m[1] === r.move[1]));
    if (r.move[1] === 27) took++; // d5
  }
  assert(took >= 28, 'friendly computer should nearly always take a free queen, took ' + took);
  const mate = C.parse('6k1/5ppp/8/8/8/8/8/R5K1 w');
  const m = AI.casualMove(mate).move;
  assert.strictEqual(C.status(C.make(mate, m)), 'checkmate');
}
console.log('friendly computer ok');
