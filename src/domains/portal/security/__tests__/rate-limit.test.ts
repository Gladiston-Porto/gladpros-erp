import { __resetRateLimitStoreForTests, checkRateLimit } from "../rate-limit";

describe("portal rate limit", () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  it("permite até 10 requests e bloqueia a 11ª", () => {
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit("portal:ip:127.0.0.1", { limit: 10, windowMs: 60_000 });
      expect(result.allowed).toBe(true);
    }

    const blocked = checkRateLimit("portal:ip:127.0.0.1", { limit: 10, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
  });

  it("reseta após janela de tempo", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-22T00:00:00.000Z"));

    for (let i = 0; i < 10; i++) {
      checkRateLimit("portal:ip:10.0.0.1", { limit: 10, windowMs: 60_000 });
    }

    const blocked = checkRateLimit("portal:ip:10.0.0.1", { limit: 10, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);

    jest.setSystemTime(new Date("2026-02-22T00:01:01.000Z"));

    const allowedAgain = checkRateLimit("portal:ip:10.0.0.1", { limit: 10, windowMs: 60_000 });
    expect(allowedAgain.allowed).toBe(true);

    jest.useRealTimers();
  });
});
