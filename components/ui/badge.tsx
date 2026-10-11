import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border px-2 py-0.5 text-xs font-mono uppercase tracking-wider transition-all focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring select-none shadow-none has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-[#002FA7] bg-[#002FA7] text-white",
        secondary: "border-zinc-800 bg-zinc-900 text-zinc-300",
        destructive: "border-red-900 bg-red-950/60 text-red-400",
        outline: "border-zinc-800 bg-black text-zinc-300",
        ghost: "border-transparent bg-transparent text-zinc-400 hover:text-white",
        link: "text-blue-500 underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }


