import { useId } from "react";
const ZONES: Record<string, [number, number]> = {
  lips: [77, 144],
  "lip-teeth": [113, 123],
  teeth: [125, 95],
  ridge: [174, 61],
  postalveolar: [205, 48],
  palate: [287, 35],
  velar: [394, 71],
};
/** A location schematic; it deliberately does not pretend to animate the tongue shape. */
export function MouthMap({ zone, caption }: { zone: string; caption: string }) {
  const id = useId(),
    point = ZONES[zone];
  return (
    <figure className="rounded-xl border border-border bg-background p-3">
      <svg
        viewBox="0 0 560 270"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        className="w-full text-foreground"
      >
        <title id={`${id}-title`}>Mouth contact and narrowing zones</title>
        <desc id={`${id}-desc`}>
          {caption}. Side view: lips at the left, upper teeth, ridge, hard palate, soft palate. The
          highlighted zone is a general region.
        </desc>
        <path
          d="M60 145 L95 118 L115 90 Q145 61 180 60 Q250 15 332 36 Q405 48 440 105"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M60 160 Q95 185 135 208 Q235 255 398 223"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
        />
        <path
          d="M135 205 Q158 173 198 170 Q268 158 312 119 Q352 94 388 135 L403 216"
          className="fill-muted stroke-muted-foreground"
          strokeWidth="2"
        />
        <path
          d="M115 90 L117 124 L134 120 L132 78"
          className="fill-background"
          stroke="currentColor"
          strokeWidth="2"
        />
        <g fill="currentColor" fontSize="17">
          <text x="38" y="185">
            Lips
          </text>
          <text x="78" y="58">
            Teeth
          </text>
          <text x="156" y="32">
            Ridge
          </text>
          <text x="240" y="18">
            Hard palate
          </text>
          <text x="382" y="45">
            Soft palate
          </text>
          <text x="220" y="211">
            Tongue
          </text>
        </g>
        {point ? (
          <circle
            cx={point[0]}
            cy={point[1]}
            r="17"
            className="fill-gold stroke-foreground"
            strokeWidth="3"
          />
        ) : null}
      </svg>
      <figcaption className="text-sm">
        <p className="font-semibold">{caption}</p>
        <p className="mt-2 text-muted-foreground">
          Location guide. The tongue changes shape with the sound and neighboring vowel.
        </p>
      </figcaption>
    </figure>
  );
}
