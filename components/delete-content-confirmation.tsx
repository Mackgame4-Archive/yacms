"use client"

import { useFormStatus } from "react-dom"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { deleteContentEntryAction } from "@/app/actions/content-entries"
import { deleteContentTypeFieldAction } from "@/app/actions/content-types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"

type DeleteContentConfirmationProps = {
  kind: "field" | "entry"
  contentTypeId: string
  itemId: string
  itemName: string
  disabled?: boolean
}

export function DeleteContentConfirmation({
  kind,
  contentTypeId,
  itemId,
  itemName,
  disabled,
}: DeleteContentConfirmationProps) {
  const isField = kind === "field"
  const triggerLabel = `Delete ${isField ? "field" : "entry"} ${itemName}`

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={disabled}
        aria-label={triggerLabel}
        title={triggerLabel}
        className={buttonVariants({
          variant: isField ? "ghost" : "destructive",
          size: isField ? "icon-sm" : "sm",
        })}
      >
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
        {!isField && "Delete entry"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {isField ? "field" : "entry"} “{itemName}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isField
              ? "This will also remove this field's values from all existing entries. This cannot be undone."
              : "This entry will be permanently deleted. This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={isField ? deleteContentTypeFieldAction : deleteContentEntryAction}>
          <input type="hidden" name="contentTypeId" value={contentTypeId} />
          <input type="hidden" name={isField ? "fieldId" : "entryId"} value={itemId} />
          <ConfirmationButtons kind={kind} />
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ConfirmationButtons({ kind }: { kind: "field" | "entry" }) {
  const { pending } = useFormStatus()

  return (
    <AlertDialogFooter>
      <AlertDialogCancel type="button" disabled={pending}>
        Cancel
      </AlertDialogCancel>
      <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deleting…" : `Delete ${kind}`}
      </AlertDialogAction>
    </AlertDialogFooter>
  )
}
