import { nextReviewLabel, type SrsFields, type SrsGrade } from "@/lib/srs";
import { SRS_RATINGS } from "@/lib/srs-ratings";
export function SrsRatingButtons({
  fields,
  onRate,
  disabled = false,
}: {
  fields: SrsFields;
  onRate: (grade: SrsGrade) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2" aria-label="Rate your recall">
      {SRS_RATINGS.map(({ grade, label, cls }) => (
        <button
          key={grade}
          type="button"
          disabled={disabled}
          onClick={() => onRate(grade)}
          className={`min-h-14 rounded-xl border-2 px-2 py-3 text-sm font-bold disabled:opacity-50 ${cls}`}
        >
          {label}
          <span className="mt-1 block text-xs font-medium">{nextReviewLabel(fields, grade)}</span>
        </button>
      ))}
    </div>
  );
}
