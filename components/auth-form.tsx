"use client"

import Link from "next/link"
import { useActionState } from "react"

import {
  login,
  register,
  type AuthFormState,
} from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: AuthFormState = {}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register"
  const [state, action, pending] = useActionState(
    isRegister ? register : login,
    initialState
  )

  return (
    <form action={action} className="mt-8">
      <FieldGroup className="gap-5">
        {isRegister && (
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name="name"
              type="text"
              defaultValue={state.fields?.name}
              autoComplete="name"
              className="h-11 shadow-xs"
              required
            />
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={state.fields?.email}
            autoComplete="email"
            className="h-11 shadow-xs"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            aria-describedby={isRegister ? "password-description" : undefined}
            className="h-11 shadow-xs"
            required
          />
          {isRegister && (
            <FieldDescription id="password-description">
              Use at least 8 characters with a letter and number.
            </FieldDescription>
          )}
        </Field>

        {isRegister && (
          <Field>
            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="h-11 shadow-xs"
              required
            />
          </Field>
        )}

        {state.error && (
          <FieldError className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
            {state.error}
          </FieldError>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Please wait…" : isRegister ? "Create account" : "Log in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {isRegister ? "Already have an account?" : "New to YACMS?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
      </FieldGroup>
    </form>
  )
}
