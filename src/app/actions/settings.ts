"use server"

import { revalidatePath } from "next/cache"
import { updateProfile } from "@/src/features/auth/services/profile.service"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

export async function updateUserSettings(formData: {
  fullName: string
  phone: string
  city: string
  timezone: string
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Not authenticated")
  }

  const result = await updateProfile({
    full_name: formData.fullName || null,
    phone: formData.phone || null,
    city: formData.city || null,
    timezone: formData.timezone || "UTC",
  })

  if (!result) {
    throw new Error("Failed to update profile settings.")
  }

  revalidatePath("/dashboard/settings")
  return { success: true }
}
