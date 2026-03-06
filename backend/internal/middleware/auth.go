package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const HostIDKey contextKey = "host_id"

func RequireAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			hostID, _ := claims["sub"].(string)
			ctx := context.WithValue(r.Context(), HostIDKey, hostID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetHostID(ctx context.Context) string {
	v, _ := ctx.Value(HostIDKey).(string)
	return v
}

// ContextWithHostID injects a host ID into a context. Used in tests.
func ContextWithHostID(ctx context.Context, hostID string) context.Context {
	return context.WithValue(ctx, HostIDKey, hostID)
}
