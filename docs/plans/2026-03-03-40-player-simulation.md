# 40-Player Simulation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify the game engine works correctly with 40 concurrent players via a Go integration test, plus a standalone Go script for visual verification against a running server.

**Architecture:** A single integration test file using real PostgreSQL, Redis, httptest.Server, and gorilla/websocket clients. 40 player goroutines + 1 host goroutine connect via WebSocket, play through a 5-question game, and assertions verify scores, leaderboard, and podium. A separate `cmd/simulate/` binary connects to a live server for visual testing.

**Tech Stack:** Go, gorilla/websocket, pgx/v5, go-redis/v9, httptest, chi

---

### Task 1: Integration test helpers

**Files:**
- Create: `backend/internal/handlers/simulation_test.go`

**Step 1: Write the test file with build tag and helpers**

```go
//go:build integration

package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/HassanA01/Hilal/backend/internal/config"
	"github.com/HassanA01/Hilal/backend/internal/db"
	"github.com/HassanA01/Hilal/backend/internal/hub"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

const (
	testDBURL    = "postgres://hilal:hilal@localhost:5434/hilal?sslmode=disable"
	testRedisURL = "redis://localhost:6380"
	testJWT      = "test-secret-that-is-long-enough-for-integration"
)

// setupIntegration connects to test DB + Redis, runs migrations, and returns
// a live httptest.Server with all routes registered. The cleanup function
// truncates all tables and closes connections.
func setupIntegration(t *testing.T) (srv *httptest.Server, cfg *config.Config, pool *pgxpool.Pool, rc *redis.Client, cleanup func()) {
	t.Helper()
	ctx := context.Background()

	pool, err := db.Connect(testDBURL)
	if err != nil {
		t.Fatalf("db connect: %v", err)
	}
	if err := db.Migrate(testDBURL); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	rc, err = db.ConnectRedis(testRedisURL)
	if err != nil {
		t.Fatalf("redis connect: %v", err)
	}

	cfg = &config.Config{
		Port:        "0",
		DatabaseURL: testDBURL,
		RedisURL:    testRedisURL,
		JWTSecret:   testJWT,
		FrontendURL: "", // set after server starts
	}

	gameHub := hub.New(rc)
	go gameHub.Run()

	h := New(pool, rc, gameHub, cfg)

	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	h.RegisterRoutes(r)

	srv = httptest.NewServer(r)
	// Update FrontendURL to match the test server origin so WS CheckOrigin passes
	cfg.FrontendURL = "http://" + srv.Listener.Addr().String()
	// Re-create handler with correct FrontendURL
	h2 := New(pool, rc, gameHub, cfg)
	r2 := chi.NewRouter()
	r2.Use(middleware.Recoverer)
	h2.RegisterRoutes(r2)
	srv.Config.Handler = r2

	cleanup = func() {
		srv.Close()
		tables := []string{"game_answers", "game_players", "game_sessions", "options", "questions", "quizzes", "admins"}
		for _, tbl := range tables {
			_, _ = pool.Exec(ctx, fmt.Sprintf("TRUNCATE %s CASCADE", tbl))
		}
		_ = rc.FlushDB(ctx).Err()
		pool.Close()
		rc.Close()
	}

	return srv, cfg, pool, rc, cleanup
}

// apiPost is a helper to make JSON POST requests to the test server.
func apiPost(t *testing.T, srv *httptest.Server, path string, body any, token string) (int, map[string]any) {
	t.Helper()
	data, _ := json.Marshal(body)
	req, _ := http.NewRequest(http.MethodPost, srv.URL+path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("POST %s: %v", path, err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var result map[string]any
	_ = json.Unmarshal(raw, &result)
	return resp.StatusCode, result
}

// apiDelete is a helper to make DELETE requests to the test server.
func apiDelete(t *testing.T, srv *httptest.Server, path string, token string) int {
	t.Helper()
	req, _ := http.NewRequest(http.MethodDelete, srv.URL+path, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE %s: %v", path, err)
	}
	resp.Body.Close()
	return resp.StatusCode
}
```

**Step 2: Run test to verify it compiles**

Run: `cd backend && go test -tags integration -run TestSimulation40Players -count=1 -v ./internal/handlers/ 2>&1 | head -5`
Expected: "testing: warning: no tests to run" (no test function yet, but file compiles)

**Step 3: Commit**

```bash
git add backend/internal/handlers/simulation_test.go
git commit -m "test: add integration test helpers for 40-player simulation"
```

---

### Task 2: Seed data + admin auth helper

