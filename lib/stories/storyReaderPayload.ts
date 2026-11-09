import type { Story } from "@/generated/prisma/client";
import { mockProvidersEnabled } from "@/lib/providers/mockProviders";
import { mockNarrationLabelVisible } from "@/lib/stories/mockNarrationLabel";
import { storyForClient } from "@/lib/stories/storyForClient";

/**
 * What the story page may trust. `mockNarration` is computed here from the
 * server environment. A query string, request body, or field on the saved
 * story cannot turn it on. Production never enables mock providers.
 */
export function storyReaderPayload(
  row: Story,
  env: NodeJS.ProcessEnv | { MOCK_PROVIDERS?: string; VERCEL_ENV?: string } = process.env
) {
  const story = storyForClient(row) as Record<string, unknown>;
  delete story.mockNarration;
  return {
    story,
    mockNarration: mockProvidersEnabled(env),
  };
}

export { mockNarrationLabelVisible };
