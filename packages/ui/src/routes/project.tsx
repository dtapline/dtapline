import { createFileRoute } from '@tanstack/react-router'
import ProjectSettingsPage from '@/pages/ProjectSettingsPage'

export const Route = createFileRoute('/project')({
  component: ProjectSettingsPage,
})

