import Image from "next/image"
import type { ReactNode } from "react"

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="grid min-h-svh bg-muted/30 lg:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3">
            <Image
              src="/cms-logo.svg"
              alt=""
              width={256}
              height={256}
              className="size-10"
              priority
            />
            <span className="font-semibold tracking-tight">YACMS</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
          {children}
        </div>
      </section>

      <aside className="relative hidden overflow-hidden border-l bg-primary text-primary-foreground lg:block">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <span className="text-sm font-medium opacity-70">Your content, your space.</span>
          <blockquote className="max-w-xl text-3xl font-medium leading-tight tracking-tight">
            “A calm place to shape ideas, manage content, and keep your work moving.”
          </blockquote>
        </div>
      </aside>
    </main>
  )
}
