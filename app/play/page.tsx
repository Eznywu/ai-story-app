import { RequireAuth } from "@/app/components/RequireAuth";
import { PlayPageClient } from "./PlayPageClient";

export default function PlayPage() {
  return (
    <RequireAuth>
      <PlayPageClient />
    </RequireAuth>
  );
}
