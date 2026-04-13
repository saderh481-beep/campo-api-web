import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { listNotificacionesNoLeidas, markAllNotificacionesLeidas, markNotificacionLeida } from "@/models/notificaciones.model";
import { broadcaster } from "@/lib/broadcaster";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador", "admin", "coordinador", "tecnico"));

app.get("/", async (c) => {
  const user = c.get("user");
  const rows = await listNotificacionesNoLeidas(user.sub);
  return c.json(rows);
});

app.get("/stream", async (c) => {
  const user = c.get("user");
  const channel = `user:${user.sub}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      controller.enqueue(encoder.encode(": connected\n\n"));

      const unsubscribe = broadcaster.subscribe(channel, (data) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch (e) {
          console.error("[SSE] Error sending:", e);
        }
      });

      c.req.raw.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});

app.patch(
  "/:id/leer",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const user = c.get("user");
    const row = await markNotificacionLeida(id, user.sub);
    if (!row) return c.json({ error: "Notificación no encontrada" }, 404);
    return c.json(row);
  }
);

app.patch("/leer-todas", async (c) => {
  const user = c.get("user");
  await markAllNotificacionesLeidas(user.sub);
  return c.json({ message: "Todas las notificaciones marcadas como leídas" });
});

export default app;