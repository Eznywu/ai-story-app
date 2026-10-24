import { HomeApp } from "@/app/components/HomeApp";
import { RequireAuth } from "@/app/components/RequireAuth";

export default function DesktopUiPage() {
  return (
    <RequireAuth>
      <HomeApp uiMode="desktop" />
    </RequireAuth>
  );
}
