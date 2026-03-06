import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuthStore } from "../stores/authStore";
import type { Host } from "../types";

const mockHost: Host = {
  id: "abc-123",
  email: "host@test.com",
  created_at: new Date().toISOString(),
};

function renderWithRouter(isAuthed: boolean) {
  if (isAuthed) {
    useAuthStore.getState().setAuth("tok123", mockHost);
  } else {
    useAuthStore.getState().clearAuth();
  }

  return render(
    <MemoryRouter initialEntries={["/host"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/host"
          element={
            <ProtectedRoute>
              <div>Host Dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.getState().clearAuth();
});

describe("ProtectedRoute", () => {
  it("renders children when authenticated", () => {
    renderWithRouter(true);
    expect(screen.getByText("Host Dashboard")).toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", () => {
    renderWithRouter(false);
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Host Dashboard")).not.toBeInTheDocument();
  });
});
