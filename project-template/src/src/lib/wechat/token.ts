import { WECHAT_TOKEN_URL } from "@/constants";

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let tokenCache: TokenCache | null = null;

/**
 * 获取微信小店 access_token（带缓存，过期前 5 分钟刷新）
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // 缓存有效（提前5分钟刷新）
  if (tokenCache && tokenCache.expiresAt - now > 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  const appId = process.env.WECHAT_APP_ID!;
  const appSecret = process.env.WECHAT_APP_SECRET!;

  const url = `${WECHAT_TOKEN_URL}?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.errcode) {
    throw new Error(
      `获取 access_token 失败: ${data.errcode} - ${data.errmsg}`
    );
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}
