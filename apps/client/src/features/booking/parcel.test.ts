import { EMPTY_PARCEL, isRecipientPhoneValid, phoneDigits, toParcelInput } from "./parcel";

const VALID = {
  description: "  Documents scellés ",
  size: "medium" as const,
  recipientName: " Awa ",
  recipientPhone: "+241 77 12 34 56",
};

describe("colis (R5)", () => {
  it("normalise le colis valide : textes rognés, numéro en chiffres seuls", () => {
    expect(toParcelInput(VALID)).toEqual({
      description: "Documents scellés",
      size: "medium",
      recipientName: "Awa",
      recipientPhone: "24177123456",
    });
  });

  it("refuse un colis vide, une description ou un nom trop longs", () => {
    expect(toParcelInput(EMPTY_PARCEL)).toBeNull();
    expect(toParcelInput({ ...VALID, description: "x".repeat(201) })).toBeNull();
    expect(toParcelInput({ ...VALID, recipientName: "x".repeat(81) })).toBeNull();
    expect(toParcelInput({ ...VALID, description: "x".repeat(200) })).not.toBeNull();
  });

  it("exige un numéro de 8 à 15 chiffres", () => {
    expect(phoneDigits("077-12 34")).toBe("0771234");
    expect(isRecipientPhoneValid("12")).toBe(false);
    expect(isRecipientPhoneValid("07712345")).toBe(true);
    expect(isRecipientPhoneValid("1".repeat(16))).toBe(false);
    expect(toParcelInput({ ...VALID, recipientPhone: "12" })).toBeNull();
  });
});
