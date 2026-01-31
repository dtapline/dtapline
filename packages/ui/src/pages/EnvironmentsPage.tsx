import { EnvironmentDialog } from "@/components/dialogs/EnvironmentDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useArchiveEnvironment, useEnvironments } from "@/lib/hooks/use-environments"
import type { Environment } from "@cloud-matrix/domain/Environment"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"

export default function EnvironmentsPage() {
  const { data: environments, error, isLoading } = useEnvironments()
  const [isEnvironmentDialogOpen, setIsEnvironmentDialogOpen] = useState(false)
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | undefined>()

  const archiveEnvironment = useArchiveEnvironment()

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading environments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading environments: {error.message}</p>
        </div>
      </div>
    )
  }

  const handleEdit = (env: Environment) => {
    setEditingEnvironment(env)
    setIsEnvironmentDialogOpen(true)
  }

  const handleArchive = async (environmentId: string) => {
    if (confirm("Are you sure you want to archive this environment?")) {
      await archiveEnvironment.mutateAsync(environmentId)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Environments</h2>
          <p className="text-muted-foreground">
            Manage global environments used across all projects
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingEnvironment(undefined)
            setIsEnvironmentDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Environment
        </Button>
      </div>

      {!environments || environments.length === 0 ?
        (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground mb-4">No environments yet</p>
              <Button onClick={() => setIsEnvironmentDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first environment
              </Button>
            </CardContent>
          </Card>
        ) :
        (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {environments.map((env) => (
              <Card key={env.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {env.color && (
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: env.color }}
                        />
                      )}
                      <CardTitle>{env.displayName}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(env)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(env.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Name: {env.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Order: {env.order}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      <EnvironmentDialog
        open={isEnvironmentDialogOpen}
        onOpenChange={(open) => {
          setIsEnvironmentDialogOpen(open)
          if (!open) setEditingEnvironment(undefined)
        }}
        environment={editingEnvironment}
      />
    </div>
  )
}
