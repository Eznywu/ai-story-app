import { HomeApp } from "@/app/components/HomeApp";

export default function Page() {
  return (
    <div className="cinematicRoot">
      <div className="cinematicDevice">
        <HomeApp uiMode="mobile" />
      </div>
    </div>
  );
}
