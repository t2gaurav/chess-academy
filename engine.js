/* Chess rules engine: legal moves, check, checkmate, stalemate, castling, en passant.
   Pawns always promote to queens. Board is an array of 64, index = row * 8 + file,
   row 0 is rank 8. Uppercase = white. A position is { b, turn, castle, ep }:
   castle is a string such as 'KQkq' (empty for none), ep is the en passant square or -1. */
(function (root) {
  'use strict';

  const FILES = 'abcdefgh';
  const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  // Squares whose pieces moving or being captured end a castling right
  const RIGHTS = { 60: 'KQ', 63: 'K', 56: 'Q', 4: 'kq', 7: 'k', 0: 'q' };

  const colorOf = p => (p === p.toUpperCase() ? 'w' : 'b');
  const other = c => (c === 'w' ? 'b' : 'w');
  const squareName = i => FILES[i & 7] + (8 - (i >> 3));

  function parse(fen) {
    const [placement, turn = 'w', castle = '-', ep = '-'] = fen.split(' ');
    const b = [];
    for (const row of placement.split('/')) {
      for (const ch of row) {
        if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) b.push(null);
        else b.push(ch);
      }
    }
    if (b.length !== 64) throw new Error('Bad FEN: ' + fen);
    return {
      b,
      turn,
      castle: castle === '-' ? '' : castle,
      ep: ep === '-' ? -1 : FILES.indexOf(ep[0]) + (8 - +ep[1]) * 8
    };
  }

  function attacked(b, sq, by) {
    const r = sq >> 3, c = sq & 7;
    const at = (rr, cc) => (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 ? b[rr * 8 + cc] : null);
    const mine = ch => (by === 'w' ? ch : ch.toLowerCase());
    const pr = by === 'w' ? r + 1 : r - 1;
    if (at(pr, c - 1) === mine('P') || at(pr, c + 1) === mine('P')) return true;
    for (const [dr, dc] of KNIGHT) if (at(r + dr, c + dc) === mine('N')) return true;
    for (const [dr, dc] of KING) if (at(r + dr, c + dc) === mine('K')) return true;
    const queen = mine('Q');
    for (const [dirs, piece] of [[ORTHO, mine('R')], [DIAG, mine('B')]]) {
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const p = b[rr * 8 + cc];
          if (p) {
            if (p === piece || p === queen) return true;
            break;
          }
          rr += dr; cc += dc;
        }
      }
    }
    return false;
  }

  function pseudoMoves(pos) {
    const { b, turn } = pos;
    const out = [];
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p || colorOf(p) !== turn) continue;
      const r = i >> 3, c = i & 7, t = p.toUpperCase();
      if (t === 'P') {
        const d = turn === 'w' ? -1 : 1, start = turn === 'w' ? 6 : 1, r1 = r + d;
        if (r1 < 0 || r1 > 7) continue;
        if (!b[r1 * 8 + c]) {
          out.push([i, r1 * 8 + c]);
          if (r === start && !b[(r + 2 * d) * 8 + c]) out.push([i, (r + 2 * d) * 8 + c]);
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          const to = r1 * 8 + cc, q = b[to];
          if (q ? colorOf(q) !== turn : to === pos.ep) out.push([i, to]);
        }
      } else if (t === 'N' || t === 'K') {
        for (const [dr, dc] of t === 'N' ? KNIGHT : KING) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          const q = b[rr * 8 + cc];
          if (!q || colorOf(q) !== turn) out.push([i, rr * 8 + cc]);
        }
        if (t === 'K' && i === (turn === 'w' ? 60 : 4) && pos.castle) {
          const rook = turn === 'w' ? 'R' : 'r', foe = other(turn);
          const kingside = turn === 'w' ? 'K' : 'k', queenside = turn === 'w' ? 'Q' : 'q';
          if (pos.castle.includes(kingside) && b[i + 3] === rook && !b[i + 1] && !b[i + 2] &&
              !attacked(b, i, foe) && !attacked(b, i + 1, foe)) out.push([i, i + 2]);
          if (pos.castle.includes(queenside) && b[i - 4] === rook && !b[i - 1] && !b[i - 2] && !b[i - 3] &&
              !attacked(b, i, foe) && !attacked(b, i - 1, foe)) out.push([i, i - 2]);
        }
      } else {
        const dirs = t === 'R' ? ORTHO : t === 'B' ? DIAG : ORTHO.concat(DIAG);
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            const q = b[rr * 8 + cc];
            if (!q) out.push([i, rr * 8 + cc]);
            else {
              if (colorOf(q) !== turn) out.push([i, rr * 8 + cc]);
              break;
            }
            rr += dr; cc += dc;
          }
        }
      }
    }
    return out;
  }

  function make(pos, [from, to]) {
    const b = pos.b.slice();
    let p = b[from];
    const t = p.toUpperCase();
    let ep = -1;
    if (t === 'P') {
      if (to === pos.ep && (from & 7) !== (to & 7) && !b[to]) b[(from >> 3) * 8 + (to & 7)] = null;
      if (Math.abs(to - from) === 16) ep = (from + to) / 2;
      if (to >> 3 === 0 && p === 'P') p = 'Q';
      if (to >> 3 === 7 && p === 'p') p = 'q';
    }
    if (t === 'K' && Math.abs((to & 7) - (from & 7)) === 2) {
      const rookFrom = to > from ? to + 1 : to - 2, rookTo = to > from ? to - 1 : to + 1;
      b[rookTo] = b[rookFrom];
      b[rookFrom] = null;
    }
    b[to] = p;
    b[from] = null;
    let castle = pos.castle;
    if (castle) {
      for (const sq of [from, to]) {
        const lost = RIGHTS[sq];
        if (lost) for (const ch of lost) castle = castle.replace(ch, '');
      }
    }
    return { b, turn: other(pos.turn), castle, ep };
  }

  function kingSquare(b, color) {
    return b.indexOf(color === 'w' ? 'K' : 'k');
  }

  function inCheck(pos, color = pos.turn) {
    const k = kingSquare(pos.b, color);
    return k >= 0 && attacked(pos.b, k, other(color));
  }

  function legalMoves(pos) {
    return pseudoMoves(pos).filter(m => !inCheck(make(pos, m), pos.turn));
  }

  /* 'ok' | 'check' | 'checkmate' | 'stalemate' for the side to move */
  function status(pos) {
    const check = inCheck(pos);
    if (legalMoves(pos).length) return check ? 'check' : 'ok';
    return check ? 'checkmate' : 'stalemate';
  }

  /* First moves by the side to move that force checkmate within n of its own moves. */
  function mateMoves(pos, n) {
    const out = [];
    for (const m of legalMoves(pos)) {
      const p = make(pos, m);
      const replies = legalMoves(p);
      if (!replies.length) {
        if (inCheck(p)) out.push(m);
        continue;
      }
      if (n > 1 && replies.every(r => mateMoves(make(p, r), n - 1).length > 0)) out.push(m);
    }
    return out;
  }

  /* A sensible defender for the lessons: grab loose pieces, avoid mate in one, stay central. */
  function chooseDefence(pos) {
    let best = null, bestScore = -Infinity;
    for (const m of legalMoves(pos)) {
      const p = make(pos, m);
      let score = 0;
      if (pos.b[m[1]]) score += 1000;
      if (mateMoves(p, 1).length) score -= 500;
      const k = kingSquare(p.b, pos.turn);
      if (k >= 0) {
        const r = k >> 3, c = k & 7;
        score -= (Math.abs(r - 3.5) + Math.abs(c - 3.5)) * 10;
      }
      score += Math.random();
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  function perft(pos, depth) {
    if (depth === 0) return 1;
    let n = 0;
    for (const m of legalMoves(pos)) n += perft(make(pos, m), depth - 1);
    return n;
  }

  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

  const api = {
    START_FEN, parse, legalMoves, make, status, inCheck, kingSquare, mateMoves,
    chooseDefence, squareName, perft, colorOf
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Chess = api;
})(typeof window !== 'undefined' ? window : this);
