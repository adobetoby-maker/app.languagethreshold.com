import { SPEAKING_PARTNERS, speakingPartner, suggestedPartnerIds } from "@/data/speaking-partners";
export function SpeakingPartnerPicker({
  value,
  onChange,
  moduleId,
  category,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  moduleId: string;
  category: string;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3" data-testid="speaking-partner-picker">
      <p className="font-semibold">Who are you speaking with?</p>
      <div className="flex flex-wrap gap-2">
        {suggestedPartnerIds(moduleId, category).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            disabled={disabled}
            onClick={() => onChange(id)}
            className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            {speakingPartner(id)[1]}
          </button>
        ))}
      </div>
      <label className="block text-sm">
        Browse all partner roles
        <select
          aria-label="Speaking partner role"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground"
        >
          {[...new Set(SPEAKING_PARTNERS.map((r) => r[2]))].map((group) => (
            <optgroup key={group} label={group}>
              {SPEAKING_PARTNERS.filter((r) => r[2] === group).map((r) => (
                <option key={r[0]} value={r[0]}>
                  {r[1]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <p className="text-sm text-foreground">Your role: {speakingPartner(value)[4]}.</p>
      <p className="text-sm text-muted-foreground">
        Changing partner starts a new conversation. Missions keep their assigned roles.
      </p>
    </div>
  );
}
