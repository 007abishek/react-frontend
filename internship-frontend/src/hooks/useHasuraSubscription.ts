import { useEffect, useState } from "react";
import type { Unsubscribe } from "../utils/hasuraClient";

type SubscriptionStatus = "connecting" | "live" | "error" | "closed";

export type UseHasuraSubscriptionResult<T> = {
    data: T | undefined;
    loading: boolean;
    error: string | undefined;
    status: SubscriptionStatus;
};

/**
 * Generic hook for Hasura WebSocket subscriptions.
 *
 * @param subscribe - An async function that starts a subscription. It should
 *   accept (onData, onError) callbacks and return a Promise<Unsubscribe>.
 * @param deps - Optional extra dependencies that cause the subscription to restart
 *   (e.g. a route param). The subscribe function reference itself is always
 *   included as a dependency.
 *
 * @example
 *   const { data, loading, status } = useHasuraSubscription(
 *     (onData, onError) => subscribeOrderHistory(onData, onError)
 *   );
 */
export function useHasuraSubscription<T>(
    subscribe: (
        onData: (data: T) => void,
        onError: (error: Error) => void
    ) => Promise<Unsubscribe>,
    deps: unknown[] = []
): UseHasuraSubscriptionResult<T> {
    const [data, setData] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>(undefined);
    const [status, setStatus] = useState<SubscriptionStatus>("connecting");

    useEffect(() => {
        let mounted = true;
        let unsubscribe: Unsubscribe | undefined;

        setLoading(true);
        setError(undefined);
        setStatus("connecting");

        subscribe(
            (incoming) => {
                if (!mounted) return;
                setData(incoming);
                setLoading(false);
                setStatus("live");
            },
            (err) => {
                if (!mounted) return;
                setError(err.message);
                setLoading(false);
                setStatus("error");
            }
        )
            .then((stop) => {
                if (!mounted) {
                    stop();
                    return;
                }
                unsubscribe = stop;
            })
            .catch((err: unknown) => {
                if (!mounted) return;
                const msg = err instanceof Error ? err.message : "Subscription failed";
                setError(msg);
                setLoading(false);
                setStatus("error");
            });

        return () => {
            mounted = false;
            unsubscribe?.();
            setStatus("closed");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subscribe, ...deps]);

    return { data, loading, error, status };
}
