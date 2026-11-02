import { flashcardReviewLabel, nextReviewLabel, type ReviewIntervals, type SrsFields, type SrsGrade } from "@/lib/srs";
import { SRS_RATINGS } from "@/lib/srs-ratings";
export function SrsRatingButtons({
  fields,
  intervals,
  onRate,
  disabled = false,
}: {
  fields?: SrsFields;
  intervals?: ReviewIntervals;
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
          <span className="mt-1 block text-xs font-medium" aria-hidden={Boolean(intervals && grade === "again")}>
            {intervals && grade === "again" ? "\u00a0" : intervals ? flashcardReviewLabel(grade, intervals) : fields ? nextReviewLabel(fields, grade) : ""}
          </span>
        </button>
      ))}
    </div>
  );
}
