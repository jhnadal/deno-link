import { Router } from "./router.ts";
import { generateShortCode, storeShortLink, getShortLink } from "./db.ts";
import { HomePage } from "./ui.tsx";
import { render } from "preact-render-to-string";
import { createGitHubOAuthConfig, createHelpers } from "@deno/kv-oauth";
import { handleGithubCallback } from "./auth.ts";

const app = new Router();

const oauthConfig = createGitHubOAuthConfig({
  redirectUri: Deno.env.get("REDIRECT_URI"),
});
const { signIn, signOut } = createHelpers(oauthConfig);

app.get("/oauth/signin", (req: Request) => signIn(req));
app.get("/oauth/signout", signOut);
app.get("/oauth/callback", handleGithubCallback);

app.post("/health-check", () => new Response("It's ALIVE!"));

app.post("/links", async (req) => {
  const { longUrl } = await req.json();

  const shortCode = await generateShortCode(longUrl);
  await storeShortLink(longUrl, shortCode, "testUser");

  const responseData = {
    message: "success!",
    longUrl: longUrl,
    shortCode: shortCode,
  };

  return new Response(JSON.stringify(responseData), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

app.get("/links/:id", async (_req, _info) => {
  const shortCode = _info?.pathname.groups.id;

  const data = await getShortLink(shortCode!);

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: {
      "content-type": "application/json",
    },
  });
});

app.get("/", () => {
  const user = app.currentUser ?? undefined;
  return new Response(render(HomePage({ user })), {
    status: 200,
    headers: {
      "content-type": "text/html",
    },
  });
});

export default {
  fetch(req) {
    return app.handler(req);
  },
} satisfies Deno.ServeDefaultExport;
