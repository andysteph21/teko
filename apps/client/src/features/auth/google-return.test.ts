import { googleReturnPath, googleReturnUrl } from "./google-return";

describe("retour de la connexion Google", () => {
  it("réécrit le lien de retour vers l'écran d'échange, avec ou sans schéma", () => {
    expect(googleReturnPath("teko-client-alpha://auth?code=abc")).toBe(
      "/(auth)/google-return?code=abc",
    );
    expect(googleReturnPath("auth?error=access_denied#x")).toBe(
      "/(auth)/google-return?error=access_denied",
    );
    expect(googleReturnPath("/auth/?code=abc")).toBe("/(auth)/google-return?code=abc");
  });

  it("laisse passer tout autre lien", () => {
    expect(googleReturnPath("/(main)/home")).toBeNull();
    expect(googleReturnPath("teko-client://auth")).toBeNull();
    expect(googleReturnPath("auth?autre=1")).toBeNull();
    expect(googleReturnPath("oauth?code=abc")).toBeNull();
  });

  it("reconstruit le lien d'échange avec les seuls paramètres attendus", () => {
    expect(googleReturnUrl({ code: "abc", intrus: "x" })).toBe("app://auth?code=abc");
    expect(googleReturnUrl({ error: "access_denied", code: ["a", "b"] })).toBe(
      "app://auth?error=access_denied",
    );
  });
});
