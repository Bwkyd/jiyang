import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  // 兼容旧的 SHA-256 格式 (salt:hash)，便于迁移
  if (storedHash.includes(":") && !storedHash.startsWith("$2")) {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computedHash === hash;
  }
  return bcrypt.compare(password, storedHash);
}
