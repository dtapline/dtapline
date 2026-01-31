import type { Environment } from "@cloud-matrix/domain/Environment"
import { useState } from "react"
import { useArchiveEnvironment, useEnvironments } from "../lib/hooks/use-environments"
import { EnvironmentDialog } from "./dialogs/EnvironmentDialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "./ui/alert-dialog"
import { Button } from "./ui/button"

export function EnvironmentsList() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null)
  const [archivingEnvironment, setArchivingEnvironment] = useState<Environment | null>(null)

  const { data: environments, isLoading } = useEnvironments()
  const archiveMutation = useArchiveEnvironment()

  const handleArchive = () => {
    if (!archivingEnvironment) return

    archiveMutation.mutate(
      archivingEnvironment.id,
      {
        onSuccess: () => {
          setArchivingEnvironment(null)
        }
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading environments...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>Add Environment</Button>
      </div>

      {!environments || environments.length === 0 ?
        (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No environments yet. Add your first environment to start tracking deployments.
            </p>
          </div>
        ) :
        (
          <div className="space-y-2">
            {environments
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((env) => (
                <div
                  key={env.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    {env.color && (
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: env.color }}
                      />
                    )}
                    <div>
                      <h3 className="font-medium">{env.displayName}</h3>
                      <p className="text-sm text-muted-foreground">{env.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingEnvironment(env)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setArchivingEnvironment(env)}
                    >
                      Archive
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

      <EnvironmentDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <EnvironmentDialog
        environment={editingEnvironment ?? undefined}
        open={!!editingEnvironment}
        onOpenChange={(open) => !open && setEditingEnvironment(null)}
      />

      <AlertDialog open={!!archivingEnvironment} onOpenChange={() => setArchivingEnvironment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Environment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{archivingEnvironment?.displayName}"? Archived environments can be
              restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
