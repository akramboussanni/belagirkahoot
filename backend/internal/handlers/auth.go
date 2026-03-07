package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"

	"fmt"
	"math/rand"

	"github.com/HassanA01/Hilal/backend/internal/models"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

const minPasswordLength = 8

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string      `json:"token"`
	Host  models.Host `json:"host"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	if !emailRegex.MatchString(req.Email) {
		writeError(w, http.StatusBadRequest, "invalid email address")
		return
	}
	if len(req.Password) < minPasswordLength {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	verToken := generateRandomString(32)

	host := models.Host{
		ID:                uuid.New(),
		Email:             req.Email,
		PasswordHash:      string(hash),
		IsVerified:        false,
		VerificationToken: &verToken,
		CreatedAt:         time.Now(),
	}

	_, err = h.db.Exec(r.Context(),
		`INSERT INTO hosts (id, email, password_hash, is_verified, verification_token, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
		host.ID, host.Email, host.PasswordHash, host.IsVerified, host.VerificationToken, host.CreatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeError(w, http.StatusConflict, "email already registered")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to create host")
		}
		return
	}

	// Send welcome email asynchronously
	go func() {
		subject := fmt.Sprintf("Welcome to %s - Verify your email", h.config.AppName)
		data := struct {
			AppName         string
			VerificationURL string
			Year            int
		}{
			AppName:         h.config.AppName,
			VerificationURL: fmt.Sprintf("%s/verify-email?token=%s", h.config.FrontendURL, verToken),
			Year:            time.Now().Year(),
		}
		_ = h.mailer.SendTemplateEmail([]string{host.Email}, subject, "welcome.html", data)
	}()

	writeJSON(w, http.StatusCreated, map[string]string{
		"message": "Compte créé avec succès. Veuillez vérifier votre boîte mail (et le dossier spam) pour activer votre compte.",
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	var host models.Host
	err := h.db.QueryRow(r.Context(),
		`SELECT id, email, password_hash, is_verified, created_at FROM hosts WHERE email = $1`, req.Email,
	).Scan(&host.ID, &host.Email, &host.PasswordHash, &host.IsVerified, &host.CreatedAt)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if !host.IsVerified {
		writeError(w, http.StatusForbidden, "Please verify your email address before logging in")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(host.PasswordHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := h.generateToken(host.ID.String())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, authResponse{Token: token, Host: host})
}

func (h *Handler) generateToken(hostID string) (string, error) {
	claims := jwt.MapClaims{
		"sub": hostID,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.config.JWTSecret))
}

const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func generateRandomString(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = letterBytes[rand.Intn(len(letterBytes))]
	}
	return string(b)
}
