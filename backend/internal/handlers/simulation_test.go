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
	"net/url"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/HassanA01/Hilal/backend/internal/config"
	"github.com/HassanA01/Hilal/backend/internal/db"
	"github.com/HassanA01/Hilal/backend/internal/hub"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// wsRawMessage keeps the raw payload for flexible parsing.
type wsRawMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// setupIntegration connects to test DB + Redis, runs migrations, and returns
// a live httptest.Server with all routes registered.
func setupIntegration(t *testing.T) (srv *httptest.Server, pool *pgxpool.Pool, rc *redis.Client, cleanup func()) {
	t.Helper()
	ctx := context.Background()

	dbURL := envOr("TEST_DATABASE_URL", "postgres://iftaroot:changeme@localhost:5434/iftaroot?sslmode=disable")
	redisURL := envOr("TEST_REDIS_URL", "redis://localhost:6380")

	pool, err := db.Connect(dbURL)
	if err != nil {
		t.Fatalf("db connect: %v", err)
	}
	// Migrations are applied by the running docker-compose backend on startup.
	// If running standalone, set TEST_SKIP_MIGRATE=false and run from backend/.
	if envOr("TEST_SKIP_MIGRATE", "true") != "true" {
		if err := db.Migrate(dbURL); err != nil {
			t.Fatalf("migrate: %v", err)
		}
	}

	rc, err = db.ConnectRedis(redisURL)
	if err != nil {
		t.Fatalf("redis connect: %v", err)
	}

	cfg := &config.Config{
		Port:        "0",
		DatabaseURL: dbURL,
		RedisURL:    redisURL,
		JWTSecret:   "test-secret-that-is-long-enough-for-integration",
		FrontendURL: "http://placeholder",
	}

	// Clean up any data from previous test runs.
	tables := []string{"game_answers", "game_players", "game_sessions", "options", "questions", "quizzes", "hosts"}
	for _, tbl := range tables {
		_, _ = pool.Exec(ctx, fmt.Sprintf("TRUNCATE %s CASCADE", tbl))
	}
	_ = rc.FlushDB(ctx).Err()

	gameHub := hub.New(rc)
	go gameHub.Run()

	// Use NewUnstartedServer so we can set FrontendURL to the server's
	// actual address before starting — avoids re-creating the handler.
	srv = httptest.NewUnstartedServer(nil)
	cfg.FrontendURL = "http://" + srv.Listener.Addr().String()
	h := New(pool, rc, gameHub, cfg)
	r := chi.NewRouter()
	r.Use(chimw.Recoverer)
	h.RegisterRoutes(r)
	srv.Config.Handler = r
	srv.Start()

	cleanup = func() {
		srv.Close()
		tables := []string{"game_answers", "game_players", "game_sessions", "options", "questions", "quizzes", "hosts"}
		for _, tbl := range tables {
			_, _ = pool.Exec(ctx, fmt.Sprintf("TRUNCATE %s CASCADE", tbl))
		}
		_ = rc.FlushDB(ctx).Err()
		pool.Close()
		rc.Close()
	}

	return srv, pool, rc, cleanup
}

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

func seedQuiz(t *testing.T, srv *httptest.Server) (token string, quizID string) {
	t.Helper()

	status, body := apiPost(t, srv, "/api/v1/auth/register", map[string]string{
		"email":    "sim@test.com",
		"password": "password123",
	}, "")
	if status != http.StatusCreated {
		t.Fatalf("register: %d %v", status, body)
	}
	token, _ = body["token"].(string)

	questions := make([]map[string]any, 5)
	for i := 0; i < 5; i++ {
		questions[i] = map[string]any{
			"text":       fmt.Sprintf("Q%d: What is %d+%d?", i+1, i+1, i+1),
			"time_limit": 20,
			"options": []map[string]any{
				{"text": fmt.Sprintf("%d", (i+1)*2), "is_correct": true},
				{"text": fmt.Sprintf("%d", (i+1)*2+1), "is_correct": false},
				{"text": fmt.Sprintf("%d", (i+1)*2+2), "is_correct": false},
				{"text": fmt.Sprintf("%d", (i+1)*2+3), "is_correct": false},
			},
		}
	}

	status, body = apiPost(t, srv, "/api/v1/quizzes", map[string]any{
		"title":     "Simulation Quiz",
		"questions": questions,
	}, token)
	if status != http.StatusCreated {
		t.Fatalf("create quiz: %d %v", status, body)
	}
	quizID, _ = body["id"].(string)
	return token, quizID
}

