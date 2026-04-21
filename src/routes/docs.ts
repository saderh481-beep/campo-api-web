import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    openapi: "3.0.0",
    info: {
      title: "Campo API",
      description: "API para gestión de beneficiarios y actividades del programa Campo",
      version: "1.0.0",
    },
    servers: [
      { url: "https://api.campo.hidalgo.gob.mx", description: "Producción" },
      { url: "http://localhost:3001", description: "Desarrollo" },
    ],
  });
});

export default app;
