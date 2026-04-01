"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type ResetItem = {
  notificationId: string
  requesterName: string
  requesterEmail: string
  code: string
  expiresAt: string
  status: "PENDING" | "USED" | "EXPIRED"
  handled: boolean
  requestedAt: string
}

export function PasswordResetsClient({ items }: { items: ResetItem[] }) {
  const router = useRouter()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

  const markHandled = async (id: string) => {
    try {
      setMarkingId(id)
      const response = await fetch(`/api/password-resets/${id}`, { method: "PATCH" })
      if (!response.ok) {
        throw new Error("Failed to mark as handled")
      }
      router.refresh()
    } catch {
      // Keep UX minimal and explicit for admin operators.
      alert("Unable to mark request as handled")
    } finally {
      setMarkingId(null)
    }
  }

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      alert("Code copied")
    } catch {
      alert(`Unable to copy automatically. Code: ${code}`)
    }
  }

  if (!items.length) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No password reset requests yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isRevealed = revealedIds.has(item.notificationId)
        const displayCode = isRevealed ? item.code : "••••••"
        return (
          <div key={item.notificationId} className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{item.requesterName}</p>
              <p className="text-sm text-muted-foreground">{item.requesterEmail}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Requested</p>
              <p className="text-sm">{item.requestedAt}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Reset Code</p>
              <p className="mt-1 text-xl font-bold tracking-widest">{displayCode}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="mt-1 text-sm font-medium">{item.expiresAt}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">State</p>
              <p className="mt-1 text-sm font-medium">
                {item.status}
                {item.handled ? " / HANDLED" : ""}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => toggleReveal(item.notificationId)}>
              {isRevealed ? "Hide code" : "Reveal code"}
            </Button>
            <Button variant="outline" onClick={() => copyCode(item.code)}>
              Copy code
            </Button>
            {!item.handled ? (
              <Button
                onClick={() => markHandled(item.notificationId)}
                disabled={markingId === item.notificationId}
              >
                {markingId === item.notificationId ? "Marking..." : "Mark handled"}
              </Button>
            ) : null}
          </div>
          </div>
        )
      })}
    </div>
  )
}
