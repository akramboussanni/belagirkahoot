import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../stores/authStore";
import type { Host } from "../types";

const mockHost: Host = {
  id: "abc-123",
  email: "host@test.com",
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  useAuthStore.getState().clearAuth();
});

describe("authStore", () => {
  it("starts unauthenticated", () => {
    const { token, host, isAuthenticated } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(host).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it("setAuth stores token and host", () => {
    useAuthStore.getState().setAuth("tok123", mockHost);
    const { token, host, isAuthenticated } = useAuthStore.getState();
    expect(token).toBe("tok123");
    expect(host).toEqual(mockHost);
    expect(isAuthenticated()).toBe(true);
  });

  it("clearAuth resets state", () => {
    useAuthStore.getState().setAuth("tok123", mockHost);
    useAuthStore.getState().clearAuth();
    const { token, host, isAuthenticated } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(host).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});
