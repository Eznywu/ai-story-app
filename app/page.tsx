import { HomeApp } from "@/app/components/HomeApp";
import { RequireAuth } from "@/app/components/RequireAuth";

export default function Page() {
  return (
    <div className="cinematicRoot">
      <div className="cinematicDevice">
        <RequireAuth>
          <HomeApp uiMode="mobile" />
        </RequireAuth>
      </div>
    </div>
  );
}
