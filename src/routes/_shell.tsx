import { createFileRoute } from "@tanstack/react-router";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/_shell")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />,
});