**Files:**
- Modify: `backend/internal/handlers/simulation_test.go`

**Step 1: Add seed and auth helpers**

Add these functions to the test file:

```go
// seedQuiz creates an admin, a quiz with 5 questions (4 options each, first is correct),
// and returns the admin JWT token and quiz ID.
func seedQuiz(t *testing.T, srv *httptest.Server, pool *pgxpool.Pool) (token string, quizID string) {
	t.Helper()

	// Register admin
	status, body := apiPost(t, srv, "/api/v1/auth/register", map[string]string{
		"email":    "sim@test.com",
		"password": "password123",
	}, "")
	if status != http.StatusCreated {
		t.Fatalf("register: %d %v", status, body)
	}
	token, _ = body["token"].(string)

	// Create quiz
	status, body = apiPost(t, srv, "/api/v1/quizzes", map[string]any{
		"title": "Simulation Quiz",
		"questions": []map[string]any{
			{
				"text":       "Q1: What is 1+1?",
				"time_limit": 20,
				"options": []map[string]any{
					{"text": "2", "is_correct": true},
					{"text": "3", "is_correct": false},
					{"text": "4", "is_correct": false},
					{"text": "5", "is_correct": false},
				},
			},
			{
				"text":       "Q2: What is 2+2?",
				"time_limit": 20,
				"options": []map[string]any{
					{"text": "4", "is_correct": true},
					{"text": "5", "is_correct": false},
					{"text": "6", "is_correct": false},
					{"text": "7", "is_correct": false},
				},
			},
			{
				"text":       "Q3: What is 3+3?",
				"time_limit": 20,
				"options": []map[string]any{
					{"text": "6", "is_correct": true},
					{"text": "7", "is_correct": false},
					{"text": "8", "is_correct": false},
					{"text": "9", "is_correct": false},
				},
			},
			{
				"text":       "Q4: What is 4+4?",
				"time_limit": 20,
				"options": []map[string]any{
					{"text": "8", "is_correct": true},
					{"text": "9", "is_correct": false},
					{"text": "10", "is_correct": false},
					{"text": "11", "is_correct": false},
				},
			},
			{
				"text":       "Q5: What is 5+5?",
				"time_limit": 20,
				"options": []map[string]any{
					{"text": "10", "is_correct": true},
					{"text": "11", "is_correct": false},
					{"text": "12", "is_correct": false},
					{"text": "13", "is_correct": false},
				},
			},
		},
	}, token)
	if status != http.StatusCreated {
		t.Fatalf("create quiz: %d %v", status, body)
	}
	quizID, _ = body["id"].(string)
	return token, quizID
}
```

**Step 2: Verify compilation**

Run: `cd backend && go build -tags integration ./internal/handlers/`
Expected: exit 0

**Step 3: Commit**

```bash
git add backend/internal/handlers/simulation_test.go
git commit -m "test: add seed quiz helper for simulation"
```

---

### Task 3: WebSocket client helper

**Files:**
- Modify: `backend/internal/handlers/simulation_test.go`

**Step 1: Add WS client helper and message reader**

```go
import (
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// wsMessage is a generic WS message for test parsing.
type wsMessage struct {
	Type    string         `json:"type"`
	Payload map[string]any `json:"payload"`
}

// wsRawMessage keeps the raw payload for flexible parsing.
type wsRawMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// dialWS connects to the test server's WebSocket endpoint.
func dialWS(t *testing.T, srv *httptest.Server, path string) *websocket.Conn {
	t.Helper()
	u, _ := url.Parse(srv.URL)
	u.Scheme = "ws"
	u.Path = path

	header := http.Header{}
	header.Set("Origin", "http://"+u.Host)

	conn, resp, err := websocket.DefaultDialer.Dial(u.String(), header)
	if err != nil {
		body := ""
		if resp != nil {
			raw, _ := io.ReadAll(resp.Body)
			body = string(raw)
		}
		t.Fatalf("dial %s: %v %s", path, err, body)
	}
	return conn
}

// readMessages reads WS messages into a slice until the connection closes or
// the context is cancelled. Safe for concurrent use via the returned slice
// being accessed only after wg.Wait().
func readMessages(conn *websocket.Conn, out *[]wsRawMessage, mu *sync.Mutex, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return
		}
		// Server may batch messages with newlines
		for _, line := range bytes.Split(raw, []byte("\n")) {
			line = bytes.TrimSpace(line)
			if len(line) == 0 {
				continue
			}
			var msg wsRawMessage
			if json.Unmarshal(line, &msg) == nil {
				mu.Lock()
				*out = append(*out, msg)
				mu.Unlock()
			}
		}
	}
}
```

