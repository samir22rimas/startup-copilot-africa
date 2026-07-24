import { StartupWizard } from "@/src/components/dashboard/StartupWizard";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewBusinessPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
          Create a New Business / Venture
        </h1>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">
          Add another startup or project to your Copilot account to start planning and validating.
        </p>
      </div>

      <StartupWizard />
    </div>
  );
}
