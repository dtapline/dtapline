import { createFileRoute } from '@tanstack/react-router'
import { ProjectDetailPage } from '../pages/ProjectDetailPage'

export const Route = createFileRoute('/project/$projectId')({
  component: ProjectDetail,
})

function ProjectDetail() {
  const { projectId } = Route.useParams()

  return <ProjectDetailPage projectId={projectId} />
}