**Step 2: Verify compilation**

Run: `cd backend && go build -tags integration ./internal/handlers/`
Expected: exit 0

**Step 3: Commit**

```bash
git add backend/internal/handlers/simulation_test.go
git commit -m "test: add WebSocket client helpers for simulation"
```

---

### Task 4: Main simulation test — setup, join, connect

**Files:**
- Modify: `backend/internal/handlers/simulation_test.go`

**Step 1: Write the test function with setup, join, and WS connect phases**

```go
func TestSimulation40Players(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	const numPlayers = 40

	srv, _, pool, _, cleanup := setupIntegration(t)
	defer cleanup()

	// ── Seed quiz and create session ───────────────────────────────
	token, quizID := seedQuiz(t, srv, pool)

	status, body := apiPost(t, srv, "/api/v1/sessions", map[string]string{
		"quiz_id": quizID,
	}, token)
	if status != http.StatusCreated {
		t.Fatalf("create session: %d %v", status, body)
	}
	sessionID, _ := body["session_id"].(string)
	sessionCode, _ := body["code"].(string)
	t.Logf("session created: id=%s code=%s", sessionID, sessionCode)

	// ── Join 40 players via HTTP ───────────────────────────────────
	type playerInfo struct {
		ID   string
		Name string
	}
	players := make([]playerInfo, numPlayers)
	for i := 0; i < numPlayers; i++ {
		name := fmt.Sprintf("Player %d", i+1)
		status, body := apiPost(t, srv, "/api/v1/sessions/join", map[string]string{
			"code": sessionCode,
			"name": name,
		}, "")
		if status != http.StatusOK {
			t.Fatalf("join player %d: %d %v", i+1, status, body)
		}
		id, _ := body["player_id"].(string)
		players[i] = playerInfo{ID: id, Name: name}
	}
	t.Logf("all %d players joined via HTTP", numPlayers)

	// ── Connect host WebSocket ─────────────────────────────────────
	hostConn := dialWS(t, srv, "/api/v1/ws/host/"+sessionCode)
	defer hostConn.Close()

	var hostMsgs []wsRawMessage
	var hostMu sync.Mutex
	var wg sync.WaitGroup
	wg.Add(1)
	go readMessages(hostConn, &hostMsgs, &hostMu, &wg)

	// ── Connect 40 player WebSockets ───────────────────────────────
	type playerConn struct {
		conn *websocket.Conn
		msgs *[]wsRawMessage
		mu   *sync.Mutex
	}
	pConns := make([]playerConn, numPlayers)
	for i, p := range players {
		path := fmt.Sprintf("/api/v1/ws/player/%s?player_id=%s&name=%s",
			sessionCode, p.ID, url.QueryEscape(p.Name))
		conn := dialWS(t, srv, path)
		defer conn.Close()
		msgs := &[]wsRawMessage{}
		mu := &sync.Mutex{}
		pConns[i] = playerConn{conn: conn, msgs: msgs, mu: mu}
		wg.Add(1)
		go readMessages(conn, msgs, mu, &wg)
	}
	t.Logf("all %d player WebSockets connected", numPlayers)

	// Give time for player_joined broadcasts to settle
	time.Sleep(500 * time.Millisecond)

	// ── Start game ─────────────────────────────────────────────────
	status, _ = apiPost(t, srv, "/api/v1/sessions/"+sessionID+"/start", nil, token)
	if status != http.StatusOK {
		t.Fatalf("start session: %d", status)
	}
	t.Log("game started")

	// Wait for game_started + first question (3s engine delay + buffer)
	time.Sleep(5 * time.Second)

	// ── CONTINUED IN TASK 5 ────────────────────────────────────────
}
```

**Step 2: Run the test to verify setup + join + connect works**

Run: `cd backend && go test -tags integration -run TestSimulation40Players -count=1 -timeout 120s -v ./internal/handlers/`
Expected: Logs showing session created, 40 players joined, all WS connected, game started. Test will timeout at the sleep but that's OK — we'll add the game loop next.

**Step 3: Commit**

```bash
git add backend/internal/handlers/simulation_test.go
git commit -m "test: add simulation setup, join, and connect phases"
```

---

### Task 5: Game loop — answer, verify, advance

**Files:**
- Modify: `backend/internal/handlers/simulation_test.go`

