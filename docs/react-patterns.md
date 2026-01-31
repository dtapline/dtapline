# React Patterns

## Component Structure

**Functional components:**
```typescript
export function Button({ variant = "default", ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }))} {...props} />
}
```

**Component props:**
```typescript
interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: "default" | "ghost"
}
```

**Type imports:**
```typescript
import type { LucideIcon } from "lucide-react"
```

## Styling

**Variant-based styling with CVA:**
```typescript
const buttonVariants = cva("base-classes", {
  variants: { variant: { default: "...", ghost: "..." } }
})
```

**Class name merging:**
```typescript
import { cn } from "@/lib/utils"

<div className={cn("base", "conditional")} />
```

## Error Handling

- Use standard try/catch for async operations
- Use error boundaries for component errors
