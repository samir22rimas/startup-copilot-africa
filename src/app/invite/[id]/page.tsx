import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { signOut } from "@/src/app/actions/auth"
import { getInvitationPreview } from "@/src/app/actions/team"
import { InviteActions } from "@/src/components/dashboard/team/InviteActions"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/src/lib/team"
import { isUuid } from "@/src/lib/validation"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Team invitation · Anza",
  // Invitation links are private; keep them out of search engines and referrers.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-bold tracking-tight text-green-700 dark:text-green-400">
          <Image src="/logo.png" alt="" width={36} height={36} className="size-9 rounded-lg object-contain" />
          Anza
        </Link>
        {children}
      </div>
    </main>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{body}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-green-700 px-5 text-sm font-semibold text-white hover:bg-green-800"
      >
        Go to dashboard
      </Link>
    </Shell>
  )
}

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invitation = isUuid(id) ? await getInvitationPreview(id) : null

  if (!invitation) {
    return (
      <Notice
        title="Invitation not found"
        body="This invitation link is not valid, or it was withdrawn. Ask the person who invited you for a new one."
      />
    )
  }
  if (invitation.status === "accepted") {
    return (
      <Notice
        title="Invitation already accepted"
        body={`This invitation to ${invitation.startupName} has already been used. If that was you, the startup is in your business switcher.`}
      />
    )
  }
  if (invitation.status === "declined") {
    return <Notice title="Invitation declined" body="This invitation was declined. Ask for a new one if that was a mistake." />
  }
  if (invitation.isExpired) {
    return (
      <Notice
        title="Invitation expired"
        body={`This invitation to ${invitation.startupName} has expired. Ask ${invitation.inviterName} to send a new one.`}
      />
    )
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const next = encodeURIComponent(`/invite/${invitation.id}`)

  return (
    <Shell>
      <p className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Team invitation</p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
        Join {invitation.startupName}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <span className="font-semibold text-zinc-900 dark:text-white">{invitation.inviterName}</span> invited you to
        work on this startup together as{" "}
        <span className="font-semibold text-zinc-900 dark:text-white">{ROLE_LABEL[invitation.role]}</span>.
      </p>
      <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-xs leading-relaxed text-zinc-500 dark:bg-zinc-950/50">
        {ROLE_DESCRIPTION[invitation.role]}
      </p>

      <div className="mt-6">
        {!user ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              This invitation was sent to <span className="font-semibold">{invitation.emailHint}</span>. Sign in or
              create an account with that email to accept it.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/sign-in?next=${next}`}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-green-700 px-6 text-sm font-semibold text-white hover:bg-green-800"
              >
                Sign in to accept
              </Link>
              <Link
                href={`/sign-up?next=${next}`}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-zinc-200 px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : invitation.isForCurrentUser ? (
          <InviteActions invitationId={invitation.id} />
        ) : (
          <div className="space-y-3">
            <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              You are signed in as <span className="font-semibold">{user.email}</span>, but this invitation was sent
              to <span className="font-semibold">{invitation.emailHint}</span>. Sign out, then open this link again
              and sign in with the invited email. If you just registered, confirm your email address first.
            </p>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </Shell>
  )
}
