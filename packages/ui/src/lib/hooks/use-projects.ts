import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CreateProjectInput, UpdateProjectInput } from "@cloud-matrix/domain/Project"
import { projectsApi } from "../api"

/**
 * Query Keys
 */
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: () => [...projectKeys.lists()] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  matrix: (id: string) => [...projectKeys.detail(id), "matrix"] as const,
  deployments: (id: string) => [...projectKeys.detail(id), "deployments"] as const,
}

/**
 * Get all projects
 */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      const data = await projectsApi.list()
      return data.projects
    },
  })
}

/**
 * Get a single project
 */
export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId,
  })
}

/**
 * Get deployment matrix for a project
 */
export function useProjectMatrix(projectId: string) {
  return useQuery({
    queryKey: projectKeys.matrix(projectId),
    queryFn: () => projectsApi.getMatrix(projectId),
    enabled: !!projectId,
  })
}

/**
 * Create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: typeof CreateProjectInput.Type) =>
      projectsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/**
 * Update a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string
      input: typeof UpdateProjectInput.Type
    }) => projectsApi.update(projectId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/**
 * Delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => projectsApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}