**Step 1: Replace the "CONTINUED IN TASK 5" comment with the game loop and assertions**

```go
	// ── Game loop: 5 questions ─────────────────────────────────────
	for q := 0; q < 5; q++ {
		t.Logf("── question %d ──", q+1)

		// Wait for player messages to have the question
		var questionMsg wsRawMessage
		deadline := time.Now().Add(10 * time.Second)
		for time.Now().Before(deadline) {
			pConns[0].mu.Lock()
			for _, m := range *pConns[0].msgs {
				if m.Type == "question" {
					questionMsg = m
				}
			}
			pConns[0].mu.Unlock()
			if questionMsg.Type == "question" {
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		if questionMsg.Type != "question" {
			t.Fatalf("Q%d: player 0 never received question message", q+1)
		}

		// Parse question to get option IDs
		var qPayload struct {
			QuestionIndex  int `json:"question_index"`
			TotalQuestions int `json:"total_questions"`
			Question       struct {
				ID      string `json:"id"`
				Text    string `json:"text"`
				Options []struct {
					ID   string `json:"id"`
					Text string `json:"text"`
				} `json:"options"`
			} `json:"question"`
		}
		json.Unmarshal(questionMsg.Payload, &qPayload)
		t.Logf("  question: %s (%d options)", qPayload.Question.Text, len(qPayload.Question.Options))

		if len(qPayload.Question.Options) == 0 {
			t.Fatalf("Q%d: no options in question", q+1)
		}

		// Players 0-24 answer correctly (first option), players 25-39 answer wrong (second option)
		correctOptionID := qPayload.Question.Options[0].ID
		wrongOptionID := qPayload.Question.Options[1].ID

		for i := 0; i < numPlayers; i++ {
			optionID := correctOptionID
			if i >= 25 {
				optionID = wrongOptionID
			}
			answer := map[string]any{
				"type": "answer_submitted",
				"payload": map[string]string{
					"question_id": qPayload.Question.ID,
					"option_id":   optionID,
				},
			}
			data, _ := json.Marshal(answer)
			if err := pConns[i].conn.WriteMessage(websocket.TextMessage, data); err != nil {
				t.Fatalf("Q%d: player %d write answer: %v", q+1, i, err)
			}
			// Stagger answers slightly to test timing-based scoring
			if i < 25 {
				time.Sleep(20 * time.Millisecond) // correct answers staggered
			}
		}
		t.Logf("  all %d answers submitted", numPlayers)

		// Wait for answer_reveal + leaderboard (3s reveal + 3s leaderboard + buffer)
		time.Sleep(8 * time.Second)

		// Verify answer_reveal was received by players
		pConns[0].mu.Lock()
		revealCount := 0
		for _, m := range *pConns[0].msgs {
			if m.Type == "answer_reveal" {
				revealCount++
			}
		}
		pConns[0].mu.Unlock()
		if revealCount < q+1 {
			t.Fatalf("Q%d: expected %d answer_reveal messages, got %d", q+1, q+1, revealCount)
		}

		// Host sends next_question (except after last question)
		if q < 4 {
			nextMsg, _ := json.Marshal(map[string]any{
				"type":    "next_question",
				"payload": map[string]any{},
			})
			if err := hostConn.WriteMessage(websocket.TextMessage, nextMsg); err != nil {
				t.Fatalf("Q%d: host write next_question: %v", q+1, err)
			}
			// Wait for next question to be broadcast
			time.Sleep(2 * time.Second)
		}
	}

	// Wait for podium
	time.Sleep(5 * time.Second)

	// ── Close all connections ──────────────────────────────────────
	hostConn.WriteMessage(websocket.CloseMessage,
		websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
	for _, pc := range pConns {
		pc.conn.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
	}
	time.Sleep(500 * time.Millisecond)

	// ── ASSERTIONS ─────────────────────────────────────────────────

	// 1. Check host received podium
	hostMu.Lock()
	hostGotPodium := false
	hostLeaderboardCount := 0
	for _, m := range hostMsgs {
		if m.Type == "podium" {
			hostGotPodium = true
		}
		if m.Type == "leaderboard" {
			hostLeaderboardCount++
		}
	}
	hostMu.Unlock()

	if !hostGotPodium {
		t.Error("host never received podium message")
	}
	if hostLeaderboardCount < 5 {
		t.Errorf("host received %d leaderboard messages, expected 5", hostLeaderboardCount)
	}

	// 2. Check all players received podium
	for i, pc := range pConns {
		pc.mu.Lock()
		gotPodium := false
		questionCount := 0
		revealCount := 0
		for _, m := range *pc.msgs {
			switch m.Type {
			case "podium":
				gotPodium = true
			case "question":
				questionCount++
			case "answer_reveal":
				revealCount++
			}
		}
		pc.mu.Unlock()
		if !gotPodium {
			t.Errorf("player %d (%s): never received podium", i, players[i].Name)
		}
		if questionCount < 5 {
			t.Errorf("player %d: received %d questions, expected 5", i, questionCount)
		}
		if revealCount < 5 {
			t.Errorf("player %d: received %d reveals, expected 5", i, revealCount)
		}
	}

	// 3. Verify DB state — game_answers should have 200 rows (40 players × 5 questions)
	var answerCount int
	err := pool.QueryRow(context.Background(),
		"SELECT COUNT(*) FROM game_answers WHERE session_id = $1", sessionID).Scan(&answerCount)
	if err != nil {
		t.Fatalf("count answers: %v", err)
	}
	if answerCount != numPlayers*5 {
		t.Errorf("expected %d game_answers rows, got %d", numPlayers*5, answerCount)
	}

	// 4. Verify correct players have positive scores, wrong players have 0
	var correctScoreSum, wrongScoreSum int
	for i, p := range players {
		var score int
		err := pool.QueryRow(context.Background(),
			"SELECT score FROM game_players WHERE id = $1", p.ID).Scan(&score)
		if err != nil {
			t.Fatalf("get score for player %d: %v", i, err)
		}
		if i < 25 {
			correctScoreSum += score
			if score <= 0 {
				t.Errorf("player %d (correct): expected positive score, got %d", i, score)
			}
		} else {
			wrongScoreSum += score
			if score != 0 {
				t.Errorf("player %d (wrong): expected 0 score, got %d", i, score)
			}
		}
	}
	t.Logf("correct group total score: %d, wrong group total score: %d", correctScoreSum, wrongScoreSum)

	// 5. Verify session is finished
	var sessionStatus string
	err = pool.QueryRow(context.Background(),
		"SELECT status FROM game_sessions WHERE id = $1", sessionID).Scan(&sessionStatus)
	if err != nil {
		t.Fatalf("get session status: %v", err)
	}
	if sessionStatus != "finished" {
		t.Errorf("expected session status 'finished', got %q", sessionStatus)
	}

	t.Log("simulation complete — all assertions passed")
```

