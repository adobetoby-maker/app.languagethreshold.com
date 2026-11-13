import { useCallback, useLayoutEffect, useRef, useState } from "react";

/** Follow streaming text until the reader scrolls away from the latest turn. */
export function useChatFollow(revision: readonly unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const [following, setFollowing] = useState(true);
  const jumpToLatest = useCallback(() => {
    followingRef.current = true;
    setFollowing(true);
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, []);
  const onScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 48;
    followingRef.current = nearBottom;
    setFollowing(nearBottom);
  }, []);
  useLayoutEffect(() => {
    if (followingRef.current || revision.length === 0) jumpToLatest();
  }, [revision, jumpToLatest]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      if (followingRef.current) jumpToLatest();
    });
    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [jumpToLatest, revision]);
  return { containerRef, contentRef, following, onScroll, jumpToLatest };
}
