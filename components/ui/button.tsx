import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("button", { variants: { variant: { default: "", secondary: "secondary", ghost: "link-button", destructive: "link-button danger" }, size: { default: "", compact: "px-3 py-2 text-xs" } }, defaultVariants: { variant: "default", size: "default" } });
export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) { const Component = asChild ? Slot : "button"; return <Component data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props}/>; }
