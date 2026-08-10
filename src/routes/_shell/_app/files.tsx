import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
import Screen from "@/screens/Files";

export const Route = createFileRoute("/_shell/_app/files")({
  head: () => ({
    meta: [
      { title: "Files — PalladiumAI" },
      { name: "description", content: "Every file your workforce creates or uses." },
      { property: "og:title", content: "Files — PalladiumAI" },
      { property: "og:description", content: "Every file your workforce creates or uses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screen as unknown as () => React.ReactElement,
});
