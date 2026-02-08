import type { User } from "@dtapline/domain/User"
import { apiClient } from "./client"

export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>("/api/v1/user/me")
}
