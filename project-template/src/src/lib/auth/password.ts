/**
 * 简易密码哈希（使用 Web Crypto API，无需额外依赖）
 * 生产环境建议替换为 bcrypt
 */

async function hashWithSHA256(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID();
  const hash = await hashWithSHA256(password, salt);
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const computedHash = await hashWithSHA256(password, salt);
  return computedHash === hash;
}
