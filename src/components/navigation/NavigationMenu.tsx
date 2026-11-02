import { useState, type ElementType } from "react";
import { ChevronDown } from "lucide-react";
import type { TabKey } from "@/state/app-state";
import {
  NAVIGATION_GROUPS,
  PRIMARY_NAVIGATION,
  navigationGroup,
  navigationRank,
  type NavigationVersion,
} from "@/lib/navigation-menu";
import { cn } from "@/lib/utils";

export interface NavigationItem {
  key: TabKey;
  label: string;
  Icon: ElementType;
}
export function NavigationMenu({
  items,
  active,
  onSelect,
  version,
  mobile = false,
}: {
  items: NavigationItem[];
  active: TabKey;
  onSelect: (key: TabKey) => void;
  version: NavigationVersion;
  mobile?: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Partial<Record<string, boolean>>>({});
  const activeGroup = navigationGroup(active);
  function tool(item: NavigationItem) {
    const { key, label, Icon } = item;
    const selected = active === key;
    return (
      <button
        key={key}
        type="button"
        data-tour={key}
        aria-current={selected ? "page" : undefined}
        onClick={() => onSelect(key)}
        className={cn(
          "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
          selected ? "bg-gold/15 font-semibold text-gold-ink" : "text-foreground hover:bg-card/80",
        )}
      >
        <Icon
          aria-hidden="true"
          className="h-[18px] w-[18px] shrink-0"
          strokeWidth={selected ? 2 : 1.6}
        />
        <span className="leading-snug">{label}</span>
      </button>
    );
  }
  function fold(
    id: string,
    label: string,
    children: React.ReactNode,
    containsActive: boolean,
    initiallyOpen: boolean,
  ) {
    // Keep the active section visible by default, but let the learner close it.
    // A new active tab gets a fresh default rather than inheriting a prior fold.
    const stateKey = `${id}:${active}`;
    const open = !(collapsed[stateKey] ?? !(containsActive || initiallyOpen));
    return (
      <div key={id}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${mobile ? "mobile" : "desktop"}-${id}`}
          onClick={() => setCollapsed((value) => ({ ...value, [stateKey]: open }))}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gold-ink hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {label}
          <ChevronDown
            aria-hidden="true"
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
        <div id={`${mobile ? "mobile" : "desktop"}-${id}`} hidden={!open} className="space-y-0.5">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className={cn("space-y-4", mobile && "py-2")} data-navigation-version={version}>
      {NAVIGATION_GROUPS.map((group) => {
        const members = items
          .filter((item) => navigationGroup(item.key) === group)
          .sort((a, b) => navigationRank(a.key) - navigationRank(b.key));
        if (!members.length) return null;
        const primary = members.filter((item) => PRIMARY_NAVIGATION.has(item.key));
        const more = members.filter((item) => !PRIMARY_NAVIGATION.has(item.key));
        const body = (
          <>
            {primary.map(tool)}
            {more.length > 0 &&
              fold(
                `${group.toLowerCase()}-more`,
                group === "Practice"
                  ? "Practice Lab"
                  : group === "Learn"
                    ? "More learning tools"
                    : "More reference tools",
                more.map(tool),
                more.some((item) => item.key === active),
                version === "sections" && group !== "Practice",
              )}
          </>
        );
        if (version === "accordion")
          return (
            <section key={group} aria-label={group}>
              {fold(
                `${group.toLowerCase()}-group`,
                group,
                body,
                activeGroup === group,
                group === "Learn",
              )}
            </section>
          );
        return (
          <section
            key={group}
            aria-label={group}
            className={cn(
              version === "focused" && "rounded-2xl border border-border/60 bg-card/30 p-1",
            )}
          >
            <h2 className="px-3 pb-1 pt-2 text-sm font-semibold text-gold-ink">{group}</h2>
            {version === "sections" ? (
              <>
                {members
                  .filter((item) => group !== "Practice" || PRIMARY_NAVIGATION.has(item.key))
                  .map(tool)}
                {group === "Practice" &&
                  more.length > 0 &&
                  fold(
                    "practice-lab",
                    "Practice Lab",
                    more.map(tool),
                    more.some((item) => item.key === active),
                    false,
                  )}
              </>
            ) : (
              body
            )}
          </section>
        );
      })}
    </div>
  );
}
