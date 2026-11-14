import {
  SPEAKING_PARTNERS,
  speakingPartner,
  suggestedPartnerIds,
  TEACHING_TOPICS,
  type TeacherSettings,
} from "@/data/speaking-partners";
export function SpeakingPartnerPicker({
  value,
  onChange,
  moduleId,
  category,
  disabled,
  teacher,
  onTeacherChange,
}: {
  value: string;
  onChange: (id: string) => void;
  moduleId: string;
  category: string;
  disabled: boolean;
  teacher: TeacherSettings;
  onTeacherChange: (settings: TeacherSettings) => void;
}) {
  return (
    <div className="space-y-3" data-testid="speaking-partner-picker">
      <p className="font-semibold">Who are you speaking with?</p>
      <div className="flex flex-wrap gap-2">
        {[...new Set(["teacher", ...suggestedPartnerIds(moduleId, category)])].map((id) => (
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
      {value === "teacher" && (
        <div
          className="space-y-3 rounded-xl border border-border bg-background/60 p-3"
          data-testid="teacher-setup"
        >
          <p className="text-sm text-muted-foreground">
            Learn a topic through conversation, one small step at a time.
          </p>
          <div className="flex flex-wrap gap-2">
            {TEACHING_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                disabled={disabled}
                aria-pressed={teacher.topic === topic}
                onClick={() => onTeacherChange({ ...teacher, topic })}
                className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm"
              >
                {topic}
              </button>
            ))}
          </div>
          <label className="block text-sm">
            What would you like to learn about?
            <input
              aria-label="Teaching topic"
              value={teacher.topic}
              maxLength={200}
              disabled={disabled}
              onChange={(event) => onTeacherChange({ ...teacher, topic: event.target.value })}
              placeholder="e.g. Japanese customs or a dragon adventure"
              className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            />
          </label>
          <label className="block text-sm">
            Teaching style
            <select
              aria-label="Teaching style"
              value={teacher.style}
              disabled={disabled}
              onChange={(event) =>
                onTeacherChange({
                  ...teacher,
                  style: event.target.value === "standard" ? "standard" : "gentle",
                })
              }
              className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground"
            >
              <option value="gentle">Gentle · short steps and encouragement</option>
              <option value="standard">Standard · a little more detail</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Changing the topic or style starts a new conversation. Fantasy is treated as fiction.
          </p>
        </div>
      )}
      <p className="text-sm text-foreground">Your role: {speakingPartner(value)[4]}.</p>
      <p className="text-sm text-muted-foreground">
        Changing partner starts a new conversation. Missions keep their assigned roles.
      </p>
    </div>
  );
}
