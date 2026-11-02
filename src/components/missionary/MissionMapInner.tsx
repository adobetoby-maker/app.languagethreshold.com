import { useOverlayHistory } from "@/hooks/use-overlay-history";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe2, MapPin, Home, Users, Loader2, Check, Share2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";
import {
  WORLDWIDE_MISSIONS,
  COUNTRIES,
  COUNTRY_CENTROIDS,
  findMissionById,
  getMissionsByArea,
  type WorldwideMission,
} from "@/data/missions-worldwide";

// Fix Leaflet's default icon paths (which break under bundlers).
// Use CDN-hosted markers — small, cached, reliable.
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface SharedPin {
  id: string;
  mission_id: string;
  mission_name: string;
  mission_lat: number;
  mission_lng: number;
  hometown_city: string;
  hometown_country: string;
  hometown_lat: number | null;
  hometown_lng: number | null;
}

/**
 * Worldwide mission map: pick where you serve (or served) plus your hometown,
 * and optionally share that pairing anonymously with the community. The map
 * draws a connection line between hometown and mission for every shared pin.
 */
export interface MissionMapProps {
  /** When set, dim every pin except this one (used by the Family view). */
  filterPinId?: string | null;
  /** Optional label appended to the legend, e.g. "Smith family". */
  highlightLastName?: string | null;
}

