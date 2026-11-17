import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cinema")({
  beforeLoad: () => {
    throw redirect({ href: "/cinema-studio", statusCode: 308 });
  },
});
