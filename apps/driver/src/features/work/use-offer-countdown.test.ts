// Grâce anti tap-through du compte à rebours D-10 (doc 10 §8, Q1) : à
// l'échéance le modal reste monté actions désarmées, onExpire ne part
// qu'après OFFER_EXPIRE_GRACE_MS, et jamais tant qu'un accept est en vol.

import { act, renderHook } from "@testing-library/react-native";
import { OFFER_EXPIRE_GRACE_MS, useOfferCountdown } from "./use-offer-countdown";

const NOW = new Date("2026-09-01T12:00:00Z");

function inMs(ms: number): string {
  return new Date(NOW.getTime() + ms).toISOString();
}

describe("useOfferCountdown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("décompte les secondes puis désarme à l'échéance sans fermer", () => {
    const onExpire = jest.fn();
    const { result } = renderHook(() => useOfferCountdown(inMs(3000), false, onExpire));

    expect(result.current).toEqual({ seconds: 3, expired: false });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toEqual({ seconds: 2, expired: false });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current).toEqual({ seconds: 0, expired: true });
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("appelle onExpire une seule fois, après la fenêtre de grâce", () => {
    const onExpire = jest.fn();
    renderHook(() => useOfferCountdown(inMs(1000), false, onExpire));

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      jest.advanceTimersByTime(OFFER_EXPIRE_GRACE_MS - 1);
    });
    expect(onExpire).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("accept en vol (busy) : l'échéance ne ferme jamais, le serveur décide", () => {
    const onExpire = jest.fn();
    const { rerender } = renderHook(
      ({ busy }: { busy: boolean }) => useOfferCountdown(inMs(500), busy, onExpire),
      { initialProps: { busy: true } },
    );

    act(() => {
      jest.advanceTimersByTime(500 + OFFER_EXPIRE_GRACE_MS * 3);
    });
    expect(onExpire).not.toHaveBeenCalled();

    rerender({ busy: false });
    act(() => {
      jest.advanceTimersByTime(OFFER_EXPIRE_GRACE_MS);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("démontage pendant la grâce : onExpire ne part jamais", () => {
    const onExpire = jest.fn();
    const { unmount } = renderHook(() => useOfferCountdown(inMs(250), false, onExpire));

    act(() => {
      jest.advanceTimersByTime(250);
    });
    unmount();
    act(() => {
      jest.advanceTimersByTime(OFFER_EXPIRE_GRACE_MS * 2);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("offre déjà échue au montage : désarmée immédiatement, grâce quand même", () => {
    const onExpire = jest.fn();
    const { result } = renderHook(() => useOfferCountdown(inMs(-100), false, onExpire));

    expect(result.current.expired).toBe(true);
    expect(onExpire).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(OFFER_EXPIRE_GRACE_MS);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
