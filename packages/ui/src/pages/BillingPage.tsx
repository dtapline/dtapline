import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BillingPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>Billing management features are coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            We're working on bringing you a comprehensive billing management experience. Check back soon for updates on
            subscription plans, invoices, and payment methods.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