func dialWS(t *testing.T, srv *httptest.Server, path string) *websocket.Conn {
	t.Helper()
	u, _ := url.Parse(srv.URL)
	u.Scheme = "ws"

	// Parse path and query separately so the query string isn't URL-encoded into the path.
	parsed, _ := url.Parse(path)
	u.Path = parsed.Path
	u.RawQuery = parsed.RawQuery

	header := http.Header{}
	header.Set("Origin", "http://"+u.Host)

	conn, resp, err := websocket.DefaultDialer.Dial(u.String(), header)
	if err != nil {
		respBody := ""
		if resp != nil {
			raw, _ := io.ReadAll(resp.Body)
			respBody = string(raw)
		}
		t.Fatalf("dial %s: %v %s", path, err, respBody)
	}
	return conn
}

func readMessages(conn *websocket.Conn, out *[]wsRawMessage, mu *sync.Mutex, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return
		}
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

// waitForMessage polls a player's message buffer until a message of the given
// type is found or the deadline expires.
func waitForMessage(msgs *[]wsRawMessage, mu *sync.Mutex, msgType string, timeout time.Duration) *wsRawMessage {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		mu.Lock()
		for i := len(*msgs) - 1; i >= 0; i-- {
			if (*msgs)[i].Type == msgType {
				m := (*msgs)[i]
				mu.Unlock()
				return &m
			}
		}
		mu.Unlock()
		time.Sleep(100 * time.Millisecond)
	}
	return nil
}

func countMessages(msgs *[]wsRawMessage, mu *sync.Mutex, msgType string) int {
	mu.Lock()
	defer mu.Unlock()
	n := 0
	for _, m := range *msgs {
		if m.Type == msgType {
			n++
		}
	}
	return n
}

