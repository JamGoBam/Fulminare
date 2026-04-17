import { ImbalanceTable } from "@/components/ImbalanceTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex flex-col flex-1 px-4 py-8 max-w-7xl mx-auto w-full gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Prince of Peace — Inventory Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </header>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>3-DC Imbalance (top 20 SKUs)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ImbalanceTable />
        </CardContent>
      </Card>
    </div>
  )
}
