import { generatePortalAccessToken, hashPortalAccessToken, isPortalAccessTokenFormatValid } from "../portal-token";

describe("portal-token helpers", () => {
  it("gera token base64url de 32 bytes", () => {
    const token = generatePortalAccessToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token).toHaveLength(43);
  });

  it("gera hash sha256 hex determinístico", () => {
    const token = "xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA";

    const first = hashPortalAccessToken(token);
    const second = hashPortalAccessToken(token);

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
  });

  it("valida formato base64url esperado", () => {
    expect(isPortalAccessTokenFormatValid("invalid token")).toBe(false);
    expect(isPortalAccessTokenFormatValid("abc")).toBe(false);
    expect(isPortalAccessTokenFormatValid("xYk93JdkPz9vA2kLmQn3WwLZb9qX6tRsM1uV2wXyZaA")).toBe(true);
  });
});
