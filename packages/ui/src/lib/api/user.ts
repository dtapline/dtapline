import type { User } from "@cloud-matrix/domain/User"
import { apiClient } from "./client"

export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>("/api/v1/user/me")
}
