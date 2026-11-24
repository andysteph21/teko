import { describe, expect, it, vi } from "vitest";
import {
  signInWithEmailOtp,
  signInWithPhoneOtp,
  signOut,
  verifyEmailOtp,
  verifyPhoneOtp,
} from "./auth";
import type { TekoClient } from "./client";

function authClient(methods: Record<string, unknown>): TekoClient {
  return {
    auth: methods,
    rpc: vi.fn().mockResolvedValue({ error: null }),
  } as unknown as TekoClient;
}

describe("auth téléphone (OTP SMS)", () => {
  it("signInWithPhoneOtp envoie le numéro E.164", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    await signInWithPhoneOtp(authClient({ signInWithOtp }), "+24107000001");
    expect(signInWithOtp).toHaveBeenCalledWith({ phone: "+24107000001" });
  });

  it("verifyPhoneOtp renvoie la session, type sms", async () => {
    const session = { access_token: "jwt" };
    const verifyOtp = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const result = await verifyPhoneOtp(authClient({ verifyOtp }), "+24107000001", "123456");
    expect(result).toBe(session);
    expect(verifyOtp).toHaveBeenCalledWith({ phone: "+24107000001", token: "123456", type: "sms" });
  });

  it("verifyPhoneOtp : erreur backend et session absente → TekoApiError", async () => {
    const bad = authClient({
      verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: { message: "Token has expired" } }),
    });
    await expect(verifyPhoneOtp(bad, "+241", "000000")).rejects.toMatchObject({ code: "unknown" });

    const noSession = authClient({
      verifyOtp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    });
    await expect(verifyPhoneOtp(noSession, "+241", "123456")).rejects.toMatchObject({
      code: "unknown",
    });
  });

  it("signOut propage les erreurs mappées", async () => {
    const ok = authClient({ signOut: vi.fn().mockResolvedValue({ error: null }) });
    await expect(signOut(ok)).resolves.toBeUndefined();

    const ko = authClient({
      signOut: vi.fn().mockResolvedValue({ error: { message: "Network request failed" } }),
    });
    await expect(signOut(ko)).rejects.toMatchObject({ code: "network" });
  });

  it("signOut conserve la session si le retrait des jetons n'est pas confirmé", async () => {
    const exit = vi.fn();
    const client = authClient({ signOut: exit });
    client.rpc = vi.fn().mockResolvedValue({ error: { message: "Network request failed" } });
    await expect(signOut(client)).rejects.toMatchObject({ code: "network" });
    expect(exit).not.toHaveBeenCalled();
  });
});

describe("auth e-mail (code à 6 chiffres)", () => {
  it("signInWithEmailOtp normalise l'adresse et autorise la création du compte", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    await signInWithEmailOtp(authClient({ signInWithOtp }), "  Invitee@Example.COM ");
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "invitee@example.com",
      options: { shouldCreateUser: true },
    });
  });

  it("verifyEmailOtp renvoie la session, type email", async () => {
    const session = { access_token: "jwt" };
    const verifyOtp = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const result = await verifyEmailOtp(authClient({ verifyOtp }), "Invitee@Example.com", "123456");
    expect(result).toBe(session);
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "invitee@example.com",
      token: "123456",
      type: "email",
    });
  });

  it("verifyEmailOtp : code refusé ou session absente → TekoApiError", async () => {
    const bad = authClient({
      verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: { message: "Token has expired" } }),
    });
    await expect(verifyEmailOtp(bad, "a@b.co", "000000")).rejects.toMatchObject({
      code: "unknown",
    });
    const noSession = authClient({
      verifyOtp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    });
    await expect(verifyEmailOtp(noSession, "a@b.co", "123456")).rejects.toMatchObject({
      code: "unknown",
    });
  });
});

describe("connexion Google par navigateur", () => {
  it("demande l'adresse sans ouvrir de navigateur et la retourne", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: { url: "https://g" }, error: null });
    const { googleSignInUrl } = await import("./auth");
    expect(await googleSignInUrl(authClient({ signInWithOAuth }), "teko-client-alpha://auth")).toBe(
      "https://g",
    );
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "teko-client-alpha://auth", skipBrowserRedirect: true },
    });
    signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
    await expect(googleSignInUrl(authClient({ signInWithOAuth }), "x://auth")).rejects.toThrow();
    signInWithOAuth.mockResolvedValue({ data: {}, error: { message: "fermé" } });
    await expect(googleSignInUrl(authClient({ signInWithOAuth }), "x://auth")).rejects.toThrow();
  });

  it("le retour échange le code, ignore un lien sans code et remonte un refus", async () => {
    const session = { access_token: "jwt" };
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const { completeOAuthSignIn } = await import("./auth");
    const client = authClient({ exchangeCodeForSession });
    expect(await completeOAuthSignIn(client, "teko-client-alpha://auth?code=abc#x")).toBe(session);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(await completeOAuthSignIn(client, "teko-client-alpha://auth")).toBeNull();
    await expect(
      completeOAuthSignIn(client, "teko-client-alpha://auth?error=access_denied&error_code=403"),
    ).rejects.toThrow();
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: { message: "code expiré" } });
    await expect(completeOAuthSignIn(client, "x://auth?code=old")).rejects.toThrow();
  });
});
