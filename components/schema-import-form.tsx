"use client"

import { useActionState, useRef } from "react"

import {
  importSchemaAction,
  type SchemaImportState,
} from "@/app/actions/schema-import"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"

const initialState: SchemaImportState = {}

export function SchemaImportForm() {
  const [state, action, pending] = useActionState(
    importSchemaAction,
    initialState
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <form action={action} className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Schema import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Import content schemas, seeded entries, and form schemas from a CMS
          JSON file. Matching API IDs and seed keys are updated.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        name="schemaFile"
        accept="application/json,.json"
        className="sr-only"
        required
        onChange={(event) => {
          if (event.currentTarget.files?.length) {
            event.currentTarget.form?.requestSubmit()
          }
        }}
      />

      {state.message &&
        (state.status === "error" ? (
          <FieldError className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
            {state.message}
          </FieldError>
        ) : (
          <p
            role="status"
            className="mb-4 rounded-xl border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
          >
            {state.message}
          </p>
        ))}

      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => fileInputRef.current?.click()}
      >
        {pending ? "Importing…" : "Import schema"}
      </Button>
    </form>
  )
}
