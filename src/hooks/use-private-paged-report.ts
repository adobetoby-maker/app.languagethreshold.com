import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { examRequest, ExamRequestError } from "@/lib/assessments/client";
interface PrivatePage<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: Record<string, string> | null;
  limit: number;
}
/** Component-local reports: abort old filters/accounts; never persist private report data. */
export function usePrivatePagedReport<T extends { id: string }, M extends object = object>(
  path: string,
  enabled: boolean,
  itemKey: "items" | "enrollments" = "items",
) {
  const { user, isCurrentUser } = useAuth(),
    actor = user?.id,
    key = `${actor ?? "guest"}:${path}`;
  const [epoch, setEpoch] = useState(0),
    [snapshot, setSnapshot] = useState<
      PrivatePage<T> & {
        metadata: M | null;
        key: string;
        loading: boolean;
        moreBusy: boolean;
        error: string;
      }
    >({
      key: "",
      metadata: null,
      items: [],
      hasMore: false,
      nextCursor: null,
      limit: 0,
      loading: false,
      moreBusy: false,
      error: "",
    });
  const version = useRef(0),
    more = useRef<{ controller: AbortController; version: number } | null>(null);
  useEffect(() => {
    if (!actor || !enabled) return;
    const controller = new AbortController(),
      revision = ++version.current;
    more.current?.controller.abort();
    more.current = null;
    setSnapshot({
      key,
      metadata: null,
      items: [],
      hasMore: false,
      nextCursor: null,
      limit: 0,
      loading: true,
      moreBusy: false,
      error: "",
    });
    void examRequest<PrivatePage<T> & M & { enrollments?: T[] }>(path, controller.signal)
      .then((raw) => {
        const items = itemKey === "enrollments" ? raw.enrollments : raw.items;
        if (
          !Array.isArray(items) ||
          !items.every((item) => item && typeof item.id === "string") ||
          typeof raw.hasMore !== "boolean"
        )
          throw new Error("Report data could not be read. Try again.");
        const page = { ...raw, items, metadata: raw as M };
        if (!controller.signal.aborted && version.current === revision && isCurrentUser(actor))
          setSnapshot({ ...page, key, loading: false, moreBusy: false, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted && version.current === revision && isCurrentUser(actor))
          setSnapshot((current) => ({
            ...current,
            loading: false,
            error:
              error instanceof TypeError
                ? "Cannot connect. Reconnect and retry; recorded results remain on the server."
                : error instanceof Error
                  ? error.message
                  : "Report could not be loaded.",
          }));
      });
    return () => {
      controller.abort();
      more.current?.controller.abort();
    };
  }, [actor, enabled, epoch, isCurrentUser, key, path, itemKey]);
  const visible =
    snapshot.key === key
      ? snapshot
      : {
          key,
          metadata: null,
          items: [] as T[],
          hasMore: false,
          nextCursor: null,
          limit: 0,
          loading: enabled,
          moreBusy: false,
          error: "",
        };
  const loadMore = async () => {
    if (!actor || !enabled || more.current || !visible.hasMore || !visible.nextCursor) return;
    const flight = { controller: new AbortController(), version: version.current };
    more.current = flight;
    setSnapshot((current) => ({ ...current, moreBusy: true, error: "" }));
    const url = new URL(path, window.location.origin);
    for (const [name, value] of Object.entries(visible.nextCursor))
      url.searchParams.set(name, value);
    try {
      const raw = await examRequest<PrivatePage<T> & M & { enrollments?: T[] }>(
        url.pathname + url.search,
        flight.controller.signal,
      );
      const items = itemKey === "enrollments" ? raw.enrollments : raw.items;
      if (
        !Array.isArray(items) ||
        !items.every((item) => item && typeof item.id === "string") ||
        typeof raw.hasMore !== "boolean"
      )
        throw new Error("Report data could not be read. Try again.");
      const page = { ...raw, items, metadata: raw as M };
      if (
        !flight.controller.signal.aborted &&
        version.current === flight.version &&
        isCurrentUser(actor)
      )
        setSnapshot((current) =>
          current.key === key
            ? {
                ...current,
                ...page,
                items: [
                  ...new Map(
                    [...current.items, ...page.items].map((row) => [row.id, row]),
                  ).values(),
                ],
                moreBusy: false,
                error: "",
              }
            : current,
        );
    } catch (error) {
      if (
        !flight.controller.signal.aborted &&
        version.current === flight.version &&
        isCurrentUser(actor)
      )
        setSnapshot((current) => ({
          ...current,
          items:
            error instanceof ExamRequestError && [401, 403].includes(error.status)
              ? []
              : current.items,
          moreBusy: false,
          error: error instanceof Error ? error.message : "More records could not be loaded.",
        }));
    } finally {
      if (more.current === flight) more.current = null;
      if (
        !flight.controller.signal.aborted &&
        version.current === flight.version &&
        isCurrentUser(actor)
      )
        setSnapshot((current) => ({ ...current, moreBusy: false }));
    }
  };
  const refresh = useCallback(() => setEpoch((value) => value + 1), []);
  return { ...visible, loadMore, refresh };
}
