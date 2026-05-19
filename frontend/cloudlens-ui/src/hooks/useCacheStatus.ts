import { useEffect, useRef, useState, useCallback } from 'react';

const CACHE_SERVICE_URL =
  process.env.REACT_APP_CACHE_SERVICE_URL || 'http://localhost:8081';

export type CacheEventType =
  | 'refresh_started'
  | 'refresh_complete'
  | 'refresh_error'
  | 'cleanup_complete'
  | 'heartbeat';

export interface CacheEvent {
  type: CacheEventType;
  provider?: string;
  message?: string;
  durationMs?: number;
  timestamp: string;
}

export interface CacheStatus {
  lastRefresh: Date | null;
  isRefreshing: boolean;
  providers: Record<string, 'refreshing' | 'ok' | 'error'>;
  lastEvent: CacheEvent | null;
  connected: boolean;
}

export function useCacheStatus() {
  const [status, setStatus] = useState<CacheStatus>({
    lastRefresh: null,
    isRefreshing: false,
    providers: {},
    lastEvent: null,
    connected: false,
  });

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    function connect() {
      const es = new EventSource(`${CACHE_SERVICE_URL}/events`);
      esRef.current = es;

      es.onopen = () =>
        setStatus(s => ({ ...s, connected: true }));

      es.onmessage = (e) => {
        try {
          const event: CacheEvent = JSON.parse(e.data);

          setStatus(s => {
            const next = { ...s, lastEvent: event };

            if (event.type === 'heartbeat') return { ...next };

            if (event.type === 'refresh_started') {
              if (event.provider === 'all') return { ...next, isRefreshing: true };
              return {
                ...next,
                providers: { ...s.providers, [event.provider!]: 'refreshing' },
              };
            }

            if (event.type === 'refresh_complete') {
              const providers = { ...s.providers, [event.provider!]: 'ok' as const };
              const allDone = !Object.values(providers).includes('refreshing');
              return {
                ...next,
                providers,
                isRefreshing: allDone ? false : s.isRefreshing,
                lastRefresh: allDone ? new Date() : s.lastRefresh,
              };
            }

            if (event.type === 'refresh_error') {
              return {
                ...next,
                providers: { ...s.providers, [event.provider!]: 'error' as const },
              };
            }

            return next;
          });
        } catch {
          // malformed event — ignore
        }
      };

      es.onerror = () => {
        setStatus(s => ({ ...s, connected: false }));
        es.close();
        // reconnect after 5s
        setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      esRef.current?.close();
    };
  }, []);

  const triggerRefresh = useCallback(async () => {
    let response: Response;

    try {
      response = await fetch(`${CACHE_SERVICE_URL}/refresh`, { method: 'POST' });
    } catch {
      throw new Error('Cache refresh service is unavailable. Check that the cache service is running, then try again.');
    }

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(message || `Cache refresh failed with status ${response.status}.`);
    }
  }, []);

  return { status, triggerRefresh };
}
