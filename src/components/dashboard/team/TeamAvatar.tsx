import { cn } from "@/src/lib/utils"

/** Round avatar: the person's photo when there is one, otherwise their initial. */
export function TeamAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string
  avatarUrl: string | null
  className?: string
}) {
  const initial = (name.trim()[0] || "?").toUpperCase()

  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-green-100 text-xs font-bold text-green-800 dark:border-zinc-700 dark:bg-green-900/50 dark:text-green-300",
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </div>
  )
}
