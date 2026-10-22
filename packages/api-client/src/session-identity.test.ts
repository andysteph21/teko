import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { TekoClient } from "./client";
import { getSessionIdentity } from "./session-identity";

function client(session: unknown, error: unknown = null): TekoClient {
  return {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session }, error }) },
  } as unknown as TekoClient;
}

describe("identité lors du renouvellement de session", () => {
  it.each([0, 503])("distingue la panne temporaire %s d'une déconnexion", async (status) => {
    await expect(
      getSessionIdentity(client(null, new AuthRetryableFetchError("Unavailable", status))),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("renvoie le propriétaire authentifié", async () => {
    await expect(getSessionIdentity(client({ user: { id: "driver" } }))).resolves.toEqual({
      status: "available",
      userId: "driver",
    });
  });

  it("reconnaît une session absente", async () => {
    await expect(getSessionIdentity(client(null))).resolves.toEqual({
      status: "available",
      userId: null,
    });
  });

  it("ne conserve pas une identité révoquée", async () => {
    const error = new AuthApiError("Refresh token revoked", 400, "refresh_token_not_found");
    await expect(getSessionIdentity(client({ user: { id: "driver" } }, error))).resolves.toEqual({
      status: "available",
      userId: null,
    });
  });
});
