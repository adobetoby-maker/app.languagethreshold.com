// Owner area tabs, synced to ?tab= in the URL.
export const OWNER_TABS = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "users", label: "Users" },
  { id: "support", label: "Support" },
  { id: "companies", label: "Companies" },
  { id: "money", label: "Money" },
  { id: "activity", label: "Activity" },
] as const;
export type OwnerTab = (typeof OWNER_TABS)[number]["id"];
export const isOwnerTab = (value: unknown): value is OwnerTab =>
  OWNER_TABS.some((tab) => tab.id === value);
export const ownerTab = (value: unknown): OwnerTab => (isOwnerTab(value) ? value : "overview");
