export function getClientIp(headersLike: Pick<Headers, "get">): string {
  const forwardedFor = headersLike.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")
      .map((value) => value.trim())
      .find((value) => value.length > 0);

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = headersLike.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  return "127.0.0.1";
}
