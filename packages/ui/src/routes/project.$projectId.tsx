import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router"
import { ProjectDetailPage } from "../pages/ProjectDetailPage"

export const Route = createFileRoute("/project/$projectId")({
  component: ProjectDetail
})

function ProjectDetail() {
  const { projectId } = Route.useParams()
  const router = useRouter()
  const currentRoute = router.state.location.pathname

  // Check if we're on a child route (deployment detail)
  const isDeploymentRoute = currentRoute.includes("/deployments/")

  // If on deployment route, render the outlet
  if (isDeploymentRoute) {
    return <Outlet />
  }

  // Otherwise render the project detail page
  return <ProjectDetailPage projectId={projectId} />
}
