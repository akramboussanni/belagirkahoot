package handlers

import "net/http"

func (h *Handler) GenerateQuiz(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented")
}
