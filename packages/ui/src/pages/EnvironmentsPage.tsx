import { EnvironmentsList } from "@/components/EnvironmentsList"

export default function EnvironmentsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Environments</h2>
        <p className="text-muted-foreground">
          Manage global environments used across all projects. Drag to reorder.
        </p>
      </div>

      <EnvironmentsList />
    </div>
  )
}
