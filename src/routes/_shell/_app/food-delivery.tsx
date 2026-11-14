import { createFileRoute } from "@tanstack/react-router";
import FoodDeliveryHub from "@/screens/FoodDeliveryHub";

export const Route = createFileRoute("/_shell/_app/food-delivery")({
  head: () => ({
    meta: [
      { title: "Food Delivery — Blackstar" },
      {
        name: "description",
        content:
          "Provider coverage and credential status for food delivery. Orders stay blocked until a certified partner adapter exists.",
      },
    ],
  }),
  component: FoodDeliveryHub,
});
