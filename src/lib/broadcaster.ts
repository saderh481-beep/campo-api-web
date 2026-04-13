type Listener = (data: string) => void;

class EventBroadcaster {
  private channels: Map<string, Set<Listener>> = new Map();

  subscribe(channel: string, listener: Listener): () => void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    const listeners = this.channels.get(channel)!;
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.channels.delete(channel);
      }
    };
  }

  publish(channel: string, data: unknown): void {
    const listeners = this.channels.get(channel);
    if (!listeners) return;

    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const listener of listeners) {
      try {
        listener(message);
      } catch (e) {
        console.error("[Broadcaster] Error sending to listener:", e);
      }
    }
  }

  publishToUser(userId: string, event: string, data: unknown): void {
    this.publish(`user:${userId}`, { event, data });
  }

  broadcastNotificacion(userId: string, notificacion: unknown): void {
    this.publishToUser(userId, "nueva_notificacion", notificacion);
  }
}

export const broadcaster = new EventBroadcaster();