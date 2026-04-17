import { ImbalanceTable } from "@/components/ImbalanceTable"
import { TransferCard } from "@/components/TransferCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex flex-col flex-1 px-4 py-8 max-w-7xl mx-auto w-full gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Prince of Peace — Inventory Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <nav className="flex gap-4 text-sm pt-1">
          <Link href="/chargebacks" className="text-muted-foreground hover:text-foreground transition-colors">
            Chargeback Analysis →
          </Link>
        </nav>
      </header>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>3-DC Imbalance (top 20 SKUs)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ImbalanceTable />
        </CardContent>
      </Card>

      <TransferCard />
    </div>
  )
}
