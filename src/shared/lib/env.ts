export const CLIENT_DOC_KEY = (() => {
  const b64 = process.env.CLIENT_DOC_ENCRYPTION_KEY_BASE64
  if (!b64) throw new Error("Missing CLIENT_DOC_ENCRYPTION_KEY_BASE64")
  const key = Buffer.from(b64, "base64")
  if (key.length !== 32) throw new Error("CLIENT_DOC_ENCRYPTION_KEY_BASE64 must decode to 32 bytes")
  return key
})()

// exporte 'key' conforme precisar