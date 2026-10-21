import { useEffect, useMemo, useState } from "react";
import { Users, Plus, Copy, Check, X, Heart, Loader2, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";

interface FamilyGroup {
  id: string;
  owner_user_id: string;
  family_code: string;
  last_name: string;
  mission_pin_id: string | null;
}

interface FamilyMember {
  id: string;
  group_id: string;
  display_name: string;
  relationship: string;
  hometown_city: string | null;
  hometown_country: string | null;
  is_missionary: boolean;
}

const RELATIONSHIPS = [
  "Missionary",
  "Mom",
  "Dad",
  "Sister",
  "Brother",
  "Spouse",
  "Grandparent",
  "Aunt / Uncle",
  "Cousin",
  "Friend",
];

function generateCode(lastName: string) {
  const stem =
    (lastName || "FAM")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 5) || "FAM";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const tail = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${stem}-${tail}`;
}

/**
 * Family Package — $19.99 one-time, up to 7 entries with the same last name.
 * Lets parents and siblings follow along with their missionary on the map.
 * Joining requires only a shared family code + last name (per product spec).
 */
export function FamilyPackagePanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myGroup, setMyGroup] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create-group form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLastName, setNewLastName] = useState("");

  // Join form
  const [showJoin, setShowJoin] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLastName, setJoinLastName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinRelationship, setJoinRelationship] = useState("Mom");
  const [joinCity, setJoinCity] = useState("");
  const [joinCountry, setJoinCountry] = useState("");

  // Load: any group I own, plus most recent group I'm a guest in (best-effort).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (user) {
        const { data: ownGroups } = await supabase
          .from("family_groups")
          .select("*")
          .eq("owner_user_id", user.id)
          .limit(1);
        if (cancelled) return;
        const g = (ownGroups?.[0] as FamilyGroup | undefined) ?? null;
        setMyGroup(g);
        if (g) {
          const { data: mems } = await supabase
            .from("family_members")
            .select("*")
            .eq("group_id", g.id)
            .order("created_at", { ascending: true });
          if (!cancelled) setMembers((mems as FamilyMember[]) ?? []);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const seatsLeft = useMemo(() => Math.max(0, 7 - members.length), [members]);

  async function createGroup() {
    if (!user || !newLastName.trim()) return;
    setCreating(true);
    // Find this user's existing mission pin to link the group to (so the map
    // knows which pin is "the family's missionary").
    const { data: pin } = await supabase
      .from("mission_pins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const code = generateCode(newLastName);
    const { data: group, error: gErr } = await supabase
      .from("family_groups")
      .insert({
        owner_user_id: user.id,
        family_code: code,
        last_name: newLastName.trim(),
        mission_pin_id: pin?.id ?? null,
      })
      .select()
      .single();
    if (gErr || !group) {
      setCreating(false);
      setFeedback(gErr?.message ?? "Could not create family group.");
      return;
    }
    // Seed the missionary as the first member.
    const { data: mem } = await supabase
      .from("family_members")
      .insert({
        group_id: group.id,
        display_name: user.email?.split("@")[0] ?? "Missionary",
        relationship: "Missionary",
        is_missionary: true,
      })
      .select()
      .single();
    setMyGroup(group as FamilyGroup);
    setMembers(mem ? [mem as FamilyMember] : []);
    setShowCreate(false);
    setCreating(false);
    setFeedback(`Family group created — share code ${code} with your family.`);
  }

  async function joinGroup() {
    if (!user || !joinCode.trim() || !joinLastName.trim() || !joinName.trim()) return;
    setJoining(true);
    // Code + last name are checked server-side; groups are not readable before joining.
    const { data, error } = await supabase.rpc("join_family_group", {
      p_family_code: joinCode.trim().toUpperCase(),
      p_last_name: joinLastName.trim(),
      p_display_name: joinName.trim().slice(0, 60),
      p_relationship: joinRelationship,
      p_hometown_city: joinCity.trim() || null,
      p_hometown_country: joinCountry.trim() || null,
    });
    setJoining(false);
    if (error) {
      setFeedback(
        error.message.includes("Family group is full")
          ? "This family group already has 7 members."
          : error.message.includes("Too many join attempts")
            ? "Too many attempts. Please try again in an hour."
            : "Could not join family group.",
      );
      return;
    }
    const joined = data as { lastName?: string; error?: string } | null;
    if (joined?.error === "not_found") {
      setFeedback("No family group matches that code and last name.");
      return;
    }
    setShowJoin(false);
    setFeedback(`Welcome to the ${joined?.lastName ?? ""} family group! ✦`);
    setJoinCode("");
    setJoinLastName("");
    setJoinName("");
    setJoinCity("");
    setJoinCountry("");
  }

  async function removeMember(id: string) {
    if (!myGroup) return;
    const { error } = await supabase.from("family_members").delete().eq("id", id);
    if (error) {
      setFeedback("Could not remove member.");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function copyCode() {
    if (!myGroup) return;
    navigator.clipboard.writeText(myGroup.family_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-500/5 via-card/60 to-card/40">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rose-400/20 px-5 py-4">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300">
            <Heart className="h-3.5 w-3.5" /> Family Package · $19.99
          </div>
          <h2 className="mt-1 font-display text-xl text-foreground">
            Bring the family along on the mission
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Up to <strong>7 members</strong> with the same last name learn alongside their
            missionary. Share one code, study the same scriptures, follow their pin on the map.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setShowJoin(true);
              setShowCreate(false);
              setFeedback(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:border-rose-400/60 hover:text-foreground"
          >
            <Users className="h-3 w-3" /> Join with code
          </button>
          {!myGroup && (
            <button
              onClick={() => {
                setShowCreate(true);
                setShowJoin(false);
                setFeedback(null);
              }}
              disabled={!user}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/60 bg-rose-500/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3 w-3" /> Create family group
            </button>
          )}
        </div>
      </header>

      {feedback && (
        <div className="flex items-center justify-between gap-3 border-b border-rose-400/20 bg-rose-500/5 px-5 py-2 text-xs text-foreground">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="space-y-3 border-b border-rose-400/15 bg-background/30 px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300">
            <Sparkles className="mr-1 inline h-3 w-3" /> New family group
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Family last name
              </label>
              <input
                type="text"
                maxLength={60}
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                placeholder="e.g. Smith"
                className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              disabled={creating || !newLastName.trim()}
              onClick={createGroup}
              className="inline-flex items-center gap-2 rounded-full border border-rose-400/60 bg-rose-500/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-500/25 disabled:opacity-40"
            >
              {creating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Create group
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-full border border-border/60 bg-background/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            We'll generate a shareable code your family enters along with your last name. Up to 6
            others can join (7 total including you).
          </p>
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="space-y-3 border-b border-rose-400/15 bg-background/30 px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-300">
            <Users className="mr-1 inline h-3 w-3" /> Join your missionary's family group
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Family code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. SMITH-7K2P"
                className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 font-mono text-sm uppercase tracking-wider"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Last name
              </label>
              <input
                type="text"
                value={joinLastName}
                onChange={(e) => setJoinLastName(e.target.value)}
                placeholder="Must match the family"
                className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Your name / nickname
              </label>
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="e.g. Mom, Sarah"
                className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Relationship
              </label>
              <select
                value={joinRelationship}
                onChange={(e) => setJoinRelationship(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-sm"
              >
                {RELATIONSHIPS.filter((r) => r !== "Missionary").map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Hometown city (optional)
              </label>
              <input
                type="text"
                value={joinCity}
                onChange={(e) => setJoinCity(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Hometown country (optional)
              </label>
              <input
                type="text"
                value={joinCountry}
                onChange={(e) => setJoinCountry(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowJoin(false)}
              className="rounded-full border border-border/60 bg-background/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              disabled={joining || !joinCode.trim() || !joinLastName.trim() || !joinName.trim()}
              onClick={joinGroup}
              className="inline-flex items-center gap-2 rounded-full border border-rose-400/60 bg-rose-500/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-500/25 disabled:opacity-40"
            >
              {joining ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Join group
            </button>
          </div>
        </div>
      )}

      {/* My group */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading family group…
        </div>
      ) : myGroup ? (
        <div className="px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                The {myGroup.last_name} family
              </div>
              <button
                onClick={copyCode}
                className="mt-1 inline-flex items-center gap-2 rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 font-mono text-sm tracking-wider text-rose-200 hover:bg-rose-500/20"
                title="Click to copy"
              >
                {myGroup.family_code}
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5 opacity-70" />
                )}
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {members.length} / 7 members · {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
            </div>
          </div>
          <ul className="divide-y divide-border/40 rounded-xl border border-border/40 bg-background/40">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] uppercase ${m.is_missionary ? "bg-gold/20 text-gold" : "bg-rose-500/15 text-rose-200"}`}
                  >
                    {m.display_name.slice(0, 2)}
                  </span>
                  <div>
                    <div className="text-foreground">{m.display_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {m.relationship}
                      {m.hometown_city &&
                        ` · ${m.hometown_city}${m.hometown_country ? ", " + m.hometown_country : ""}`}
                    </div>
                  </div>
                </div>
                {!m.is_missionary && user?.id === myGroup.owner_user_id && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
            {members.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                No members yet — share your code!
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div className="px-5 py-5 text-xs text-muted-foreground">
          {user
            ? 'You haven\'t created a family group yet. Click "Create family group" to get started — or join an existing one with a code.'
            : "Sign in to create a family group, or use a code to join one your missionary already created."}
        </div>
      )}
    </section>
  );
}
