import app from "./app";

const port = Number(process.env.PORT ?? 3001);

console.log(`[api-web] Escuchando en http://0.0.0.0:${port}`);

export default {
  port,
  fetch: app.fetch,
};
