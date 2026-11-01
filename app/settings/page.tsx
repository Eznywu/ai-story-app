import "@/app/page.css";
import { RequireAuth } from "@/app/components/RequireAuth";
import { SettingsScreen } from "@/app/components/SettingsScreen";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsScreen />
    </RequireAuth>
  );
}