export function MissionMapInner({
  filterPinId = null,
  highlightLastName = null,
}: MissionMapProps = {}) {
  const { user } = useAuth();
  const groupedMissions = useMemo(() => getMissionsByArea(), []);
  const sortedAreas = useMemo(() => Object.keys(groupedMissions).sort(), [groupedMissions]);

  const [showPicker, setShowPicker] = useState(false);
  useOverlayHistory(showPicker, () => setShowPicker(false));
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [hometownCity, setHometownCity] = useState("");
  const [hometownCountry, setHometownCountry] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [missionSearch, setMissionSearch] = useState("");

  // Custom (manual) mission entry — for historic / dissolved missions.
  const [customMode, setCustomMode] = useState(false);
  const [customMissionName, setCustomMissionName] = useState("");
  const [customMissionCountry, setCustomMissionCountry] = useState("");

  const [askingToShare, setAskingToShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pins, setPins] = useState<SharedPin[]>([]);
  const [myPinId, setMyPinId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedMission = findMissionById(selectedMissionId);
  const filteredMissions = useMemo(() => {
    const list = areaFilter ? (groupedMissions[areaFilter] ?? []) : WORLDWIDE_MISSIONS;
    const q = missionSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) => m.name.toLowerCase().includes(q) || m.country.toLowerCase().includes(q),
    );
  }, [areaFilter, missionSearch, groupedMissions]);

  // Load all shared pins (public read).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("mission_pins")
        .select(
          "id, mission_id, mission_name, mission_lat, mission_lng, hometown_city, hometown_country, hometown_lat, hometown_lng, user_id",
        );
      if (cancelled) return;
      if (error) {
        console.error("Failed to load mission pins", error);
        return;
      }
      const list = (data ?? []) as Array<SharedPin & { user_id: string }>;
      setPins(list.map(({ user_id, ...rest }) => rest));
      if (user) {
        const mine = list.find((p) => p.user_id === user.id);
        if (mine) {
          setMyPinId(mine.id);
          setSelectedMissionId(mine.mission_id);
          setHometownCity(mine.hometown_city);
          setHometownCountry(mine.hometown_country);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function resolveHometownCoords(): { lat: number | null; lng: number | null } {
    const c = COUNTRY_CENTROIDS[hometownCountry];
    return c ? { lat: c.lat, lng: c.lng } : { lat: null, lng: null };
  }

  // Resolve the mission to use — either a selected official mission, or a custom
  // user-entered one anchored to its country's centroid (for historic missions).
  function resolveEffectiveMission(): {
    id: string;
    name: string;
    lat: number;
    lng: number;
  } | null {
    if (customMode) {
      const name = customMissionName.trim();
      const c = COUNTRY_CENTROIDS[customMissionCountry];
      if (!name || !c) return null;
      return {
        id: `custom:${name.toLowerCase().replace(/\s+/g, "-")}`,
        name: name.slice(0, 100),
        lat: c.lat,
        lng: c.lng,
      };
    }
    if (!selectedMission) return null;
    return {
      id: selectedMission.id,
      name: selectedMission.name,
      lat: selectedMission.lat,
      lng: selectedMission.lng,
    };
  }

  const effectiveMission = resolveEffectiveMission();
  const canContinue = !!effectiveMission && !!hometownCity.trim() && !!hometownCountry;

  async function confirmShare(share: boolean) {
    setAskingToShare(false);
    if (!share) {
      setShowPicker(false);
      setFeedback("Saved locally — your pin is private and not shown on the map.");
      return;
    }
    if (!user) {
      setShowPicker(false);
      setFeedback("Mission saved! Sign in to share your pin on the community map.");
      return;
    }
    const mission = resolveEffectiveMission();
    if (!mission || !hometownCity.trim() || !hometownCountry) return;
    setSaving(true);
    const coords = resolveHometownCoords();
    const payload = {
      user_id: user.id,
      mission_id: mission.id,
      mission_name: mission.name,
      mission_lat: mission.lat,
      mission_lng: mission.lng,
      hometown_city: hometownCity.trim().slice(0, 100),
      hometown_country: hometownCountry,
      hometown_lat: coords.lat,
      hometown_lng: coords.lng,
    };
    const { data, error } = await supabase
      .from("mission_pins")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      console.error("Failed to share pin", error);
      setFeedback("Could not save your pin. Please try again.");
      return;
    }
    const newPin: SharedPin = {
      id: data.id,
      mission_id: data.mission_id,
      mission_name: data.mission_name,
      mission_lat: data.mission_lat,
      mission_lng: data.mission_lng,
      hometown_city: data.hometown_city,
      hometown_country: data.hometown_country,
      hometown_lat: data.hometown_lat,
      hometown_lng: data.hometown_lng,
    };
    setMyPinId(newPin.id);
    setPins((prev) => {
      const without = prev.filter((p) => p.id !== newPin.id);
      return [...without, newPin];
    });
    setShowPicker(false);
    setFeedback("Shared anonymously on the community map. ✦");
  }

  async function removeMyPin() {
    if (!user || !myPinId) return;
    const { error } = await supabase.from("mission_pins").delete().eq("id", myPinId);
    if (error) {
      console.error(error);
      return;
    }
    setPins((prev) => prev.filter((p) => p.id !== myPinId));
    setMyPinId(null);
    setFeedback("Pin removed from the map.");
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/8 via-card/60 to-card/40">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gold/20 px-5 py-4">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            <Globe2 className="h-3.5 w-3.5" /> Mission Map
          </div>
          <h2 className="mt-1 font-display text-xl text-foreground">
            Where in the world are missionaries serving?
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Pick your mission and hometown to see the community map. Sharing is{" "}
            <strong>anonymous and opt-in</strong> — no names are ever shown.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Users className="h-3 w-3" />
            {pins.length} shared
          </span>
          <button
            onClick={() => {
              setShowPicker(true);
              setFeedback(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/25"
          >
            <MapPin className="h-3 w-3" />
            {myPinId ? "Update my pin" : "Add my pin"}
          </button>
        </div>
      </header>

      {/* Feedback strip */}
      {feedback && (
        <div className="flex items-center justify-between gap-3 border-b border-gold/20 bg-gold/5 px-5 py-2 text-xs text-foreground">
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

      {/* Map */}
      <div className="relative h-[460px] w-full overflow-hidden">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          worldCopyJump
          className="h-full w-full"
          style={{ background: "hsl(var(--card))" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Connection lines */}
          {pins
            .filter((p) => p.hometown_lat != null && p.hometown_lng != null)
            .map((p) => (
              <Polyline
                key={`line-${p.id}`}
                positions={[
                  [p.hometown_lat as number, p.hometown_lng as number],
                  [p.mission_lat, p.mission_lng],
                ]}
                pathOptions={{ color: "#d4af37", weight: 1.5, opacity: 0.55, dashArray: "4 6" }}
              />
            ))}
          {/* Mission pins (gold) */}
          {pins.map((p) => (
            <Marker key={`m-${p.id}`} position={[p.mission_lat, p.mission_lng]}>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">Serving in {p.mission_name}</div>
                  <div className="text-muted-foreground">
                    From {p.hometown_city}, {p.hometown_country}
                  </div>
                  <div className="mt-1 italic text-[10px] text-muted-foreground">
                    Anonymous • shared by a missionary
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          {/* Hometown pins (subtle dot) */}
          {pins
            .filter((p) => p.hometown_lat != null && p.hometown_lng != null)
            .map((p) => (
              <CircleMarker
                key={`h-${p.id}`}
                center={[p.hometown_lat as number, p.hometown_lng as number]}
                radius={4}
                pathOptions={{
                  color: "#a78bfa",
                  fillColor: "#a78bfa",
                  fillOpacity: 0.7,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">
                      Hometown: {p.hometown_city}, {p.hometown_country}
                    </div>
                    <div className="text-muted-foreground">Serving in {p.mission_name}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
        <div className="pointer-events-none absolute bottom-2 left-2 z-[400] flex flex-wrap gap-3 rounded-md bg-background/85 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#d4af37]" /> Mission
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#a78bfa]" /> Hometown
          </span>
        </div>
      </div>

      {/* My pin row */}
      {myPinId && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold/15 px-5 py-3 text-xs">
          <div className="text-muted-foreground">
            Your pin:{" "}
            <span className="text-foreground">
              {pins.find((p) => p.id === myPinId)?.mission_name ?? selectedMission?.name ?? "—"}
            </span>
            {hometownCity && (
              <>
                <span className="mx-1 opacity-50">←</span>
                <span className="text-foreground">
                  {hometownCity}, {hometownCountry}
                </span>
              </>
            )}
          </div>
          <button
            onClick={removeMyPin}
            className="rounded-full border border-border/60 bg-background/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:border-destructive/60 hover:text-destructive"
          >
            Remove pin
          </button>
        </div>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/80 p-4 backdrop-blur"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-gold/20 px-5 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                Add your mission pin
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-foreground"
                aria-label="Close mission picker"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {!askingToShare ? (
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
                {/* Mission selector */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" /> Mission
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomMode((v) => !v);
                        if (!customMode) setSelectedMissionId(null);
                      }}
                      className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold/80 hover:text-gold"
                    >
                      {customMode ? "← Use official list" : "Can't find it? Enter manually →"}
                    </button>
                  </div>

                  {customMode ? (
                    <div className="space-y-2 rounded-md border border-gold/30 bg-gold/5 p-3">
                      <p className="text-[11px] text-muted-foreground">
                        For historic or reorganized missions. We'll place the pin at the country's
                        approximate center.
                      </p>
                      <input
                        type="text"
                        maxLength={100}
                        value={customMissionName}
                        onChange={(e) => setCustomMissionName(e.target.value)}
                        placeholder="Mission name (e.g. Japan Tokyo North 1985)"
                        className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-xs"
                      />
                      <select
                        value={customMissionCountry}
                        onChange={(e) => setCustomMissionCountry(e.target.value)}
                        className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-xs"
                      >
                        <option value="">Mission country…</option>
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={areaFilter}
                          onChange={(e) => setAreaFilter(e.target.value)}
                          className="rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-xs"
                        >
                          <option value="">All areas</option>
                          {sortedAreas.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Search mission or country…"
                          value={missionSearch}
                          onChange={(e) => setMissionSearch(e.target.value)}
                          className="flex-1 rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border/40 bg-background/40">
                        {filteredMissions.map((m: WorldwideMission) => {
                          const active = m.id === selectedMissionId;
                          return (
                            <button
                              key={m.id}
                              onClick={() => setSelectedMissionId(m.id)}
                              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                                active
                                  ? "bg-gold/15 text-gold"
                                  : "text-foreground/80 hover:bg-card/60"
                              }`}
                            >
                              <span>{m.name}</span>
                              <span className="opacity-60">{m.country}</span>
                            </button>
                          );
                        })}
                        {filteredMissions.length === 0 && (
                          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                            No missions match.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Hometown */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      <Home className="mr-1 inline h-3 w-3" /> Hometown city
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={hometownCity}
                      onChange={(e) => setHometownCity(e.target.value)}
                      placeholder="e.g. Provo"
                      className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Hometown country
                    </label>
                    <select
                      value={hometownCountry}
                      onChange={(e) => setHometownCountry(e.target.value)}
                      className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-xs"
                    >
                      <option value="">Select country…</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowPicker(false)}
                    className="rounded-full border border-border/60 bg-background/60 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!canContinue}
                    onClick={() => setAskingToShare(true)}
                    className="rounded-full border border-gold/60 bg-gold/15 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-6">
                <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4">
                  <Share2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold" />
                  <div>
                    <div className="font-display text-base text-foreground">
                      Share your pin on the community map?
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Other users will see <strong>{effectiveMission?.name}</strong> connected to{" "}
                      <strong>
                        {hometownCity}, {hometownCountry}
                      </strong>
                      . Your name is never shown — pins display anonymously as “a missionary.” You
                      can remove your pin at any time.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    disabled={saving}
                    onClick={() => confirmShare(false)}
                    className="rounded-full border border-border/60 bg-background/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                  >
                    Keep private
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => confirmShare(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Yes, share anonymously
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
