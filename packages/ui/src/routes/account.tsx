import AccountPage from "@/pages/AccountPage"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/account")({
  component: AccountPage
})
