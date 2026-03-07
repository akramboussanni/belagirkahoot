package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	appMiddleware "github.com/HassanA01/Hilal/backend/internal/middleware"
	"github.com/HassanA01/Hilal/backend/internal/models"
)

func (h *Handler) ListQuizzes(w http.ResponseWriter, r *http.Request) {
	hostID := appMiddleware.GetHostID(r.Context())
	rows, err := h.db.Query(r.Context(),
		`SELECT id, host_id, title, created_at FROM quizzes WHERE host_id = $1 ORDER BY created_at DESC`,
		hostID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list quizzes")
		return
	}
	defer rows.Close()

	var quizzes []models.Quiz
	for rows.Next() {
		var q models.Quiz
		if err := rows.Scan(&q.ID, &q.HostID, &q.Title, &q.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan quiz")
			return
		}
		quizzes = append(quizzes, q)
	}
	if quizzes == nil {
		quizzes = []models.Quiz{}
	}
	writeJSON(w, http.StatusOK, quizzes)
}

type createQuizRequest struct {
	Title     string              `json:"title"`
	Questions []questionInputItem `json:"questions"`
}

type questionInputItem struct {
	Text                 string            `json:"text"`
	TimeLimit            int               `json:"time_limit"`
	Order                int               `json:"order"`
	RandomizeOptions     bool              `json:"randomize_options"`
	AllowMultipleAnswers bool              `json:"allow_multiple_answers"`
	Options              []optionInputItem `json:"options"`
}

type optionInputItem struct {
	Text      string `json:"text"`
	IsCorrect bool   `json:"is_correct"`
}

func (h *Handler) CreateQuiz(w http.ResponseWriter, r *http.Request) {
	hostID := appMiddleware.GetHostID(r.Context())

	var req createQuizRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	quizID := uuid.New()
	hostUUID, err := uuid.Parse(hostID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid host id")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to start transaction")
		return
	}
	defer func() { _ = tx.Rollback(r.Context()) }()

	_, err = tx.Exec(r.Context(),
		`INSERT INTO quizzes (id, host_id, title) VALUES ($1, $2, $3)`,
		quizID, hostUUID, req.Title,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create quiz")
		return
	}

	for _, qi := range req.Questions {
		qID := uuid.New()
		_, err = tx.Exec(r.Context(),
			`INSERT INTO questions (id, quiz_id, text, time_limit, "order", randomize_options, allow_multiple_answers) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			qID, quizID, qi.Text, qi.TimeLimit, qi.Order, qi.RandomizeOptions, qi.AllowMultipleAnswers,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create question")
			return
		}
		for _, oi := range qi.Options {
			_, err = tx.Exec(r.Context(),
				`INSERT INTO options (id, question_id, text, is_correct) VALUES ($1, $2, $3, $4)`,
				uuid.New(), qID, oi.Text, oi.IsCorrect,
			)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to create option")
				return
			}
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit transaction")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": quizID.String(), "title": req.Title})
}

func (h *Handler) GetQuiz(w http.ResponseWriter, r *http.Request) {
	quizID := chi.URLParam(r, "quizID")
	hostID := appMiddleware.GetHostID(r.Context())

	var quiz models.Quiz
	err := h.db.QueryRow(r.Context(),
		`SELECT id, host_id, title, created_at FROM quizzes WHERE id = $1 AND host_id = $2`, quizID, hostID,
	).Scan(&quiz.ID, &quiz.HostID, &quiz.Title, &quiz.CreatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "quiz not found")
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT id, quiz_id, text, time_limit, "order", randomize_options, allow_multiple_answers FROM questions WHERE quiz_id = $1 ORDER BY "order"`, quizID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load questions")
		return
	}
	defer rows.Close()

	for rows.Next() {
		var q models.Question
		if err := rows.Scan(&q.ID, &q.QuizID, &q.Text, &q.TimeLimit, &q.Order, &q.RandomizeOptions, &q.AllowMultipleAnswers); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan question")
			return
		}
		optRows, err := h.db.Query(r.Context(),
			`SELECT id, question_id, text, is_correct FROM options WHERE question_id = $1`, q.ID,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load options")
			return
		}
		for optRows.Next() {
			var o models.Option
			if err := optRows.Scan(&o.ID, &o.QuestionID, &o.Text, &o.IsCorrect); err != nil {
				optRows.Close()
				writeError(w, http.StatusInternalServerError, "failed to scan option")
				return
			}
			q.Options = append(q.Options, o)
		}
		optRows.Close()
		if err := optRows.Err(); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to read options")
			return
		}
		quiz.Questions = append(quiz.Questions, q)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read questions")
		return
	}

	writeJSON(w, http.StatusOK, quiz)
}

func (h *Handler) UpdateQuiz(w http.ResponseWriter, r *http.Request) {
	quizID := chi.URLParam(r, "quizID")
	hostID := appMiddleware.GetHostID(r.Context())

	var req createQuizRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to start transaction")
		return
	}
	defer func() { _ = tx.Rollback(r.Context()) }()

	// Verify ownership and update title atomically
	result, err := tx.Exec(r.Context(),
		`UPDATE quizzes SET title = $1 WHERE id = $2 AND host_id = $3`,
		req.Title, quizID, hostID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update quiz")
		return
	}
	if result.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "quiz not found")
		return
	}

	// Replace all questions and options (delete cascade handles options)
	if _, err = tx.Exec(r.Context(), `DELETE FROM questions WHERE quiz_id = $1`, quizID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update questions")
		return
	}

	for _, qi := range req.Questions {
		qID := uuid.New()
		if _, err = tx.Exec(r.Context(),
			`INSERT INTO questions (id, quiz_id, text, time_limit, "order", randomize_options, allow_multiple_answers) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			qID, quizID, qi.Text, qi.TimeLimit, qi.Order, qi.RandomizeOptions, qi.AllowMultipleAnswers,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update question")
			return
		}
		for _, oi := range qi.Options {
			if _, err = tx.Exec(r.Context(),
				`INSERT INTO options (id, question_id, text, is_correct) VALUES ($1, $2, $3, $4)`,
				uuid.New(), qID, oi.Text, oi.IsCorrect,
			); err != nil {
				writeError(w, http.StatusInternalServerError, "failed to update option")
				return
			}
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit transaction")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"id": quizID, "title": req.Title})
}

func (h *Handler) DeleteQuiz(w http.ResponseWriter, r *http.Request) {
	quizID := chi.URLParam(r, "quizID")
	hostID := appMiddleware.GetHostID(r.Context())
	result, err := h.db.Exec(r.Context(),
		`DELETE FROM quizzes WHERE id = $1 AND host_id = $2`, quizID, hostID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete quiz")
		return
	}
	if result.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "quiz not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
