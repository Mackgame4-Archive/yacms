import { AppHeader } from "@/components/app-header"
import { ProfileForms } from "@/components/profile-forms"
import { requireUser } from "@/lib/auth"

export const metadata = {
  title: "Profile · YACMS",
}

export default async function ProfilePage() {
  const user = await requireUser()

  return (
    <main className="min-h-svh bg-muted/30">
      <AppHeader user={user} />
      <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">Account</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-3 text-muted-foreground">
            Manage your personal details and account security.
          </p>
        </div>
        <ProfileForms name={user.name} email={user.email} />
      </section>
    </main>
  )
}
