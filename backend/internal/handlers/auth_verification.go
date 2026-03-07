package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type verifyEmailRequest struct {
	Token string `json:"token"`
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

type resetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req verifyEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Token == "" {
		writeError(w, http.StatusBadRequest, "token is required")
		return
	}

	res, err := h.db.Exec(r.Context(),
		`UPDATE hosts SET is_verified = true, verification_token = NULL WHERE verification_token = $1`,
		req.Token,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to verify email")
		return
	}

	if res.RowsAffected() == 0 {
		writeError(w, http.StatusBadRequest, "invalid or expired token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "email verified successfully"})
}

func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}

	resetToken := generateRandomString(32)
	expiresAt := time.Now().Add(1 * time.Hour)

	res, err := h.db.Exec(r.Context(),
		`UPDATE hosts SET reset_token = $1, reset_token_expires_at = $2 WHERE email = $3`,
		resetToken, expiresAt, req.Email,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to initiate password reset")
		return
	}

	// Always return OK to prevent email enumeration
	if res.RowsAffected() > 0 {
		go func() {
			subject := fmt.Sprintf("Réinitialisez votre mot de passe - %s", h.config.AppName)
			data := struct {
				AppName  string
				ResetURL string
				Year     int
			}{
				AppName:  h.config.AppName,
				ResetURL: fmt.Sprintf("%s/reset-password?token=%s", h.config.FrontendURL, resetToken),
				Year:     time.Now().Year(),
			}

			_ = h.mailer.SendTemplateEmail([]string{req.Email}, subject, "forgot_password.html", data)
		}()
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Si un compte est associé à cette adresse, un lien de réinitialisation vous a été envoyé. Veuillez vérifier vos spams si vous ne le trouvez pas."})
}

func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Token == "" || req.NewPassword == "" {
		writeError(w, http.StatusBadRequest, "token and new password are required")
		return
	}
	if len(req.NewPassword) < minPasswordLength {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	res, err := h.db.Exec(r.Context(),
		`UPDATE hosts SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE reset_token = $2 AND reset_token_expires_at > $3`,
		string(hash), req.Token, time.Now(),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reset password")
		return
	}

	if res.RowsAffected() == 0 {
		writeError(w, http.StatusBadRequest, "invalid or expired reset token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "password reset successfully"})
}
