"use client"

import React from 'react'
import { initialMainStockData } from '@/data/mainStockItems'

export default function MainStockPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Main Stock Overview</h1>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-xs uppercase">
            <tr>
              <th className="p-3">Item Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Stock On Hand</th>
              <th className="p-3">Unit</th>
              <th className="p-3">Reorder Level</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {initialMainStockData.map((item) => (
              <tr key={item.id}>
                <td className="p-3 font-medium">{item.name}</td>
                <td className="p-3 capitalize">{item.category}</td>
                <td className="p-3 font-semibold">{item.quantityInStock}</td>
                <td className="p-3">{item.unit}</td>
                <td className="p-3">{item.reorderLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}