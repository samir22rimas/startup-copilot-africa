"use server";

import { cookies } from "next/headers"
import { ACTIVE_STARTUP_COOKIE } from "@/src/lib/active-startup"

export async function setActiveStartup(startupId: string) {
  try {
    const store = await cookies()
    store.set(ACTIVE_STARTUP_COOKIE, startupId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
