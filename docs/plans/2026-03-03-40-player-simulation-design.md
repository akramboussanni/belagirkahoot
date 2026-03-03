# 40-Player Simulation — Design

## Goal

Verify correctness of the game engine with 40 concurrent players. Functional integration test, not a load/stress test.

## Approach

Go integration test (`simulation_test.go`) that spins up the real server in-process, connects 40 player WebSockets + 1 host WebSocket, plays through a full 5-question game, and asserts correctness of scores, leaderboard, and podium.

## File

`backend/internal/handlers/simulation_test.go`

Build tag: `//go:build integration`

## Test Flow

1. **Setup**: Test DB + Redis, seed quiz (5 questions, 4 options each, 20s time limit), create session via HTTP
2. **Join**: 40 HTTP calls to `POST /sessions/join`
3. **Connect**: 1 host + 40 player WebSocket connections (goroutines)
4. **Start**: Host calls `POST /sessions/{id}/start`
5. **Per question (x5)**:
   - All 41 clients receive `question`
   - Players 1–25 answer correctly, players 26–40 answer wrong (deterministic)
   - Staggered timing: random 0.5s–3s delay per player
   - All receive `answer_reveal`, then `leaderboard`
   - Host sends `next_question`
6. **End**: All receive `podium` after last question

## Assertions

- All 40 `player_joined` messages received
- Every player received all 5 `question` messages
- `answer_reveal`: correct players have points > 0, wrong players have 0
- `leaderboard`: 40 entries, sorted by score desc, ranks sequential
- `podium`: top 3 from correct group, ordered by speed
- DB: `game_players` has correct totals, `game_answers` has 200 rows
