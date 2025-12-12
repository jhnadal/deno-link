import { Router } from "./router.ts";
import { generateShortCode, storeShortLink, getShortLink } from "./db.ts";

const app = new Router();

app.get("/", () => new Response("Hi Mom!"));

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

app.get("/links/:id", async (_req, _info, params) => {
  const shortCode = _info?.pathname.groups.id;

  const data = await getShortLink(shortCode!);

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: {
      "content-type": "application/json",
    },
  });
});

export default {
  fetch(req) {
    return app.handler(req);
  },
} satisfies Deno.ServeDefaultExport;
