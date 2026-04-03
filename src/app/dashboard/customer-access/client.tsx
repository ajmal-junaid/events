"use client"

import { useMemo, useState } from "react"
import { CustomerAccessScope, Role } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type BranchLite = { id: string; name: string }
type CodeItem = {
  id: string
  label: string | null
  customerPhone: string | null
  scope: CustomerAccessScope
  branchId: string | null
  branch: { id: string; name: string } | null
  expiresAt: string | Date
  createdAt: string | Date
  lastUsedAt: string | Date | null
  createdBy: { id: string; name: string; role: Role }
}

export function CustomerAccessClient({
  initialCodes,
  branches,
  role,
}: {
  initialCodes: CodeItem[]
  branches: BranchLite[]
  role: Role
}) {
  const [codes, setCodes] = useState(initialCodes)
  const [label, setLabel] = useState("")
  const [scope, setScope] = useState<CustomerAccessScope>(CustomerAccessScope.SINGLE_BRANCH)
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "")
  const [customerPhone, setCustomerPhone] = useState("")
  const [creating, setCreating] = useState(false)
  const [latestCode, setLatestCode] = useState<string | null>(null)

  const disableBranchSelect = role === Role.BRANCH_MANAGER || scope === CustomerAccessScope.ALL_BRANCHES

  const sortedCodes = useMemo(
    () =>
      [...codes].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [codes]
  )

  async function refreshCodes() {
    const res = await fetch("/api/customer-access-codes")
    if (!res.ok) throw new Error("Could not refresh codes")
    const list = (await res.json()) as CodeItem[]
    setCodes(list)
  }

  async function createCode() {
    setCreating(true)
    setLatestCode(null)
    try {
      const payload =
        role === Role.BRANCH_MANAGER
          ? { label, customerPhone: customerPhone.trim() || undefined, scope: CustomerAccessScope.SINGLE_BRANCH, branchId }
          : {
              label,
              customerPhone: customerPhone.trim() || undefined,
              scope,
              branchId: scope === CustomerAccessScope.SINGLE_BRANCH ? branchId : undefined,
            }

      const res = await fetch("/api/customer-access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.message || "Failed to create access code")

      setLatestCode(body.accessCode)
      setLabel("")
      setCustomerPhone("")
      await refreshCodes()
      toast.success("Customer access code created")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create code")
    } finally {
      setCreating(false)
    }
  }

  async function deleteCode(id: string) {
    try {
      const res = await fetch(`/api/customer-access-codes/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || "Failed to delete code")
      }
      setCodes((prev) => prev.filter((item) => item.id !== id))
      toast.success("Access code deleted")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete code")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Customer App Access Codes</CardTitle>
          <CardDescription>
            Generate shareable customer login codes. Codes are valid for 30 days and can be deleted anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Wedding campaign / Client partner"
            />
          </div>

          <div className="grid gap-2">
            <Label>Customer phone (optional, for My Orders view)</Label>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. +91XXXXXXXXXX"
            />
          </div>

          {role === Role.SUPER_ADMIN ? (
            <div className="grid gap-2">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as CustomerAccessScope)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CustomerAccessScope.ALL_BRANCHES}>All Branches</SelectItem>
                  <SelectItem value={CustomerAccessScope.SINGLE_BRANCH}>Specific Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId} disabled={disableBranchSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => void createCode()} disabled={creating}>
            {creating ? "Creating..." : "Create Customer Access Code"}
          </Button>

          {latestCode ? (
            <div className="rounded-md border p-3 bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Share this code now (shown once):</p>
              <div className="flex items-center gap-2">
                <code className="rounded bg-black/90 px-2 py-1 text-white">{latestCode}</code>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(latestCode)
                    toast.success("Code copied")
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active codes.</p>
          ) : (
            sortedCodes.map((item) => (
              <div key={item.id} className="rounded-md border p-3 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{item.label || "Untitled code"}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.scope === CustomerAccessScope.ALL_BRANCHES ? "All branches" : "Single branch"}</Badge>
                    <Button variant="destructive" size="sm" onClick={() => void deleteCode(item.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Branch: {item.branch?.name || "All"} | Expires: {new Date(item.expiresAt).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Linked customer phone: {item.customerPhone || "Not linked"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created by {item.createdBy.name} | Last used:{" "}
                  {item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : "Never"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
