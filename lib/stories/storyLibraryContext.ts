const FETCH_CAP = 32;
const MAX_ITEMS = 8;
const EXCERPT_LEN = 200;

function langBucket(lang: string | null | undefined): string {
  const l = String(lang ?? "").toLowerCase();
  if (l.includes("zh")) return "zh";
  if (l.startsWith("en")) return "en";
  return l.split("-")[0] || "other";
}

/**
 * Compact excerpts from recently saved stories for anti-repetition in prompts.
 * Prefer same language bucket as the request; if too few, use recent stories of any language.
 */
export async function loadAntiRepeatLibraryContext(
  requestLanguage: string,
  userId: string | null = null
): Promise<string> {
  if (process.env.STORY_LIBRARY_ANTIREPEAT === "0") {
    return "";
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const bucket = langBucket(requestLanguage);
    const recent = await prisma.story.findMany({
      where: userId ? { userId } : { userId: null, dailyAutomated: true },
      orderBy: { createdAt: "desc" },
      take: FETCH_CAP,
      select: {
        title: true,
        genre: true,
        text: true,
        language: true,
      },
    });

    if (recent.length === 0) return "";

    const sameLang = recent.filter((s) => langBucket(s.language) === bucket);
    const pool = sameLang.length >= 2 ? sameLang : recent;
    const picked = pool.slice(0, MAX_ITEMS);

    const lines = picked.map((s, i) => {
      const excerpt = s.text.replace(/\s+/g, " ").trim().slice(0, EXCERPT_LEN);
      const title = (s.title?.trim() || "Untitled").slice(0, 80);
      const tail = s.text.length > EXCERPT_LEN ? "…" : "";
      return `${i + 1}. [${s.genre}] "${title}" — ${excerpt}${tail}`;
    });

    return lines.join("\n");
  } catch {
    return "";
  }
}
