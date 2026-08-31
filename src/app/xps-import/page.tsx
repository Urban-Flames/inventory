"use client"

import * as React from "react"
import { XPSSalesRecord, InventoryRedFlag } from "@/types/inventory"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, FileUp, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react"

// Recipe matrix matching XPS items to raw inventory deductions
const recipeBook: Record<string, { ingredientId: string; ingredientName: string; qtyPerPortion: number }> = {
  "Chicken Shawarma": { ingredientId: "k1", ingredientName: "Shredded Chicken", qtyPerPortion: 1 },
  "Beef Shawarma": { ingredientId: "k2", ingredientName: "Sliced Beef", qtyPerPortion: 1 },
  "Sweet Corn Bowl": { ingredientId: "k3", ingredientName: "Sweet Corn Cans", qtyPerPortion: 0.5 },
}

export default function XPSImportPage() {
  const [rawText, setRawText] = React.useState<string>(
    `Item Name,Quantity Sold,Date\nChicken Shawarma,25,2026-08-22\nBeef Shawarma,8,2026-08-22`
  )
  const [processedSales, setProcessedSales] = React.useState<XPSSalesRecord[]>([])
  const [redFlags, setRedFlags] = React.useState<InventoryRedFlag[]>([])
  const [isProcessed, setIsProcessed] = React.useState<boolean>(false)

  // Parse XPS data & run audit against kitchen availability
  const processXpsData = () => {
    const lines = rawText.trim().split("\n")
    const salesData: XPSSalesRecord[] = []
    const flags: InventoryRedFlag[] = []

    // Mock kitchen availability snapshot before reduction
    const kitchenCurrentStock: Record<string, { name: string; loggedAvailable: number }> = {
      k1: { name: "Shredded Chicken", loggedAvailable: 17 }, // 17 in kitchen, but 25 sold!
      k2: { name: "Sliced Beef", loggedAvailable: 12 },
    }

    lines.forEach((line, index) => {
      // Skip CSV header
      if (index === 0 && line.toLowerCase().includes("item name")) return

      const [xpsItemName, qtyStr, dateStr] = line.split(",").map((s) => s.trim())
      const quantitySold = Number(qtyStr)

      if (xpsItemName && !isNaN(quantitySold)) {
        salesData.push({
          id: `xps-${index}`,
          date: dateStr || "2026-08-22",
          xpsItemName,
          quantitySold,
        })

        // Check against recipe and identify deficits
        const recipe = recipeBook[xpsItemName]
        if (recipe) {
          const kitchenStock = kitchenCurrentStock[recipe.ingredientId]
          if (kitchenStock) {
            const requiredQty = quantitySold * recipe.qtyPerPortion
            if (requiredQty > kitchenStock.loggedAvailable) {
              const deficit = requiredQty - kitchenStock.loggedAvailable
              flags.push({
                id: `flag-${index}`,
                date: dateStr || "2026-08-22",
                itemName: recipe.ingredientName,
                location: "kitchen",
                expectedQuantity: kitchenStock.loggedAvailable,
                actualQuantity: requiredQty,
                deficitQuantity: deficit,
                reason: "unrecorded_transfer",
                resolved: false,
              })
            }
          }
        }
      }
    })

    setProcessedSales(salesData)
    setRedFlags(flags)
    setIsProcessed(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">XPS Daily Sales Reduction</h1>
          <p className="text-sm text-muted-foreground">
            Paste CSV/XPS raw sales data to deduct kitchen stock and flag inventory discrepancies.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Raw XPS Input Block */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" /> XPS File / Text Import
            </CardTitle>
            <CardDescription>
              Paste sales data exported from your POS system for today's shift.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste XPS data here..."
              className="font-mono text-sm"
            />
            <Button onClick={processXpsData} className="w-full flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Process & Reconcile Stock
            </Button>
          </CardContent>
        </Card>

        {/* Audit Summary & Red Flags */}
        <Card className={redFlags.length > 0 ? "border-red-200 bg-red-50/20" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" /> Discrepancy & Red Flag Alerts
            </CardTitle>
            <CardDescription>
              Items sold that exceed logged kitchen requests and transfers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isProcessed ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Import sales data to run automatic variance analysis.
              </div>
            ) : redFlags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-emerald-600 gap-2">
                <CheckCircle2 className="h-8 w-8" />
                <span className="font-medium text-sm">All sales matched logged transfers perfectly!</span>
              </div>
            ) : (
              <div className="space-y-4">
                {redFlags.map((flag) => (
                  <div key={flag.id} className="p-4 rounded-lg border border-red-300 bg-red-100/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-900">{flag.itemName}</span>
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Unrecorded Transfer
                      </Badge>
                    </div>
                    <p className="text-xs text-red-800">
                      Kitchen logged <strong>{flag.expectedQuantity} units</strong> available, but XPS records show{" "}
                      <strong>{flag.actualQuantity} units</strong> sold.
                    </p>
                    <p className="text-xs font-semibold text-red-950">
                      ⚠️ Red Flag: {flag.deficitQuantity} units were taken from Main Stock without a logged request!
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parsed Sales Output Table */}
      {isProcessed && (
        <Card>
          <CardHeader>
            <CardTitle>Processed XPS Sales Summary</CardTitle>
            <CardDescription>
              Raw records extracted and mapped to ingredient deductions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>XPS Menu Item</TableHead>
                  <TableHead className="text-center">Quantity Sold</TableHead>
                  <TableHead>Mapped Stock Ingredient</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedSales.map((sale) => {
                  const recipe = recipeBook[sale.xpsItemName]
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="text-xs text-muted-foreground">{sale.date}</TableCell>
                      <TableCell className="font-medium">{sale.xpsItemName}</TableCell>
                      <TableCell className="text-center font-bold">{sale.quantitySold}</TableCell>
                      <TableCell>
                        {recipe ? (
                          <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {recipe.qtyPerPortion * sale.quantitySold}x {recipe.ingredientName}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 font-semibold">Unmapped Item</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}