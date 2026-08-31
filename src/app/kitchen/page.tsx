"use client"

import * as React from "react"
import { KitchenItem } from "@/types/inventory"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, CheckCircle2, Save, Send } from "lucide-react"

// Initial state representing our earlier scenario:
// Morning: 0, Received: 17, Sales: 25, Actual Closing: 0 -> Variance -8 (Discrepancy / Red Flag)
const initialKitchenItems: KitchenItem[] = [
  {
    id: "k1",
    name: "Shredded Chicken (Shawarma)",
    morningStock: 0,
    receivedFromStock: 17,
    salesDeduction: 25,
    actualClosingStock: 0,
    variance: -8,
    unit: "pieces",
    date: "2026-08-22",
  },
  {
    id: "k2",
    name: "Sliced Beef",
    morningStock: 2,
    receivedFromStock: 10,
    salesDeduction: 8,
    actualClosingStock: 4,
    variance: 0,
    unit: "pieces",
    date: "2026-08-22",
  },
  {
    id: "k3",
    name: "Sweet Corn Cans",
    morningStock: 1,
    receivedFromStock: 5,
    salesDeduction: 4,
    actualClosingStock: 2,
    variance: 0,
    unit: "packs",
    date: "2026-08-22",
  },
]

export default function KitchenPage() {
  const [items, setItems] = React.useState<KitchenItem[]>(initialKitchenItems)

  // Update kitchen's manual end-of-day physical count
  const handleClosingCountChange = (id: string, count: number) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const expectedClosing = item.morningStock + item.receivedFromStock - item.salesDeduction
          const variance = count - expectedClosing
          return {
            ...item,
            actualClosingStock: count,
            variance: variance,
          }
        }
        return item
      })
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kitchen Day-to-Day Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Monitor daily stock transfers, XPS sales deductions, and physical end-of-day counts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Request Items from Main Stock
          </Button>
          <Button className="flex items-center gap-2">
            <Save className="h-4 w-4" /> Save EOD Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Shift Balance Sheet</CardTitle>
          <CardDescription>
            Formula: <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">Expected Closing = (Morning Stock + Main Stock Transfers) - XPS Sales</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-center">Morning Stock</TableHead>
                <TableHead className="text-center">+ Received (Transfers)</TableHead>
                <TableHead className="text-center">- XPS Sales</TableHead>
                <TableHead className="text-center">Expected Closing</TableHead>
                <TableHead className="text-center">Actual Physical Count</TableHead>
                <TableHead className="text-center">Variance / Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const expectedClosing = item.morningStock + item.receivedFromStock - item.salesDeduction
                const hasRedFlag = item.variance !== 0

                return (
                  <TableRow key={item.id} className={hasRedFlag ? "bg-red-50/50" : ""}>
                    <TableCell className="font-medium">
                      {item.name}
                      <span className="block text-xs text-muted-foreground">{item.unit}</span>
                    </TableCell>
                    <TableCell className="text-center">{item.morningStock}</TableCell>
                    <TableCell className="text-center text-blue-600 font-medium">
                      +{item.receivedFromStock}
                    </TableCell>
                    <TableCell className="text-center text-amber-600 font-medium">
                      -{item.salesDeduction}
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {expectedClosing}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        className="w-20 text-center mx-auto"
                        value={item.actualClosingStock}
                        onChange={(e) =>
                          handleClosingCountChange(item.id, Number(e.target.value) || 0)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {hasRedFlag ? (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1 mx-auto">
                          <AlertTriangle className="h-3 w-3" />
                          {item.variance < 0 ? `${item.variance} Deficit` : `+${item.variance} Surplus`}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex w-fit items-center gap-1 mx-auto text-emerald-600 bg-emerald-50 border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Matched
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}