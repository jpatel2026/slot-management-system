"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

interface Product {
  id: number; name: string; code: string
}

interface Account {
  id: number; name: string; alias: string
}

interface OrderReservation {
  id: string; status: string; country: string; productId: number
  therapyType: string; cryoType: string; cryoCapacityId: number | null
  mfgCapacityId: number; originalPdd: string; plannedPdd: string
  aphSiteId: number; cryoSiteId: number | null; mfgSiteId: number
  wdcSiteId: number | null; infusionSiteId: number
  remanufacturingFlag: boolean; reapheresisFlag: boolean
  product: Product; mfgSite: Account; aphSite: Account
  createdAt: string; updatedAt: string
}

const statusBadge: Record<string, "info" | "warning" | "success" | "secondary" | "destructive"> = {
  Booked: "info",
  "In Progress": "warning",
  Completed: "success",
  Cancelled: "secondary",
  "On Hold": "warning",
}

export default function OrdersPage() {
  const [data, setData] = useState<OrderReservation[]>([])
  const router = useRouter()

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/orders")
    setData(await res.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openDetail = (order: OrderReservation) => {
    router.push(`/master-data/orders/${order.id}`)
  }

  const columns: ColumnDef<OrderReservation, unknown>[] = [
    { accessorKey: "id", header: "Order ID", cell: ({ row }) => (
      <span className="font-medium text-blue-600 hover:underline cursor-pointer">{row.original.id.slice(0, 12)}...</span>
    )},
    { accessorKey: "status", header: "Status", cell: ({ row }) => {
      const s = row.original.status
      return <Badge variant={statusBadge[s] || "secondary"} className={s === "On Hold" ? "bg-orange-100 text-orange-800" : ""}>{s}</Badge>
    }},
    { accessorKey: "country", header: "Country", cell: ({ row }) => (
      <span className="text-sm">{row.original.country}</span>
    )},
    { accessorKey: "product.code", header: "Product", cell: ({ row }) => (
      <code className="rounded bg-blue-50 px-2 py-0.5 text-xs font-mono text-blue-700">{row.original.product?.code || "-"}</code>
    )},
    { accessorKey: "therapyType", header: "Therapy Type", cell: ({ row }) => {
      const v = row.original.therapyType
      return <Badge variant={v === "Commercial" ? "info" : "purple"}>{v}</Badge>
    }},
    { accessorKey: "cryoType", header: "Cryo Type", cell: ({ row }) => (
      <Badge variant="secondary">{row.original.cryoType}</Badge>
    )},
    { accessorKey: "mfgSite.alias", header: "Mfg Site", cell: ({ row }) => (
      <code className="rounded bg-amber-50 px-2 py-0.5 text-xs font-mono text-amber-700">{row.original.mfgSite?.alias || "-"}</code>
    )},
    { accessorKey: "plannedPdd", header: "Planned PDD", cell: ({ row }) => (
      <span className="text-sm text-gray-600">{formatDate(row.original.plannedPdd)}</span>
    )},
  ]

  return (
    <div>
      <PageHeader title="Orders" description="View and manage order reservations" />
      <DataTable columns={columns} data={data} searchPlaceholder="Search orders..." showActiveFilter={false} exportFilename="orders.csv" onRowClick={openDetail} />
    </div>
  )
}
