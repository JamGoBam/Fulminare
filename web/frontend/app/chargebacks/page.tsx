import { ChargebackHeatmap } from "@/components/ChargebackHeatmap"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ChargebacksPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex flex-col flex-1 px-4 py-8 max-w-7xl mx-auto w-full gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Chargeback Analysis</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </header>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Chargebacks by Cause × DC</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ChargebackHeatmap />
        </CardContent>
      </Card>
    </div>
  )
}
