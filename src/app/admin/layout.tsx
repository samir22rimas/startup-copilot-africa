import React from "react"
import { verifyAdminSession } from "@/src/lib/admin-guard"
import { AdminSidebar } from "@/src/components/admin/AdminSidebar"
import { AdminHeader } from "@/src/components/admin/AdminHeader"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await verifyAdminSession()

  if (!session) {
    return null
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 antialiased font-sans">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader adminContext={session.adminContext} />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
