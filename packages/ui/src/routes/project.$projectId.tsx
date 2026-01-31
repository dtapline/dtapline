import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/project/$projectId')({
  component: ProjectDetail,
})

function ProjectDetail() {
  const { projectId } = Route.useParams()

  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold mb-4">Project: {projectId}</h2>
      <p>Project details and deployment matrix will go here.</p>
    </div>
  )
}
