import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/shopping")({
  head: () => ({
    meta: [
      { title: "Shopping — PalladiumAI OS" },
      { name: "description", content: "Wishlists, price tracking, orders, deliveries and a sourcing assistant that negotiates for you." },
      { property: "og:title", content: "Shopping — PalladiumAI OS" },
      { property: "og:description", content: "Wishlists, price tracking, orders, deliveries and a sourcing assistant that negotiates for you." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Shopping"
      icon={ShoppingBag}
      summary={"Wishlists, price tracking, orders, deliveries and a sourcing assistant that negotiates for you."}
      employees={31}
      missions={4}
      uptime="99.95%"
      load={27}
    />
  ),
});
