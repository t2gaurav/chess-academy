/* Computer player for Checkmate mode.
   Iterative-deepening alpha-beta search within a time limit. A checkmate is scored higher the
   sooner it happens, so when the computer can see a forced mate it plays the quickest one.
   The evaluation rewards material, active pieces and pieces close to the enemy king. */
(function (root) {
  'use strict';

  const C = typeof require !== 'undefined' && typeof module !== 'undefined' ? require('./engine.js') : root.Chess;
  const { legalMoves, make, inCheck, kingSquare } = C;

  const MATE = 100000;
  const INF = 1e9;
  const VALUE = { P: 100, N: 320, B: 335, R: 500, Q: 900, K: 0 };
  const TROPISM = { N: 4, B: 3, R: 2, Q: 5 };
  const TIMEOUT = { timeout: true };

  let deadline = 0, nodes = 0;

  function evaluate(pos) {
    const b = pos.b;
    const wk = kingSquare(b, 'w'), bk = kingSquare(b, 'b');
    const wkr = wk >> 3, wkc = wk & 7, bkr = bk >> 3, bkc = bk & 7;
    let score = 0, wPieces = 0, bPieces = 0, material = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p) continue;
      const white = p === p.toUpperCase(), t = p.toUpperCase();
      if (t === 'K') continue;
      const r = i >> 3, c = i & 7;
      let v = VALUE[t];
      material += VALUE[t];
      if (white) wPieces++; else bPieces++;
      if (t === 'P') {
        v += (white ? 6 - r : r - 1) * 8;
        if (c === 3 || c === 4) v += 6;
      } else if (t === 'N' || t === 'B') {
        v += (3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5))) * 7;
      }
      if (TROPISM[t]) {
        const dist = white ? Math.max(Math.abs(r - bkr), Math.abs(c - bkc)) : Math.max(Math.abs(r - wkr), Math.abs(c - wkc));
        v += (7 - dist) * TROPISM[t];
      }
      score += white ? v : -v;
    }
    // Keep the king tucked away while there is still a lot of material on the board
    if (material > 2600) {
      if (wk === 62 || wk === 58) score += 25;
      if (bk === 6 || bk === 2) score -= 25;
    }
    // Mop-up: a lone king is driven to the edge and the winning king walks over to help
    const mop = (loserR, loserC, winnerR, winnerC) =>
      (Math.abs(loserR - 3.5) + Math.abs(loserC - 3.5)) * 12 +
      (14 - Math.abs(loserR - winnerR) - Math.abs(loserC - winnerC)) * 6;
    if (bPieces === 0 && wPieces > 0) score += mop(bkr, bkc, wkr, wkc);
    if (wPieces === 0 && bPieces > 0) score -= mop(wkr, wkc, bkr, bkc);
    return pos.turn === 'w' ? score : -score;
  }

  function orderScore(pos, m) {
    const victim = pos.b[m[1]], mover = pos.b[m[0]];
    let s = 0;
    if (victim) s += 10 * VALUE[victim.toUpperCase()] - VALUE[mover.toUpperCase()] + 1000;
    if (mover === 'P' && m[1] >> 3 === 0) s += 800;
    if (mover === 'p' && m[1] >> 3 === 7) s += 800;
    return s;
  }

  const ordered = (pos, moves) => moves.map(m => [orderScore(pos, m), m]).sort((x, y) => y[0] - x[0]).map(x => x[1]);

  function tick() {
    if ((++nodes & 255) === 0 && Date.now() > deadline) throw TIMEOUT;
  }

  function quiesce(pos, alpha, beta, qd) {
    tick();
    const stand = evaluate(pos);
    if (qd >= 6) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const captures = legalMoves(pos).filter(m => pos.b[m[1]]);
    for (const m of ordered(pos, captures)) {
      const s = -quiesce(make(pos, m), -beta, -alpha, qd + 1);
      if (s >= beta) return s;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }

  function search(pos, depth, alpha, beta, ply) {
    tick();
    const moves = legalMoves(pos);
    if (!moves.length) return inCheck(pos) ? -(MATE - ply) : 0;
    if (depth <= 0) {
      if (!inCheck(pos) || ply > 24) return quiesce(pos, alpha, beta, 0);
      depth = 1; // never stop the search while a king is in check
    }
    let best = -INF;
    for (const m of ordered(pos, moves)) {
      const s = -search(make(pos, m), depth - 1, -beta, -alpha, ply + 1);
      if (s > best) best = s;
      if (s > alpha) alpha = s;
      if (alpha >= beta) break;
    }
    return best;
  }

  /* Returns { move, score, depth }. score is from the side to move's point of view;
     a score above MATE - 100 means a forced checkmate was found. */
  function bestMove(pos, ms = 2000, maxDepth = 8) {
    deadline = Date.now() + ms;
    nodes = 0;
    let moves = legalMoves(pos);
    if (!moves.length) return null;
    if (moves.length === 1) return { move: moves[0], score: 0, depth: 0 };
    moves.sort(() => Math.random() - 0.5);
    moves = ordered(pos, moves);
    let best = moves[0], bestScore = 0, depthDone = 0;
    for (let d = 1; d <= maxDepth; d++) {
      let curBest = null, curScore = -INF, alpha = -INF;
      try {
        for (const m of moves) {
          const s = -search(make(pos, m), d - 1, -INF, -alpha, 1);
          if (s > curScore) { curScore = s; curBest = m; }
          if (s > alpha) alpha = s;
        }
      } catch (e) {
        if (e !== TIMEOUT) throw e;
        break;
      }
      best = curBest; bestScore = curScore; depthDone = d;
      moves = [best].concat(moves.filter(m => m !== best));
      if (Math.abs(bestScore) > MATE - 100) break; // the quickest mate is found at the shallowest depth
    }
    return { move: best, score: bestScore, depth: depthDone };
  }

  const api = { bestMove, evaluate, MATE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AI = api;
})(typeof window !== 'undefined' ? window : this);
