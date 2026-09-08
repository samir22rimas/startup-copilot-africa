import { getAdminUsersList } from "@/src/app/actions/admin"
import { UserManagementTable } from "@/src/components/admin/UserManagementTable"
import { Users } from "lucide-react"

export default async function AdminUsersPage() {
  const res = await getAdminUsersList()

  if (!res.success) {
    return (
      <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
        <h2 className="font-bold text-lg">Error loading Users Directory</h2>
        <p className="text-sm mt-1">{res.error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
          <Users className="w-7 h-7 text-green-600" /> User Directory
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage registered users, inspect location profiles, view feedback activity, and upgrade/downgrade subscription tiers.
        </p>
      </div>

      <UserManagementTable initialUsers={res.users} />
    </div>
  )
}
