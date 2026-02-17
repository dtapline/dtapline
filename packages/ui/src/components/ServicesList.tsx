import type { Service } from "@dtapline/domain/Service"
import { ExternalLink } from "lucide-react"
import { useState } from "react"
import { useArchiveService, useServices } from "../lib/hooks/use-services"
import { ServiceDialog } from "./dialogs/ServiceDialog"
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

interface ServicesListProps {
  projectId: string
}

export function ServicesList({ projectId }: ServicesListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [archivingService, setArchivingService] = useState<Service | null>(null)

  const { data: services, isLoading } = useServices(projectId)
  const archiveMutation = useArchiveService()

  const handleArchive = () => {
    if (!archivingService) return

    archiveMutation.mutate(
      {
        projectId,
        serviceId: archivingService.id
      },
      {
        onSuccess: () => {
          setArchivingService(null)
        }
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading services...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>Add Service</Button>
      </div>

      {!services || services.length === 0 ?
        (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No services yet. Add your first service to start tracking deployments.
            </p>
          </div>
        ) :
        (
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <h3 className="font-medium">{service.name}</h3>
                  <p className="text-sm text-muted-foreground">{service.slug}</p>
                  {service.repositoryUrl && (
                    <a
                      href={service.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View Repository <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingService(service)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setArchivingService(service)}>
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

      <ServiceDialog projectId={projectId} open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <ServiceDialog
        projectId={projectId}
        service={editingService}
        open={!!editingService}
        onOpenChange={(open: boolean) => !open && setEditingService(null)}
      />

      <AlertDialog open={!!archivingService} onOpenChange={() => setArchivingService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{archivingService?.name}"? Archived services can be restored later.
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
