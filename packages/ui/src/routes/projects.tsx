import ProjectsListPage from "@/pages/ProjectsListPage"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/projects")({
  component: ProjectsListPage
})