**Step 2: Run the full simulation test**

Run: `cd backend && go test -tags integration -run TestSimulation40Players -count=1 -timeout 180s -v ./internal/handlers/`
Expected: PASS — all 40 players connect, play 5 questions, assertions pass. Test takes ~60-90 seconds.

**Step 3: Commit**

```bash
git add backend/internal/handlers/simulation_test.go
git commit -m "test: add 40-player game loop and assertions to simulation"
```

---

### Task 6: Standalone visual simulation script

**Files:**
- Create: `backend/cmd/simulate/main.go`

This is a standalone binary that connects to a **running** server, so you can watch the game play out in the browser.

**Step 1: Write the simulate command**

```go
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type wsMsg struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

func main() {
	apiBase := flag.String("api", "http://localhost:8081", "API base URL")
	wsBase := flag.String("ws", "ws://localhost:8081", "WebSocket base URL")
	sessionCode := flag.String("code", "", "Session code to join (required)")
	numPlayers := flag.Int("players", 40, "Number of simulated players")
	flag.Parse()

	if *sessionCode == "" {
		fmt.Fprintln(os.Stderr, "usage: simulate -code <6-digit-code> [-players 40] [-api http://...] [-ws ws://...]")
		os.Exit(1)
	}

	log.Printf("joining session %s with %d players", *sessionCode, *numPlayers)

	// ── Join players via HTTP ──────────────────────────────────────
	type player struct {
		ID   string
		Name string
	}
	players := make([]player, *numPlayers)
	for i := 0; i < *numPlayers; i++ {
		name := fmt.Sprintf("Bot %d", i+1)
		body, _ := json.Marshal(map[string]string{"code": *sessionCode, "name": name})
		resp, err := http.Post(*apiBase+"/api/v1/sessions/join", "application/json", bytes.NewReader(body))
		if err != nil {
			log.Fatalf("join %s: %v", name, err)
		}
		raw, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			log.Fatalf("join %s: %d %s", name, resp.StatusCode, raw)
		}
		var result map[string]string
		json.Unmarshal(raw, &result)
		players[i] = player{ID: result["player_id"], Name: name}
		log.Printf("  joined: %s (id=%s)", name, result["player_id"])
	}
	log.Printf("all %d players joined. start the game from the host UI, then they will auto-answer.", *numPlayers)

	// ── Connect WebSockets ─────────────────────────────────────────
	var wg sync.WaitGroup
	for i, p := range players {
		wg.Add(1)
		go func(idx int, p player) {
			defer wg.Done()
			wsURL := fmt.Sprintf("%s/api/v1/ws/player/%s?player_id=%s&name=%s",
				*wsBase, *sessionCode, p.ID, url.QueryEscape(p.Name))

			header := http.Header{}
			header.Set("Origin", *apiBase)
			conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
			if err != nil {
				log.Printf("[%s] dial error: %v", p.Name, err)
				return
			}
			defer conn.Close()

			for {
				_, raw, err := conn.ReadMessage()
				if err != nil {
					log.Printf("[%s] read error (disconnected): %v", p.Name, err)
					return
				}
				for _, line := range bytes.Split(raw, []byte("\n")) {
					line = bytes.TrimSpace(line)
					if len(line) == 0 {
						continue
					}
					var msg wsMsg
					if json.Unmarshal(line, &msg) != nil {
						continue
					}

					switch msg.Type {
					case "question":
						// Parse and auto-answer after random delay
						var qPayload struct {
							Question struct {
								ID      string `json:"id"`
								Text    string `json:"text"`
								Options []struct {
									ID   string `json:"id"`
									Text string `json:"text"`
								} `json:"options"`
							} `json:"question"`
						}
						json.Unmarshal(msg.Payload, &qPayload)
						log.Printf("[%s] got question: %s", p.Name, qPayload.Question.Text)

						// Random delay 1-5s, pick random option
						delay := time.Duration(1000+rand.Intn(4000)) * time.Millisecond
						time.Sleep(delay)

						optIdx := rand.Intn(len(qPayload.Question.Options))
						answer, _ := json.Marshal(map[string]any{
							"type": "answer_submitted",
							"payload": map[string]string{
								"question_id": qPayload.Question.ID,
								"option_id":   qPayload.Question.Options[optIdx].ID,
							},
						})
						conn.WriteMessage(websocket.TextMessage, answer)
						log.Printf("[%s] answered option %d after %v", p.Name, optIdx+1, delay)

					case "podium":
						log.Printf("[%s] game over — podium received", p.Name)
						return

					case "ping":
						pong, _ := json.Marshal(map[string]any{"type": "ping", "payload": "pong"})
						conn.WriteMessage(websocket.TextMessage, pong)
					}
				}
			}
		}(i, p)
	}

	wg.Wait()
	log.Println("all players disconnected. simulation complete.")
}
```

