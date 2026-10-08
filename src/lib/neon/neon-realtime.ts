/**
 * Server-Sent Events (SSE) & Scoped Event Dispatcher
 * Replaces Supabase Realtime with stateless serverless event streams and fallback polling.
 */

export interface RealtimeEvent<T = any> {
  id: string;
  topic: string;
  event: string;
  payload: T;
  timestamp: string;
}

export class NeonRealtimeService {
  private listeners = new Map<string, Set<(event: RealtimeEvent) => void>>();
  private eventHistory: RealtimeEvent[] = [];

  /**
   * Publishes an event to a specific topic (e.g. notifications:user_123)
   */
  publish<T>(topic: string, eventName: string, payload: T): RealtimeEvent<T> {
    const event: RealtimeEvent<T> = {
      id: crypto.randomUUID(),
      topic,
      event: eventName,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > 500) {
      this.eventHistory.shift();
    }

    const topicListeners = this.listeners.get(topic);
    if (topicListeners) {
      for (const listener of topicListeners) {
        try {
          listener(event);
        } catch (err) {
          console.error("Realtime listener error:", err);
        }
      }
    }

    return event;
  }

  /**
   * Subscribes to events on a topic. Returns an unsubscribe callback.
   */
  subscribe(topic: string, callback: (event: RealtimeEvent) => void): () => void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(callback);

    return () => {
      const set = this.listeners.get(topic);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(topic);
      }
    };
  }

  /**
   * Retrieves events missed during network disconnect for fallback polling / stream sync.
   */
  getEventsSince(topic: string, sinceIsoString: string): RealtimeEvent[] {
    const sinceTime = new Date(sinceIsoString).getTime();
    return this.eventHistory.filter(
      (e) => e.topic === topic && new Date(e.timestamp).getTime() > sinceTime
    );
  }
}

export const neonRealtime = new NeonRealtimeService();
