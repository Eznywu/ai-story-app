import { prisma } from "@/lib/prisma";
import { jsonNoStore, requireUser } from "@/lib/auth/requireUser";
import { characterToJson, parseStoryCharacters } from "@/lib/profiles/familyRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const rows = await prisma.storyCharacter.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "asc" },
  });
  return jsonNoStore({ characters: rows.map(characterToJson) });
}

export async function PUT(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { characters?: unknown };
  let characters;
  try {
    characters = parseStoryCharacters(body.characters);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Those characters were not valid.";
    return jsonNoStore({ error: message }, 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.storyCharacter.deleteMany({ where: { userId: auth.user.id } });
    if (characters.length) {
      await tx.storyCharacter.createMany({
        data: characters.map((character) => ({
          id: character.id,
          userId: auth.user.id,
          name: character.name,
          ageRange: character.ageRange,
          gender: character.gender,
          characterType: character.characterType,
          personality: character.personality,
          skills: character.skills,
          themes: character.themes,
          visualStyle: character.visualStyle,
          updatedAt: new Date(),
        })),
      });
    }
  });

  return jsonNoStore({ characters });
}