func TestSimulation40Players(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	const numPlayers = 40

	srv, pool, _, cleanup := setupIntegration(t)
	defer cleanup()

	// ── Seed quiz and create session ───────────────────────────────
	token, quizID := seedQuiz(t, srv)

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
		s, b := apiPost(t, srv, "/api/v1/sessions/join", map[string]string{
			"code": sessionCode,
			"name": name,
		}, "")
		if s != http.StatusOK {
			t.Fatalf("join player %d: %d %v", i+1, s, b)
		}
		id, _ := b["player_id"].(string)
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
		c := dialWS(t, srv, path)
		defer c.Close()
		msgs := &[]wsRawMessage{}
		mu := &sync.Mutex{}
		pConns[i] = playerConn{conn: c, msgs: msgs, mu: mu}
		wg.Add(1)
		go readMessages(c, msgs, mu, &wg)
	}
	t.Logf("all %d player WebSockets connected", numPlayers)

	time.Sleep(500 * time.Millisecond)

	// ── Start game ─────────────────────────────────────────────────
	status, _ = apiPost(t, srv, "/api/v1/sessions/"+sessionID+"/start", nil, token)
	if status != http.StatusOK {
		t.Fatalf("start session: %d", status)
	}
	t.Log("game started")

	// Wait for game_started + first question (3s engine delay + buffer)
	time.Sleep(5 * time.Second)

	// ── Game loop: 5 questions ─────────────────────────────────────
	for q := 0; q < 5; q++ {
		t.Logf("── question %d ──", q+1)

		// Wait for player 0 to receive a question message for this round
		questionMsg := waitForMessage(pConns[0].msgs, pConns[0].mu, "question", 15*time.Second)
		if questionMsg == nil {
			// Debug: dump what messages player 0 DID receive
			pConns[0].mu.Lock()
			types := make([]string, len(*pConns[0].msgs))
			for i, m := range *pConns[0].msgs {
				types[i] = m.Type
			}
			pConns[0].mu.Unlock()
			t.Fatalf("Q%d: player 0 never received question message (received %d messages: %v)", q+1, len(types), types)
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

		// Look up the correct option from the DB (options order by UUID may differ from creation order).
		var correctOptionID string
		err := pool.QueryRow(context.Background(),
			"SELECT id FROM options WHERE question_id = $1 AND is_correct = true",
			qPayload.Question.ID).Scan(&correctOptionID)
		if err != nil {
			t.Fatalf("Q%d: lookup correct option: %v", q+1, err)
		}
		// Pick any wrong option.
		wrongOptionID := ""
		for _, opt := range qPayload.Question.Options {
			if opt.ID != correctOptionID {
				wrongOptionID = opt.ID
				break
			}
		}

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
			// Stagger correct answers to test timing-based scoring
			if i < 25 {
				time.Sleep(20 * time.Millisecond)
			}
		}
		t.Logf("  all %d answers submitted", numPlayers)

		// Wait for answer_reveal + leaderboard (3s reveal + 3s leaderboard + buffer)
		time.Sleep(8 * time.Second)

		revealCount := countMessages(pConns[0].msgs, pConns[0].mu, "answer_reveal")
		if revealCount < q+1 {
			t.Fatalf("Q%d: expected %d answer_reveal messages, got %d", q+1, q+1, revealCount)
		}

		// Host sends next_question to advance. After the last question, this
		// triggers game_over → podium.
		nextMsg, _ := json.Marshal(map[string]any{
			"type":    "next_question",
			"payload": map[string]any{},
		})
		if err := hostConn.WriteMessage(websocket.TextMessage, nextMsg); err != nil {
			t.Fatalf("Q%d: host write next_question: %v", q+1, err)
		}
		time.Sleep(2 * time.Second)
	}

	// Wait for podium
	time.Sleep(5 * time.Second)

	// ── Close all connections ──────────────────────────────────────
	closeMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "")
	hostConn.WriteMessage(websocket.CloseMessage, closeMsg)
	for _, pc := range pConns {
		pc.conn.WriteMessage(websocket.CloseMessage, closeMsg)
	}
	time.Sleep(500 * time.Millisecond)

	// ── ASSERTIONS ─────────────────────────────────────────────────

	// 1. Host received podium and all leaderboards
	hostGotPodium := countMessages(&hostMsgs, &hostMu, "podium") > 0
	hostLeaderboardCount := countMessages(&hostMsgs, &hostMu, "leaderboard")

	if !hostGotPodium {
		t.Error("host never received podium message")
	}
	if hostLeaderboardCount < 5 {
		t.Errorf("host received %d leaderboard messages, expected 5", hostLeaderboardCount)
	}

	// 2. All players received podium, 5 questions, 5 reveals
	for i, pc := range pConns {
		gotPodium := countMessages(pc.msgs, pc.mu, "podium") > 0
		questionCount := countMessages(pc.msgs, pc.mu, "question")
		revealCount := countMessages(pc.msgs, pc.mu, "answer_reveal")

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

	// 3. DB: game_answers should have 200 rows (40 × 5)
	var answerCount int
	err := pool.QueryRow(context.Background(),
		"SELECT COUNT(*) FROM game_answers WHERE session_id = $1", sessionID).Scan(&answerCount)
	if err != nil {
		t.Fatalf("count answers: %v", err)
	}
	if answerCount != numPlayers*5 {
		t.Errorf("expected %d game_answers rows, got %d", numPlayers*5, answerCount)
	}

	// 4. Correct players (0-24) have positive scores, wrong players (25-39) have 0
	for i, p := range players {
		var score int
		err := pool.QueryRow(context.Background(),
			"SELECT score FROM game_players WHERE id = $1", p.ID).Scan(&score)
		if err != nil {
			t.Fatalf("get score for player %d: %v", i, err)
		}
		if i < 25 && score <= 0 {
			t.Errorf("player %d (correct): expected positive score, got %d", i, score)
		}
		if i >= 25 && score != 0 {
			t.Errorf("player %d (wrong): expected 0 score, got %d", i, score)
		}
	}

	// 5. Session is finished
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
}
