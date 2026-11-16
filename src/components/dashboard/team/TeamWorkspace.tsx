"use client"

import { TeamChat } from "@/src/components/dashboard/team/TeamChat"
import { TeamPeople } from "@/src/components/dashboard/team/TeamPeople"
import type { TeamOverview } from "@/src/lib/team"
import { cn } from "@/src/lib/utils"
import { MessagesSquare, Users } from "lucide-react"
import * as React from "react"

type ReadyOverview = Extract<TeamOverview, { ready: true }>

export function TeamWorkspace({ overview }: { overview: ReadyOverview }) {
  // On phones the two panels are tabs; on large screens they sit side by side.
  const [tab, setTab] = React.useState<"chat" | "people">("chat")

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 pb-10 font-sans sm:space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Team</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
            {overview.startup.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Work on your startup together: invite co-founders, discuss each project, and pull the AI Copilot into
            the conversation.
          </p>
        </div>

        <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900 lg:hidden" role="tablist" aria-label="Team sections">
          {(
            [
              { id: "chat", label: "Chat", icon: MessagesSquare },
              { id: "people", label: `People (${overview.members.length})`, icon: Users },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition",
                tab === item.id
                  ? "bg-white text-green-800 shadow-sm dark:bg-zinc-800 dark:text-green-400"
                  : "text-zinc-500",
              )}
            >
              <item.icon className="size-4" /> {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <div className={cn("min-w-0 lg:col-span-8 lg:block", tab === "chat" ? "block" : "hidden")}>
          <TeamChat
            startupId={overview.startup.id}
            channels={overview.channels}
            members={overview.members}
            currentUserId={overview.currentUserId}
            canModerate={overview.canManage}
          />
        </div>
        <div className={cn("min-w-0 lg:col-span-4 lg:block", tab === "people" ? "block" : "hidden")}>
          <TeamPeople
            startupName={overview.startup.name}
            members={overview.members}
            invitations={overview.invitations}
            role={overview.role}
            canManage={overview.canManage}
            canInviteAdmins={overview.canInviteAdmins}
            seatLimit={overview.seatLimit}
            seatsUsed={overview.seatsUsed}
            ownerTier={overview.ownerTier}
          />
        </div>
      </div>
    </div>
  )
}
