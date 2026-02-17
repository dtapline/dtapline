import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Environment } from "@dtapline/domain/Environment"
import { GripVertical } from "lucide-react"
import { useState } from "react"
import { useArchiveEnvironment, useEnvironments, useReorderEnvironment } from "../lib/hooks/use-environments"
import { EnvironmentDialog } from "./dialogs/EnvironmentDialog"
import { Alert, AlertDescription } from "./ui/alert"
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
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const { data: environments, isLoading } = useEnvironments()
  const archiveMutation = useArchiveEnvironment()
  const reorderMutation = useReorderEnvironment()

  // Sort environments by order
  const sortedEnvironments = environments?.slice().sort((a, b) => a.order - b.order) || []

  // Set up drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = sortedEnvironments.findIndex((env) => env.id === active.id)
    const newIndex = sortedEnvironments.findIndex((env) => env.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Single atomic API call to reorder
    reorderMutation.mutate({
      environmentId: active.id as string,
      newOrder: newIndex
    })
  }

  const handleArchive = () => {
    if (!archivingEnvironment) return
    setArchiveError(null)

    archiveMutation.mutate(archivingEnvironment.id, {
      onSuccess: () => {
        setArchivingEnvironment(null)
      },
      onError: (err: Error) => {
        setArchiveError(err.message || "Failed to archive environment")
      }
    })
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedEnvironments.map((env) => env.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedEnvironments.map((env) => (
                  <EnvironmentItem
                    key={env.id}
                    environment={env}
                    onEdit={() => setEditingEnvironment(env)}
                    onArchive={() => setArchivingEnvironment(env)}
                    canEdit={true}
                    canArchive={true}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

      <EnvironmentDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <EnvironmentDialog
        environment={editingEnvironment}
        open={!!editingEnvironment}
        onOpenChange={(open) => !open && setEditingEnvironment(null)}
      />

      <AlertDialog
        open={!!archivingEnvironment}
        onOpenChange={() => {
          setArchivingEnvironment(null)
          setArchiveError(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Environment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{archivingEnvironment?.name}"? Archived environments can be restored
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {archiveError && (
            <Alert variant="destructive">
              <AlertDescription>{archiveError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleArchive()
              }}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface EnvironmentItemProps {
  environment: Environment
  onEdit: () => void
  onArchive: () => void
  canEdit: boolean
  canArchive: boolean
}

function EnvironmentItem({ canArchive, canEdit, environment, onArchive, onEdit }: EnvironmentItemProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: environment.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-background p-4 hover:border-primary/50 transition-colors"
    >
      <button
        type="button"
        className="flex-shrink-0 cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center gap-4">
        {environment.color && <div className="h-4 w-4 rounded-full" style={{ backgroundColor: environment.color }} />}
        <div>
          <h3 className="font-medium">{environment.name}</h3>
          <p className="text-sm text-muted-foreground">{environment.slug}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} disabled={!canEdit}>
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onArchive} disabled={!canArchive}>
          Archive
        </Button>
      </div>
    </div>
  )
}
