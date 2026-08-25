import { describe, expect, it, vi } from "vitest";
import { signInWithPhoneOtp, signOut, verifyPhoneOtp } from "./auth";
import type { TekoClient } from "./client";

function authClient(methods: Record<string, unknown>): TekoClient {
  return { auth: methods } as unknown as TekoClient;
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
});
