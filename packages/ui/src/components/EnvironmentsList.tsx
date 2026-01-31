import type { Environment } from "@cloud-matrix/domain/Environment"
import type { DragEndEvent } from "@dnd-kit/core"
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { useState } from "react"
import { useArchiveEnvironment, useEnvironments, useUpdateEnvironment } from "../lib/hooks/use-environments"
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
  const updateMutation = useUpdateEnvironment()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // Require 8px movement before dragging starts
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Sort environments by order for display
  const sortedEnvironments = environments?.slice().sort((a, b) => a.order - b.order) || []

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = sortedEnvironments.findIndex((env) => env.id === active.id)
    const newIndex = sortedEnvironments.findIndex((env) => env.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Reorder the array
    const reordered = arrayMove(sortedEnvironments, oldIndex, newIndex)

    // Update order for all affected environments
    reordered.forEach((env, index) => {
      if (env.order !== index) {
        updateMutation.mutate({
          environmentId: env.id,
          input: { order: index }
        })
      }
    })
  }

  const handleArchive = () => {
    if (!archivingEnvironment) return

    archiveMutation.mutate(archivingEnvironment.id, {
      onSuccess: () => {
        setArchivingEnvironment(null)
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
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Drag and drop to reorder environments
        </p>
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
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

      <EnvironmentDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

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

interface EnvironmentItemProps {
  environment: Environment
  onEdit: () => void
  onArchive: () => void
}

function EnvironmentItem({ environment, onArchive, onEdit }: EnvironmentItemProps) {
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
      className="group flex items-center gap-3 rounded-lg border bg-background p-4 hover:border-primary/50 transition-colors select-none cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-5 w-5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {environment.color && (
          <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: environment.color }} />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate">{environment.displayName}</h3>
          <p className="text-sm text-muted-foreground truncate">
            Name: {environment.name} • Order: {environment.order}
          </p>
        </div>
      </div>
      <div
        className="flex gap-2 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onArchive}>
          Archive
        </Button>
      </div>
    </div>
  )
}
