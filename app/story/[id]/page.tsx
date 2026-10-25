import { RequireAuth } from "@/app/components/RequireAuth";
import { StoryReader } from "@/app/story/[id]/StoryReader";

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="cinematicRoot">
      <div className="cinematicDevice">
        <RequireAuth>
          <StoryReader storyId={id} />
        </RequireAuth>
      </div>
    </div>
  );
}
