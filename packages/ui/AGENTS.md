# UI Package Guidelines

React 19 dashboard for Dtapline deployment visualization.

## Quick Start

```bash
# Install dependencies (from root)
pnpm install

# Start dev server
pnpm dev
```

UI runs on http://localhost:5173

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui base components
│   ├── dialogs/        # Modal dialogs (CRUD)
│   ├── DeploymentMatrix.tsx
│   ├── EnvironmentsList.tsx
│   └── ServicesList.tsx
├── pages/              # Page components
│   ├── Dashboard.tsx
│   └── ProjectDetailPage.tsx
├── routes/             # TanStack Router routes
│   ├── index.tsx
│   └── project.$projectId.tsx
├── lib/
│   ├── api/           # API client functions
│   └── hooks/         # React Query hooks
└── main.tsx
```

## Tech Stack

- **React 19** - UI framework
- **TanStack Router** - File-based routing
- **TanStack Query (React Query)** - Data fetching & caching
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Vite** - Build tool

## Adding Components

### Use shadcn/ui Components

```bash
# Add a new shadcn component
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add card
```

Components go in `src/components/ui/`

### Create Custom Components

```typescript
// src/components/MyComponent.tsx
interface MyComponentProps {
  title: string
  onSave: () => void
}

export function MyComponent({ title, onSave }: MyComponentProps) {
  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <Button onClick={onSave}>Save</Button>
    </div>
  )
}
```

Use Tailwind utility classes for styling.

## Adding Routes

TanStack Router uses file-based routing:

```
src/routes/
├── index.tsx            → /
├── project.tsx          → /project
└── project.$projectId.tsx → /project/:projectId
```

After adding routes, restart dev server to regenerate `routeTree.gen.ts`.

### Example Route

```typescript
// src/routes/my-route.tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/my-route")({
  component: MyRouteComponent
})

function MyRouteComponent() {
  return <div>My Route Content</div>
}
```

### Route with Parameters

```typescript
// src/routes/project.$projectId.tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/project/$projectId")({
  component: ProjectDetailPage
})

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  return <div>Project {projectId}</div>
}
```

## Data Fetching

Use React Query hooks from `src/lib/hooks/`:

```typescript
import { useProjects, useProject } from "../lib/hooks/use-projects"

function MyComponent() {
  // List all projects
  const { data: projects, isLoading } = useProjects()

  // Get single project
  const { data: project } = useProject(projectId)

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {projects?.map((p) => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  )
}
```

### Creating New Hooks

```typescript
// src/lib/hooks/use-my-data.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../api"

export function useMyData() {
  return useQuery({
    queryKey: ["my-data"],
    queryFn: () => api.getMyData()
  })
}

export function useCreateMyData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateInput) => api.createMyData(input),
    onSuccess: () => {
      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ["my-data"] })
    }
  })
}
```

## API Client

API functions in `src/lib/api/`:

```typescript
// src/lib/api/my-endpoint.ts
import { client } from "./client"

export async function getMyData(): Promise<MyData[]> {
  const response = await client.get("/api/v1/my-endpoint")
  return response.data
}

export async function createMyData(input: CreateInput): Promise<MyData> {
  const response = await client.post("/api/v1/my-endpoint", input)
  return response.data
}
```

Base URL configured in `src/lib/api/client.ts`.

## Styling with Tailwind

Use utility classes:

```tsx
<div className="flex items-center justify-between rounded-lg border p-4">
  <h2 className="text-xl font-bold">Title</h2>
  <Button variant="outline">Action</Button>
</div>
```

Common patterns:

- Spacing: `p-4`, `px-8`, `py-2`, `gap-4`, `space-y-2`
- Layout: `flex`, `grid`, `items-center`, `justify-between`
- Typography: `text-xl`, `font-bold`, `text-muted-foreground`
- Colors: `bg-primary`, `text-destructive`, `border-input`
- Borders: `border`, `rounded-lg`, `border-b`

See [../../docs/react-patterns.md](../../docs/react-patterns.md) for more.

## Building

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm check
```

Build output goes to `dist/`.

## Environment Variables

```bash
# .env (optional)
VITE_API_BASE_URL=http://localhost:3000
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
```

## Common Tasks

### Add a Dialog

1. Use shadcn Dialog component
2. Create in `src/components/dialogs/`
3. Example: See `EnvironmentDialog.tsx` or `ServiceDialog.tsx`

### Add a List View

1. Fetch data with React Query hook
2. Map over data in component
3. Add CRUD buttons that open dialogs
4. Example: See `EnvironmentsList.tsx` or `ServicesList.tsx`

### Add Form Validation

Use React Hook Form + Zod:

```bash
pnpm add react-hook-form @hookform/resolvers zod
```

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1, "Name is required")
})

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema)
  })

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

## Troubleshooting

### Route Type Errors

After adding/removing routes, restart dev server to regenerate route tree.

### API Connection Failed

Check that server is running on http://localhost:3000:

```bash
cd ../api && pnpm dev
```

### Component Not Found

If importing shadcn component fails, install it:

```bash
pnpm dlx shadcn@latest add <component-name>
```
