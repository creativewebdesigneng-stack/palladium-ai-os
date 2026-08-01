import { createFileRoute } from "@tanstack/react-router";
import { Banknote } from "lucide-react";
import { DepartmentView } from "@/components/os/department-view";

export const Route = createFileRoute("/app/finance")({
  head: () => ({
    meta: [
      { title: "Finance — PalladiumAI OS" },
      { name: "description", content: "Income, expenses, budgets, savings, investments, subscriptions and business cash flow, all managed autonomously." },
      { property: "og:title", content: "Finance — PalladiumAI OS" },
      { property: "og:description", content: "Income, expenses, budgets, savings, investments, subscriptions and business cash flow, all managed autonomously." },
    ],
  }),
  component: () => (
    <DepartmentView
      name="Finance"
      icon={Banknote}
      summary={"Income, expenses, budgets, savings, investments, subscriptions and business cash flow, all managed autonomously."}
      employees={76}
      missions={8}
      uptime="99.97%"
      load={64}
    />
  ),
});
