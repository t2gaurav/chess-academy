# Checkmate Academy

A small chess app that teaches a child how to checkmate. It is plain HTML, CSS and JavaScript with no
dependencies, no accounts and no internet needed.

## Run it

Double-click `index.html`. Progress (stars) is saved in the browser on that computer.

## What it teaches

1. Check
2. Checkmate (queen and king)
3. Back rank mate
4. Two rooks: the ladder
5. Queen and king vs king (play it out against the computer)
6. Rook and king vs king (play it out against the computer)
7. Smothered mate
8. Giving up the queen for a mate in 2
9. Scholar's mate

Each puzzle has a Hint (press twice to see the move), Undo and Restart. Wrong moves are explained and taken back.

## Checkmate mode (hard)

The "Checkmate mode" button starts a full game: he is White and the computer is Black. The computer searches
about 4 moves ahead (2 seconds per move) and scores a checkmate higher the sooner it happens, so when it can
see a forced mate it plays the quickest one. It warns him when it sees one. Hint shows the computer's
suggested move for him, and Undo takes back his move and its reply. Pawns promote to queens automatically.
Draws are by stalemate or bare kings only (no repetition or 50-move rule).

## Two players and online play

- **Two players**: two people share one screen, White at the bottom, passing the iPad.
- **Play online**: one player taps Create a game and gets a 4-letter code. The other types it and taps Join.
  The creator plays White, and New game swaps colours. Moves go straight between the two devices using
  [PeerJS](https://peerjs.com) (WebRTC). PeerJS's free public broker (`0.peerjs.com`) only introduces the two
  devices; the game codes and the devices' network addresses pass through it, and no accounts are needed.
  Every move a friend sends is checked against the chess rules before it is played. If a friend goes quiet for
  20 seconds the game says so and waits; it does not end the game.

## Files

- `vendor/peerjs.min.js`: PeerJS 1.5.4 (MIT licence, see `vendor/peerjs-LICENSE.txt`), copied from npm so the app does not load anything from a CDN.
- `engine.js`: the rules, including castling and en passant, plus check, checkmate, stalemate and a mate finder.
- `ai.js`: the computer player for Checkmate mode.
- `lessons.js`: the lessons and puzzle positions (FEN). Add more here.
- `app.js`, `style.css`, `index.html`: the board and coach.
- `test.js`: `node test.js` checks the engine and confirms every puzzle really has the checkmate it claims.
