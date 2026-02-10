import { createFileRoute } from "@tanstack/react-router"
import { DeploymentDetailPage } from "../pages/DeploymentDetailPage"

export const Route = createFileRoute("/project/$projectId/deployments/$deploymentId")({
  component: DeploymentDetailPage
})
