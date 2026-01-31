import EnvironmentsPage from "@/pages/EnvironmentsPage"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/environments")({
  component: EnvironmentsPage
})
