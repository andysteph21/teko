import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../../lib/supabase", () => ({ supabase: {} }));
vi.mock("@teko/api-client", () => ({
  signInWithPhoneOtp: vi.fn().mockResolvedValue(undefined),
  verifyPhoneOtp: vi.fn().mockResolvedValue({}),
  TekoApiError: class extends Error {
    code = "unknown";
  },
}));

import { signInWithPhoneOtp, verifyPhoneOtp } from "@teko/api-client";
import { LoginCard } from "./login-card";

describe("A-01 connexion", () => {
  it("numéro national normalisé en +241 puis passage au code", async () => {
    render(<LoginCard />);
    fireEvent.change(screen.getByTestId("login-phone"), { target: { value: "06 55 21 09" } });
    fireEvent.click(screen.getByTestId("login-submit"));
    await waitFor(() =>
      expect(signInWithPhoneOtp).toHaveBeenCalledWith(expect.anything(), "+24106552109"),
    );
    expect(screen.getByTestId("login-otp")).toBeDefined();
  });

  it("code à 6 chiffres vérifié puis cap sur le tableau de bord", async () => {
    render(<LoginCard />);
    fireEvent.change(screen.getByTestId("login-phone"), { target: { value: "07000003" } });
    fireEvent.click(screen.getByTestId("login-submit"));
    await screen.findByTestId("login-otp");
    fireEvent.change(screen.getByTestId("login-otp"), { target: { value: "123456" } });
    fireEvent.click(screen.getByTestId("login-submit"));
    await waitFor(() =>
      expect(verifyPhoneOtp).toHaveBeenCalledWith(expect.anything(), "+24107000003", "123456"),
    );
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("bouton inerte tant que le numéro est invalide", () => {
    render(<LoginCard />);
    fireEvent.change(screen.getByTestId("login-phone"), { target: { value: "12" } });
    expect((screen.getByTestId("login-submit") as HTMLButtonElement).disabled).toBe(true);
  });
});