**Step 2: Verify it builds**

Run: `cd backend && go build -o /dev/null ./cmd/simulate/`
Expected: exit 0

**Step 3: Commit**

```bash
git add backend/cmd/simulate/main.go
git commit -m "feat: add standalone 40-player visual simulation script"
```

---

### Task 7: Add simulation run instructions to docs

**Files:**
- Modify: `docs/plans/2026-03-03-40-player-simulation-design.md`

**Step 1: Add usage instructions**

Append to the design doc:

```markdown
## Running

### Integration test (CI / headless)

```bash
# Requires Docker services running (postgres on 5434, redis on 6380)
docker compose up -d postgres redis
cd backend && go test -tags integration -run TestSimulation40Players -count=1 -timeout 180s -v ./internal/handlers/
```

### Visual simulation (watch in browser)

```bash
# 1. Start full dev environment
docker compose up --build

# 2. Log in as admin at http://localhost:5173, create a quiz, start a session
#    Note the 6-digit session code

# 3. In another terminal, run the simulation
cd backend && go run ./cmd/simulate/ -code <SESSION_CODE> -players 40

# 4. Watch 40 bots join and play in real time from the host screen
```
```

**Step 2: Commit**

```bash
git add docs/plans/2026-03-03-40-player-simulation-design.md
git commit -m "docs: add simulation run instructions"
```

---

### Task 8: Final verification

**Step 1: Run the integration test end-to-end**

Run: `cd backend && go test -tags integration -run TestSimulation40Players -count=1 -timeout 180s -race -v ./internal/handlers/`

Expected: PASS with no race conditions detected. All assertions pass.

**Step 2: Run check script**

Run: `./scripts/check.sh`

Expected: All checks pass (the simulation test won't run in normal `go test` since it requires the `integration` build tag).
