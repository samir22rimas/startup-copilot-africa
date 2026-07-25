"use client"

import * as React from "react"

/** Locks document scroll so focus/clicks can't shove the page under the dashboard shell. */
export function DashboardScrollLock() {
  React.useEffect(() => {
    const html = document.documentElement
    const body = document.body

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
    }

    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    html.style.height = "100%"
    body.style.height = "100%"
    window.scrollTo(0, 0)

    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      html.style.height = prev.htmlHeight
      body.style.height = prev.bodyHeight
    }
  }, [])

  return null
}

/** Run async work while keeping the dashboard main pane scroll position. */
export async function withPreservedMainScroll(action: () => void | Promise<void>) {
  const main = document.querySelector("main")
  const top = main instanceof HTMLElement ? main.scrollTop : 0
  window.scrollTo(0, 0)

  try {
    await action()
  } finally {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      if (main instanceof HTMLElement) {
        main.scrollTop = top
      }
    })
  }
}
