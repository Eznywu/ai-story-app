/** Client-side genre decoration when AI image isn’t available (network, keys, etc.). */

type Theme = {
  stops: { t: number; c: string }[];
  draw: (ctx: CanvasRenderingContext2D) => void;
};

function pickTheme(genre: string): Theme {
  const g = genre.toLowerCase();
  const m = (labels: string[]) => labels.some((l) => g.includes(l) || l === g);

  if (m(["animals", "animal"]))
    return {
      stops: [
        { t: 0, c: "#e8f5e0" },
        { t: 0.55, c: "#c8e6c9" },
        { t: 1, c: "#8bc34a" },
      ],
      draw: drawAnimals,
    };
  if (m(["adventure"]))
    return {
      stops: [
        { t: 0, c: "#ffe0b2" },
        { t: 0.5, c: "#ffcc80" },
        { t: 1, c: "#ef6c00" },
      ],
      draw: drawAdventure,
    };
  if (m(["fantasy"]))
    return {
      stops: [
        { t: 0, c: "#e1bee7" },
        { t: 0.45, c: "#ce93d8" },
        { t: 1, c: "#7b1fa2" },
      ],
      draw: drawFantasy,
    };
  if (m(["friendship", "friend"]))
    return {
      stops: [
        { t: 0, c: "#fce4ec" },
        { t: 0.55, c: "#f48fb1" },
        { t: 1, c: "#c2185b" },
      ],
      draw: drawFriendship,
    };
  if (m(["family"]))
    return {
      stops: [
        { t: 0, c: "#e3f2fd" },
        { t: 0.5, c: "#90caf9" },
        { t: 1, c: "#1976d2" },
      ],
      draw: drawFamily,
    };
  if (m(["magic"]))
    return {
      stops: [
        { t: 0, c: "#ede7f6" },
        { t: 0.5, c: "#b39ddb" },
        { t: 1, c: "#5e35b1" },
      ],
      draw: drawMagic,
    };
  if (m(["nature"]))
    return {
      stops: [
        { t: 0, c: "#e8f5e9" },
        { t: 0.45, c: "#81c784" },
        { t: 1, c: "#2e7d32" },
      ],
      draw: drawNature,
    };
  if (m(["space"]))
    return {
      stops: [
        { t: 0, c: "#1a237e" },
        { t: 0.55, c: "#3949ab" },
        { t: 1, c: "#0d1642" },
      ],
      draw: drawSpace,
    };
  if (m(["underwater", "water"]))
    return {
      stops: [
        { t: 0, c: "#b3e5fc" },
        { t: 0.5, c: "#4fc3f7" },
        { t: 1, c: "#01579b" },
      ],
      draw: drawUnderwater,
    };
  if (m(["holiday"]))
    return {
      stops: [
        { t: 0, c: "#ffebee" },
        { t: 0.45, c: "#ef9a9a" },
        { t: 1, c: "#c62828" },
      ],
      draw: drawHoliday,
    };
  if (m(["fairy", "tale"]))
    return {
      stops: [
        { t: 0, c: "#fff8e1" },
        { t: 0.5, c: "#ffd54f" },
        { t: 1, c: "#f9a825" },
      ],
      draw: drawFairyTale,
    };
  if (m(["mystery"]))
    return {
      stops: [
        { t: 0, c: "#eceff1" },
        { t: 0.55, c: "#78909c" },
        { t: 1, c: "#37474f" },
      ],
      draw: drawMystery,
    };
  if (m(["superhero", "super"]))
    return {
      stops: [
        { t: 0, c: "#ffebee" },
        { t: 0.4, c: "#e53935" },
        { t: 1, c: "#b71c1c" },
      ],
      draw: drawSuperhero,
    };

  return {
    stops: [
      { t: 0, c: "#e8eaf6" },
      { t: 0.5, c: "#9fa8da" },
      { t: 1, c: "#303f9f" },
    ],
    draw: drawBedtimeClassic,
  };
}

