import { encodeBase64Url, encodeHex } from "@std/encoding";
import { crypto } from "@std/crypto/";

export async function generateShortCode(longUrl: string) {
  try {
    new URL(longUrl);
  } catch (error) {
    console.error("Invalid URL:", error);
    throw new Error("Invalid URL");
  }

  const urlData = new TextEncoder().encode(longUrl + Date.now());
  const hash = await crypto.subtle.digest("SHA-256", urlData);
  const hashArray = new Uint8Array(hash);
  const hashHex = encodeHex(hashArray);

  // Take the first 8 characters of the hash for the short URL
  const shortCode = encodeBase64Url(hashHex.slice(0, 8));

  return shortCode;
}

const kv = await Deno.openKv();

export type ShortLink = {
  shortCode: string;
  longUrl: string;
  createdAt: number;
  userId: string;
  clickCount: number;
  lastClickEvent?: string;
};

export async function storeShortLink(
  longUrl: string,
  shortCode: string,
  userId: string
) {
  const shortLinkKey = ["shortlinks", shortCode];
  const data: ShortLink = {
    shortCode,
    longUrl,
    userId,
    createdAt: Date.now(),
    clickCount: 0,
  };

  const res = await kv.set(shortLinkKey, data);

  if (!res.ok) {
    // handle errors
  }

  return res;
}

export async function getShortLink(shortCode: string) {
  const link = await kv.get<ShortLink>(["shortlinks", shortCode]);
  return link.value;
}

const longUrl = "https://fireship.io";
const shortCode = await generateShortCode(longUrl);
const userId = "test";

await storeShortLink(longUrl, shortCode, userId);

const linkData = await getShortLink(shortCode);

export type GitHubUser = {
  login: string; // username
  avatar_url: string;
  html_url: string;
};

export async function storeUser(sessionId: string, userData: GitHubUser) {
  const key = ["sessions", sessionId];
  const res = await kv.set(key, userData);
  return res;
}

export async function getUser(sessionId: string) {
  const key = ["sessions", sessionId];
  const res = await kv.get<GitHubUser>(key);
  return res.value;
}
