/* Lessons. Every position has White (the learner) to move.
   Task types:
     check    - make any move that gives check
     mate     - find a forced checkmate in n moves (any mating move is accepted)
     practice - play it out against the computer until it is checkmate */
(function (root) {
  'use strict';

  const LESSONS = [
    {
      id: 'check',
      title: 'Check!',
      teach: 'The big goal in chess is to trap the other king. When one of your pieces attacks the king, that is called CHECK. The king must then run away, block, or capture the attacker.',
      tasks: [
        { type: 'check', fen: '4k3/8/8/8/8/8/8/3QK3 w', hint: 'Your queen moves far. Find a square where she looks straight at the black king.', explain: 'The queen attacks the king. That is check!' },
        { type: 'check', fen: '4k3/8/8/8/8/8/8/R3K3 w', hint: 'Rooks move in straight lines. Which row is the black king on?', explain: 'The rook slides along the top row and attacks the king.' },
        { type: 'check', fen: '4k3/8/8/3N4/8/8/8/4K3 w', hint: 'Knights jump in an L shape. Which jump lands where it attacks the king?', explain: 'Knights attack with a jump, and nothing can block a jump.' }
      ]
    },
    {
      id: 'mate',
      title: 'Checkmate!',
      teach: 'CHECKMATE is check where the king has no escape: it cannot move to a safe square, cannot capture the attacker, and nothing can block. The game ends and you win! Find the checkmate in each puzzle.',
      tasks: [
        { type: 'mate', n: 1, fen: 'k7/8/1K6/8/8/8/7Q/8 w', hint: 'Your king already guards some squares. Find a queen move that gives check and covers the rest.', explain: 'Your king guards a7 and b7, and the queen covers the rest. No escape!' },
        { type: 'mate', n: 1, fen: '4k3/8/4K3/8/8/Q7/8/8 w', hint: 'Put the queen right next to the black king, on a square your own king protects.', explain: 'The queen is protected by your king, so the black king cannot capture her. Players call this the kiss of death.' },
        { type: 'mate', n: 1, fen: '6k1/8/6K1/8/8/8/8/3Q4 w', hint: 'Check along the top row. The black king is stuck on the edge.', explain: 'Your king covers the row below, and the queen covers the top row.' }
      ]
    },
    {
      id: 'backrank',
      title: 'Back rank mate',
      teach: 'A king that hides behind its own pawns can get trapped by them. If a rook or queen reaches the back row, the king cannot step forward because its own pawns are in the way. This is one of the most common checkmates, so look for it every game!',
      tasks: [
        { type: 'mate', n: 1, fen: '6k1/5ppp/8/8/8/8/8/R5K1 w', hint: 'Slide the rook to the very top row.', explain: 'The black pawns block the king in. Rook to a8 is checkmate.' },
        { type: 'mate', n: 1, fen: '6k1/5ppp/8/8/8/8/3Q4/6K1 w', hint: 'Which file is open all the way to the top?', explain: 'The queen reaches the back row and the pawns trap the king.' },
        { type: 'mate', n: 1, fen: '6k1/5ppp/8/8/8/8/1R6/6K1 w', hint: 'The same idea with a rook from the side.', explain: 'Back rank mate again. Always check where the enemy king can run.' }
      ]
    },
    {
      id: 'ladder',
      title: 'Two rooks: the ladder',
      teach: 'Two rooks make a team. One rook builds a wall on a row so the king cannot cross it. The other rook gives check. Then swap jobs and climb up like a ladder until the king is on the edge, and the last check is mate.',
      tasks: [
        { type: 'mate', n: 1, fen: '4k3/R7/8/8/8/8/8/1R2K3 w', hint: 'One rook already guards the row below the king. Use the other for the check.', explain: 'One rook guards row 7 and the other checks on row 8. The king is stuck!' },
        { type: 'mate', n: 2, fen: '7k/8/8/8/8/8/R7/1R2K3 w', hint: 'First build a wall that stops the king moving down. Then give check.', explain: 'Ra7 builds the wall, the king has only one move, and Rb8 is checkmate.' },
        {
          type: 'practice', fen: '8/4k3/8/8/8/8/R7/1R2K3 w', hint: 'Use one rook as a wall, and the other to check.',
          tips: ['Use one rook to make a wall the king cannot cross.', 'Check with the other rook to push the king back, then swap the jobs of the rooks.', 'Keep your rooks far from the king, or next to each other, so the king cannot capture one.']
        }
      ]
    },
    {
      id: 'queen',
      title: 'Queen and king',
      teach: 'With a queen and king you can always win. Use the queen to shrink the box the black king lives in, bring your own king closer, then finish with mate. Be careful of STALEMATE: if Black has no legal move but is not in check, the game is a draw, not a win!',
      tasks: [
        {
          type: 'practice', fen: '8/8/3k4/8/8/8/8/4KQ2 w', hint: 'Shrink the box.',
          tips: ['Put the queen a knight jump away from the king, so he cannot touch her.', 'Make the box smaller each move. Do not give check too early.', 'Bring your king close to help, then give the queen check next to the king.', 'Before every move ask: does Black still have a move? If not, and he is not in check, that is stalemate.']
        },
        {
          type: 'practice', fen: '8/8/8/8/4k3/8/8/Q3K3 w', hint: 'Shrink the box.',
          tips: ['Cut the king off with the queen, then walk your king over.', 'Do not let the king get next to your queen with nothing protecting her.', 'Watch out for stalemate!']
        }
      ]
    },
    {
      id: 'rook',
      title: 'Rook and king',
      teach: 'A rook and king can also win, but it takes a little more teamwork. Use the rook to cut off the king, walk your own king up to face him, then the rook gives the final check on the edge.',
      tasks: [
        {
          type: 'practice', fen: '8/8/8/4k3/8/8/8/R3K3 w', hint: 'Cut the king off with the rook.',
          tips: ['Use the rook to cut the black king off from one side of the board.', 'Walk your king forward so the two kings face each other, with one square between them.', 'When the black king has to step back, use the rook to move to the same row as the black king for a check.', 'Never leave your rook where the black king can capture it.']
        }
      ]
    },
    {
      id: 'smothered',
      title: 'Smothered mate',
      teach: 'Knights jump over other pieces, and they cannot be blocked. When a king is surrounded by its own pieces, a knight can give a checkmate that nothing can stop. This is called a smothered mate.',
      tasks: [
        { type: 'mate', n: 1, fen: '6rk/6pp/8/6N1/8/8/8/6K1 w', hint: 'Find the knight jump that attacks the king in the corner.', explain: 'The king is smothered by its own rook and pawns, and the knight attacks it. Nowhere to go!' }
      ]
    },
    {
      id: 'patterns',
      title: 'Famous mating patterns',
      teach: 'Strong players spot patterns they have seen before. Learn these three and you will find checkmates much faster. Each puzzle is a different named pattern.',
      tasks: [
        { type: 'mate', n: 1, fen: '7k/R7/5N2/8/8/8/8/6K1 w', hint: 'The rook goes next to the king, and the knight protects it. This is the Arabian mate.', explain: 'Arabian mate: the knight protects the rook, and also covers the escape square on g8.' },
        { type: 'mate', n: 1, fen: '8/4N1pk/8/8/8/8/K7/R7 w', hint: 'The king is boxed in by his own pawn and the knight. Check along the h-file. This is Anastasia\'s mate.', explain: 'Anastasia\'s mate: the knight covers g8 and g6, his own pawn blocks g7, and the rook checks down the h-file.' },
        { type: 'mate', n: 1, fen: '2kr4/3n4/8/8/5B2/8/8/5BK1 w', hint: 'Two bishops cross over each other. One checks, and the other covers the escape squares. This is Boden\'s mate.', explain: 'Boden\'s mate: two bishops on crossing diagonals. One gives check and the other covers b8 and c7.' }
      ]
    },
    {
      id: 'sacrifice',
      title: 'Mate in 2',
      teach: 'Now think two moves ahead. You move, Black has to reply, then you checkmate. Ask yourself: after my move, what are all of Black\'s replies, and do I have mate against every one? Sometimes the best move gives up your strongest piece.',
      tasks: [
        { type: 'mate', n: 2, fen: 'k7/8/2K5/8/8/8/8/6Q1 w', hint: 'Check from far away so the king has only one square to go to. Then step in next to him, protected by your king.', explain: 'Qg8 check forces the king to a7, and then Qb7 is checkmate, protected by your king.' },
        { type: 'mate', n: 2, fen: 'r5k1/5ppp/8/8/8/8/4Q3/4R1K1 w', hint: 'Check on the back row with the queen. Black has to take her, and then your rook finishes.', explain: 'Qe8 forces the rook to capture, and then Rxe8 is checkmate. A great trade!' }
      ]
    },
    {
      id: 'scholar',
      title: 'A famous trap',
      teach: 'Scholar\'s mate is a trap that checkmates in just four moves, aiming at the weak f7 pawn next to the king. You will see it in real games, so learn to use it and to stop it. Here White has played e4, Bc4 and Qh5. Finish the job!',
      tasks: [
        { type: 'mate', n: 1, fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w', hint: 'Take the pawn that only the king guards. The bishop is protecting you.', explain: 'Qxf7 is checkmate, because the bishop on c4 protects the queen. To stop this trap as Black, defend the f7 pawn early!' }
      ]
    }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = LESSONS;
  else root.LESSONS = LESSONS;
})(typeof window !== 'undefined' ? window : this);
