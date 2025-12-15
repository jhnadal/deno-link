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

export type ClickAnalytics = {
  shortUrl: string;
  createdAt: number;
  ipAddress: string;
  userAgent: string;
  country?: string;
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

  const userKey = [userId, shortCode];

  const res = await kv
    .atomic()
    .set(shortLinkKey, data)
    .set(userKey, shortCode)
    .commit();

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

export async function getUserLinks(userId: string) {
  const list = kv.list<string>({ prefix: [userId] });
  const res = await Array.fromAsync(list);
  const userShortLinkKeys = res.map((v) => ["shortlinks", v.value]);

  const userRes = await kv.getMany<ShortLink[]>(userShortLinkKeys);
  const userShortLinks = await Array.fromAsync(userRes);

  return userShortLinks.map((v) => v.value);
}

export async function getAllLinks() {
  const listIterator = kv.list<ShortLink>({ prefix: ["shortlinks"] });
  const allLinks: ShortLink[] = [];
  for await (const entry of listIterator) {
    allLinks.push(entry.value);
  }
  return allLinks;
}

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

export function watchShortLink(shortCode: string) {
  const shortLinkKey = ["shortlinks", shortCode];
  const shortLinkStream = kv.watch<ShortLink[]>([shortLinkKey]).getReader();
  return shortLinkStream;
}

export async function getClickEvent(shortCode: string, clickId: number) {
  const analytics = await kv.get<ClickAnalytics>([
    "analytics",
    shortCode,
    clickId,
  ]);
  return analytics.value;
}

export async function incrementClickCount(
  shortCode: string,
  data?: Partial<ClickAnalytics>
) {
  const shortLinkKey = ["shortlinks", shortCode];
  const shortLink = await kv.get(shortLinkKey);
  const shortLinkData = shortLink.value as ShortLink;

  const newClickCount = shortLinkData?.clickCount + 1;

  const analyicsKey = ["analytics", shortCode, newClickCount];
  const analyticsData = {
    shortCode,
    createdAt: Date.now(),
    ...data,
    // ipAddress: "192.168.1.1",
    // userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    // country: "United States"
  };

  const res = await kv
    .atomic()
    .check(shortLink)
    .set(shortLinkKey, {
      ...shortLinkData,
      clickCount: newClickCount,
    })
    .set(analyicsKey, analyticsData)
    .commit();

  if (!res.ok) {
    console.error("Error recording click!");
  }

  return res;
}
