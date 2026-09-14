import { createFileRoute } from "@tanstack/react-router";
import Screen from "@/screens/ProjectRepository";

function RepositoryPage() {
  return <div className="blackstar-core-page blackstar-longtail-page blackstar-project-repository"><Screen /></div>;
}

export const Route = createFileRoute("/_shell/_app/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project Repository — Blackstar" },
      { name: "description", content: "Browse files, commit history and collaborators for a Blackstar project repository." },
      { property: "og:title", content: "Project Repository — Blackstar" },
      { property: "og:description", content: "Browse files, commit history and collaborators for a Blackstar project repository." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RepositoryPage,
});
