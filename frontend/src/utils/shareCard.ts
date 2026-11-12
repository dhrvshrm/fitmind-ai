/**
 * Draws the shareable weekly summary as a PNG in the browser (canvas only,
 * no libraries, nothing sent to a server). The caller decides which lines
 * go on the card, so health details only appear when the user turns them on.
 */

export type ShareCardColors = {
  start: string;
  end: string;
  text: string;
  muted: string;
  accent: string;
};

export type ShareCardContent = {
  brand: string;
  heading: string;
  range: string;
  lines: string[];
  footer: string;
  fontFamily: string;
};

const WIDTH = 1080;
const HEIGHT = 1350;
const PADDING = 96;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Renders the card and returns its canvas (for a preview URL or a PNG blob). */
export function drawShareCard(content: ShareCardContent, colors: ShareCardColors): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, colors.start);
  gradient.addColorStop(1, colors.end);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = colors.text;
  ctx.textBaseline = 'top';
  ctx.font = `700 40px ${content.fontFamily}`;
  ctx.fillText(content.brand, PADDING, PADDING);

  ctx.font = `800 96px ${content.fontFamily}`;
  ctx.fillText(content.heading, PADDING, PADDING + 120);
  ctx.fillStyle = colors.muted;
  ctx.font = `500 40px ${content.fontFamily}`;
  ctx.fillText(content.range, PADDING, PADDING + 240);

  const rowHeight = 132;
  const top = PADDING + 340;
  content.lines.slice(0, 6).forEach((line, i) => {
    const y = top + i * (rowHeight + 20);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    roundedRect(ctx, PADDING, y, WIDTH - PADDING * 2, rowHeight, 28);
    ctx.fill();
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(PADDING + 56, y + rowHeight / 2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.font = `600 46px ${content.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(line, PADDING + 100, y + rowHeight / 2, WIDTH - PADDING * 2 - 140);
    ctx.textBaseline = 'top';
  });

  ctx.fillStyle = colors.muted;
  ctx.font = `500 34px ${content.fontFamily}`;
  ctx.fillText(content.footer, PADDING, HEIGHT - PADDING - 34);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Shares the image with the Web Share API when the browser can share files. */
export async function shareImage(blob: Blob, fileName: string, title: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return false;
  await nav.share({ files: [file], title });
  return true;
}

export function canShareFiles(): boolean {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (!nav.share || !nav.canShare) return false;
  try {
    return nav.canShare({ files: [new File([], 'probe.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