export function paintGenreIllustration(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  genre?: string
) {
  const theme = pickTheme((genre ?? "").trim() || "bedtime");
  const grad = ctx.createLinearGradient(0, 0, width, height);
  theme.stops.forEach((s) => grad.addColorStop(s.t, s.c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height * 0.45);
  theme.draw(ctx);
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = (i * Math.PI) / 5 - Math.PI / 2;
    const dist = i % 2 === 0 ? r : r * 0.45;
    const px = Math.cos(rad) * dist;
    const py = Math.sin(rad) * dist;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawAnimals(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 3; i++) {
    const px = -120 + i * 110;
    ctx.beginPath();
    ctx.ellipse(px, 40, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px - 18, 22, 8, 14, -0.3, 0, Math.PI * 2);
    ctx.ellipse(px + 18, 22, 8, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAdventure(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.moveTo(-200, 40);
  ctx.lineTo(-80, -60);
  ctx.lineTo(20, 20);
  ctx.lineTo(120, -80);
  ctx.lineTo(220, 50);
  ctx.lineTo(-200, 50);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffcc80";
  ctx.beginPath();
  ctx.arc(140, -100, 48, 0, Math.PI * 2);
  ctx.fill();
}

function drawFantasy(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(-30, -120, 60, 140);
  ctx.beginPath();
  ctx.moveTo(-70, -120);
  ctx.lineTo(0, -200);
  ctx.lineTo(70, -120);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, -150 + i * 70, -40 + (i % 2) * 25, 10, "rgba(255,255,255,0.6)");
  }
}

function drawFriendship(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(-20, 25);
  ctx.bezierCurveTo(-80, -40, -80, -80, -10, -70);
  ctx.bezierCurveTo(10, -95, 50, -95, 20, 25);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(20, 25);
  ctx.bezierCurveTo(80, -40, 80, -80, 10, -70);
  ctx.bezierCurveTo(-5, -95, -55, -90, -20, 25);
  ctx.closePath();
  ctx.fill();
}

function drawFamily(ctx: CanvasRenderingContext2D) {
  ctx.translate(0, 30);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(-80, 20);
  ctx.lineTo(-80, -50);
  ctx.lineTo(0, -90);
  ctx.lineTo(80, -50);
  ctx.lineTo(80, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ff7043";
  ctx.beginPath();
  ctx.arc(0, -35, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawMagic(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-120, 60);
  ctx.lineTo(80, -80);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 1.2 - 0.5;
    const r = 100 + (i % 3) * 28;
    drawStar(ctx, Math.cos(a) * r, Math.sin(a) * r - 20, 12 + (i % 2) * 4, "rgba(255,255,255,0.55)");
  }
}

function drawNature(ctx: CanvasRenderingContext2D) {
  ctx.translate(0, 60);
  ctx.fillStyle = "rgba(45, 90, 45, 0.35)";
  ctx.fillRect(-240, 20, 480, 40);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.moveTo(0, -140);
  ctx.lineTo(-70, 20);
  ctx.lineTo(70, 20);
  ctx.closePath();
  ctx.fill();
}

function drawSpace(ctx: CanvasRenderingContext2D) {
  for (let i = 0; i < 16; i++) {
    const sx = ((i * 47) % 360) - 180;
    const sy = ((i * 61) % 200) - 100;
    ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 5) * 0.1})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#7986cb";
  ctx.beginPath();
  ctx.arc(-80, 20, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(-80, 20, 78, 28, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffd54f";
  ctx.beginPath();
  ctx.arc(140, -60, 36, 0, Math.PI * 2);
  ctx.fill();
}

function drawUnderwater(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 70, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#01579b";
  ctx.beginPath();
  ctx.arc(-25, -5, 6, 0, Math.PI * 2);
  ctx.arc(25, -5, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawHoliday(ctx: CanvasRenderingContext2D) {
  ctx.translate(0, 20);
  ctx.fillStyle = "rgba(45, 100, 45, 0.65)";
  ctx.beginPath();
  ctx.moveTo(0, -160);
  ctx.lineTo(-90, 30);
  ctx.lineTo(90, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(-22, 30, 44, 55);
}

function drawFairyTale(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(0, -130);
  ctx.lineTo(-100, 40);
  ctx.lineTo(100, 40);
  ctx.closePath();
  ctx.fill();
  drawStar(ctx, 0, -150, 22, "rgba(255,255,255,0.8)");
}

function drawMystery(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(20, 0, 75, -0.9, 0.9);
  ctx.stroke();
}

function drawSuperhero(ctx: CanvasRenderingContext2D) {
  ctx.translate(0, 10);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(0, -100);
  ctx.lineTo(-120, 80);
  ctx.lineTo(0, 40);
  ctx.lineTo(120, 80);
  ctx.closePath();
  ctx.fill();
  drawStar(ctx, 0, -30, 36, "rgba(255,255,100,0.9)");
}

function drawBedtimeClassic(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(40, -40, 68, 0.2, Math.PI * 1.2, true);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    drawStar(ctx, -140 + i * 52, 30 + (i % 2) * 18, 8 + (i % 3), "rgba(255,255,255,0.65)");
  }
}
