export type LibraryFilterId = "all" | "stories" | "posters";

export type LibrarySource = {
  id: string;
  text: string;
  createdAt: string;
  audioUrl?: string | null;
  posterUrl?: string | null;
  posterSaved?: boolean;
  posterSavedAt?: string | null;
};

export type LibraryEntry<T extends LibrarySource = LibrarySource> = {
  key: string;
  kind: "story" | "poster";
  item: T;
  sortAt: string;
};

export function libraryView<T extends LibrarySource>(items: T[], filter: LibraryFilterId) {
  const stories: LibraryEntry<T>[] = items
    .filter((item) => item.text.trim().length > 0)
    .map((item) => ({
      key: `${item.id}:story`,
      kind: "story" as const,
      item,
      sortAt: item.createdAt || "",
    }));
  const posters: LibraryEntry<T>[] = items
    .filter((item) => item.posterSaved === true && Boolean(item.posterUrl?.trim()))
    .map((item) => ({
      key: `${item.id}:poster`,
      kind: "poster" as const,
      item,
      sortAt: item.posterSavedAt || item.createdAt || "",
    }));
  const counts = {
    all: stories.length + posters.length,
    stories: stories.length,
    posters: posters.length,
  };
  const chosen = filter === "stories" ? stories : filter === "posters" ? posters : [...stories, ...posters];
  const entries = chosen
    .slice()
    .sort((a, b) => b.sortAt.localeCompare(a.sortAt) || a.key.localeCompare(b.key));
  return { entries, counts };
}
