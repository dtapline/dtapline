import { useQuery } from "@tanstack/react-query"
import * as api from "../api/user"

export function useCurrentUser() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: () => api.getCurrentUser(),
    staleTime: 5 * 60 * 1000 // 5 minutes - user data doesn't change often
  })
}
