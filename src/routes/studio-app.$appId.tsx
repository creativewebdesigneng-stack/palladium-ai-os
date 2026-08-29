import { createFileRoute } from "@tanstack/react-router";
import PublishedStudioApp from "@/screens/PublishedStudioApp";

export const Route = createFileRoute("/studio-app/$appId")({
  head: () => ({
    meta: [
      { title: "Published App — PalladiumAI App Studio" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: StudioAppRoute,
});

function StudioAppRoute() {
  const { appId } = Route.useParams();
  return <PublishedStudioApp appId={appId} />;
}
