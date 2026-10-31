import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import { kidToJson, parseKidProfiles } from "@/lib/profiles/familyRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const rows = await prisma.kidProfile.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "asc" },
  });
  return jsonNoStore({ kids: rows.map(kidToJson) });
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { kids?: unknown };
  let kids;
  try {
    kids = parseKidProfiles(body.kids);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Those kid profiles were not valid.";
    return jsonNoStore({ error: message }, 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.kidProfile.deleteMany({ where: { userId: auth.user.id } });
    if (kids.length) {
      await tx.kidProfile.createMany({
        data: kids.map((kid) => ({
          id: kid.id,
          userId: auth.user.id,
          name: kid.name,
          age: kid.age,
          gender: kid.gender,
          interests: kid.interests,
          personality: kid.personality ?? null,
          readingLevel: kid.readingLevel ?? null,
          favoriteThemes: kid.favoriteThemes ?? null,
          bedtimeLength: kid.bedtimeLength ?? null,
          updatedAt: new Date(),
        })),
      });
    }
  });

  return jsonNoStore({ kids });
}
