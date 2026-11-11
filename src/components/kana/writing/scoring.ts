export interface ScoreResult {
  score: number;
  coverage: number;
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
  label: string;
}

const FONT_STACK = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Meiryo", serif';
const CANVAS_SIZE = 300;

export function setFittedWritingFont(
  ctx: Pick<CanvasRenderingContext2D, "font" | "measureText">,
  text: string,
  size: number,
) {
  let fontSize = Math.floor(size * 0.72);
  ctx.font = `${fontSize}px ${FONT_STACK}`;
  const width = ctx.measureText(text).width;
  const available = size * 0.88;
  if (width > available) {
    fontSize = Math.max(1, Math.floor((fontSize * available) / width));
    ctx.font = `${fontSize}px ${FONT_STACK}`;
  }
  return fontSize;
}

export function scoreDrawing(
  userCanvas: HTMLCanvasElement,
  char: string,
  opts: { rightHalfOnly?: boolean } = {},
): ScoreResult {
  const off = document.createElement("canvas");
  off.width = CANVAS_SIZE;
  off.height = CANVAS_SIZE;
  const ctx = off.getContext("2d")!;

  setFittedWritingFont(ctx, char, CANVAS_SIZE);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  ctx.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

  const tData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const uCtx = userCanvas.getContext("2d")!;
  const uData = uCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const xStart = opts.rightHalfOnly ? Math.floor(CANVAS_SIZE / 2) : 0;

  let templatePx = 0;
  let matchedPx = 0;
  let extraPx = 0;

  for (let py = 0; py < CANVAS_SIZE; py++) {
    for (let px = xStart; px < CANVAS_SIZE; px++) {
      const idx = (py * CANVAS_SIZE + px) * 4;
      const isTemplate = tData.data[idx + 3] > 40;
      const isUser = uData.data[idx + 3] > 40;
      if (isTemplate) templatePx++;
      if (isTemplate && isUser) matchedPx++;
      if (!isTemplate && isUser) extraPx++;
    }
  }

  if (templatePx === 0) {
    return { score: 0, coverage: 0, accuracy: 0, stars: 0, label: "Nothing drawn" };
  }

  const coverage = matchedPx / templatePx;
  // Extra penalty is proportional — going 50% over the template area costs 25 points
  const extraRatio = extraPx / (templatePx * 2);
  const accuracy = Math.max(0, 1 - extraRatio);
  const score = Math.min(100, Math.round(coverage * 75 + accuracy * 25));
  const stars: 0 | 1 | 2 | 3 = score >= 75 ? 3 : score >= 55 ? 2 : score >= 35 ? 1 : 0;
  const label =
    stars === 3
      ? "Excellent!"
      : stars === 2
        ? "Good!"
        : stars === 1
          ? "Keep practising"
          : "Try again";

  return {
    score,
    coverage: Math.round(coverage * 100),
    accuracy: Math.round(accuracy * 100),
    stars,
    label,
  };
}

export function drawGridOnCanvas(ctx: CanvasRenderingContext2D, size: number) {
  ctx.strokeStyle = "rgba(80, 140, 200, 0.28)";
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 4]);
  // center cross
  ctx.beginPath();
  ctx.moveTo(size / 2, 6);
  ctx.lineTo(size / 2, size - 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, size / 2);
  ctx.lineTo(size - 6, size / 2);
  ctx.stroke();
  // diagonals
  ctx.strokeStyle = "rgba(80, 140, 200, 0.13)";
  ctx.beginPath();
  ctx.moveTo(6, 6);
  ctx.lineTo(size - 6, size - 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size - 6, 6);
  ctx.lineTo(6, size - 6);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function renderGuideToCanvas(
  canvas: HTMLCanvasElement,
  char: string,
  guideAlpha: number,
  rightAlpha?: number,
) {
  const ctx = canvas.getContext("2d")!;
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  drawGridOnCanvas(ctx, size);

  setFittedWritingFont(ctx, char, size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (rightAlpha !== undefined) {
    // Left half at guideAlpha
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, size / 2, size);
    ctx.clip();
    ctx.globalAlpha = guideAlpha;
    ctx.fillStyle = "#1a5fa8";
    ctx.fillText(char, size / 2, size / 2);
    ctx.restore();

    // Right half at rightAlpha (variable during fade)
    ctx.save();
    ctx.beginPath();
    ctx.rect(size / 2, 0, size / 2, size);
    ctx.clip();
    ctx.globalAlpha = rightAlpha;
    ctx.fillStyle = rightAlpha > 0.3 ? "#1a1a2e" : "#1a5fa8";
    ctx.fillText(char, size / 2, size / 2);
    ctx.restore();
  } else {
    ctx.globalAlpha = guideAlpha;
    ctx.fillStyle = "#1a5fa8";
    ctx.fillText(char, size / 2, size / 2);
    ctx.globalAlpha = 1;
  }
}
