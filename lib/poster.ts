import { paintGenreIllustration } from "@/lib/posterGenreArt";

export type PosterCreateOutcome = "illustrated" | "text_fallback";

export type PosterCreateResult = {
  outcome: PosterCreateOutcome;
  /** Final composite PNG for in-app preview or manual download. */
  blob: Blob;
};

/** When Google AI is blocked or times out, we still ship a simple text keepsake. */
function posterErrorLooksLikeNetworkBlock(status: number, message: string): boolean {
  if (status === 503) return true;
  const m = message.toLowerCase();
  return (
    /timed out|blocked on the network|generativelanguage\.googleapis|api\.openai\.com|openai timed out|econnrefused|econnreset|etimedout|enotfound|fetch failed|connect timeout/i.test(
      m
    ) ||
    (status === 502 && /network|timeout|blocked/i.test(m))
  );
}

/** Save the composite poster PNG (e.g. from the flash-card “Download” action). */
export function downloadPosterPng(blob: Blob, titleForFilename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(titleForFilename)}-poster.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function renderTextOnlyPosterBlob(params: {
  title: string;
  story: string;
  genre?: string;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create poster canvas.");
  }

  const illustrationBottom = 720;
  paintGenreIllustration(ctx, canvas.width, illustrationBottom, params.genre);

  const bottomGrad = ctx.createLinearGradient(0, illustrationBottom, 1080, 1350);
  bottomGrad.addColorStop(0, "#fffbf7");
  bottomGrad.addColorStop(1, "#f2ebe3");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, illustrationBottom, canvas.width, canvas.height - illustrationBottom);

  ctx.strokeStyle = "rgba(90, 59, 46, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, illustrationBottom + 6);
  ctx.lineTo(1032, illustrationBottom + 6);
  ctx.stroke();

  const title = params.title.trim() || "Bedtime Story";
  ctx.fillStyle = "#5a3b2e";
  ctx.font = "700 58px Arial";
  wrapText(ctx, title, 72, illustrationBottom + 88, 936, 72);

  ctx.fillStyle = "#6b584f";
  ctx.font = "500 34px Arial";
  const excerpt = params.story.trim().replace(/\s+/g, " ");
  wrapText(ctx, excerpt.slice(0, 520), 72, illustrationBottom + 228, 936, 48);

  ctx.fillStyle = footerTintForGenre(params.genre);
  ctx.font = "700 28px Arial";
  ctx.fillText("Generated with Bedtime Story", 72, 1260);

  ctx.fillStyle = "rgba(107, 88, 79, 0.7)";
  ctx.font = "500 22px Arial";
  wrapText(
    ctx,
    "AI illustration wasn’t available — using simple genre artwork. Add OPENAI_API_KEY (or a working GEMINI_API_KEY) for full AI images.",
    72,
    1300,
    936,
    28
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Failed to export poster image."));
        return;
      }
      resolve(result);
    }, "image/png");
  });
}

export async function createStoryPoster(params: {
  title: string;
  story: string;
  genre?: string;
}): Promise<PosterCreateResult> {
  let res: Response;
  try {
    res = await fetch("/api/poster", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "image/png" },
      body: JSON.stringify({
        title: params.title,
        story: params.story,
        genre: params.genre,
      }),
    });
  } catch (e: unknown) {
    console.warn("[poster client] fetch /api/poster threw — using genre-art fallback", e);
    const blob = await renderTextOnlyPosterBlob(params);
    return { outcome: "text_fallback", blob };
  }

  if (!res.ok) {
    const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
    const message = errJson?.error ?? `Poster request failed (${res.status})`;
    if (posterErrorLooksLikeNetworkBlock(res.status, message)) {
      console.warn("[poster client] AI path failed (network/config) — genre-art fallback", {
        status: res.status,
        message,
      });
      const blob = await renderTextOnlyPosterBlob(params);
      return { outcome: "text_fallback", blob };
    }
    throw new Error(message);
  }

  const artBlob = await res.blob();
  const bitmap = await createImageBitmap(artBlob);

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not create poster canvas.");
  }

  const illustrationBottom = 720;
  const iw = "width" in bitmap ? bitmap.width : 0;
  const ih = "height" in bitmap ? bitmap.height : 0;
  if (iw > 0 && ih > 0) {
    drawImageCover(ctx, bitmap, 0, 0, 1080, illustrationBottom);
  } else {
    console.warn("[poster client] AI bitmap had zero size — painting genre art under text", {
      iw,
      ih,
    });
    paintGenreIllustration(ctx, canvas.width, illustrationBottom, params.genre);
  }
  bitmap.close();

  const bottomGrad = ctx.createLinearGradient(0, illustrationBottom, 1080, 1350);
  bottomGrad.addColorStop(0, "#fffbf7");
  bottomGrad.addColorStop(1, "#f2ebe3");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, illustrationBottom, canvas.width, canvas.height - illustrationBottom);

  ctx.strokeStyle = "rgba(90, 59, 46, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, illustrationBottom + 6);
  ctx.lineTo(1032, illustrationBottom + 6);
  ctx.stroke();

  ctx.fillStyle = "#5a3b2e";
  ctx.font = "700 58px Arial";
  const title = params.title.trim() || "Bedtime Story";
  wrapText(ctx, title, 72, illustrationBottom + 88, 936, 72);

  ctx.fillStyle = "#6b584f";
  ctx.font = "500 34px Arial";
  const excerpt = params.story.trim().replace(/\s+/g, " ");
  wrapText(ctx, excerpt.slice(0, 520), 72, illustrationBottom + 228, 936, 48);

  ctx.fillStyle = footerTintForGenre(params.genre);
  ctx.font = "700 28px Arial";
  ctx.fillText("Generated with Bedtime Story", 72, 1260);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Failed to export poster image."));
        return;
      }
      resolve(result);
    }, "image/png");
  });

  return { outcome: "illustrated", blob };
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const iw = "width" in img ? (img as HTMLImageElement | ImageBitmap).width : 0;
  const ih = "height" in img ? (img as HTMLImageElement | ImageBitmap).height : 0;
  if (!iw || !ih) return;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function footerTintForGenre(genre: string | undefined): string {
  const g = (genre ?? "").toLowerCase();
  if (g.includes("animal")) return "#558b2f";
  if (g.includes("adventure")) return "#e65100";
  if (g.includes("fantasy") || g.includes("magic") || g.includes("fairy")) return "#6a1b9a";
  if (g.includes("friendship")) return "#ad1457";
  if (g.includes("family")) return "#1565c0";
  if (g.includes("nature")) return "#1b5e20";
  if (g.includes("space")) return "#5c6bc0";
  if (g.includes("underwater") || g.includes("water")) return "#0277bd";
  if (g.includes("holiday")) return "#c62828";
  if (g.includes("mystery")) return "#455a64";
  if (g.includes("superhero")) return "#c62828";
  return "#6bb58a";
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
      continue;
    }
    line = testLine;
  }
  if (line) {
    ctx.fillText(line, x, currentY);
  }
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "story"
  );
}
