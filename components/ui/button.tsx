import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-mono uppercase tracking-wider font-medium whitespace-nowrap transition-colors outline-none select-none shadow-none focus-visible:border-[#002FA7] focus-visible:ring-1 focus-visible:ring-[#002FA7] disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 cursor-pointer active:translate-y-px",
  {
    variants: {
      variant: {
        default: "border-[#002FA7] bg-[#002FA7] text-white hover:bg-[#002488]",
        outline:
          "border-zinc-800 bg-black text-zinc-200 hover:bg-zinc-900 hover:text-white hover:border-zinc-700",
        secondary:
          "border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white",
        ghost:
          "border-transparent bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
        destructive:
          "border-red-900 bg-red-950/80 text-red-200 hover:border-[#BC0C0C] hover:bg-[#BC0C0C] hover:text-white",
        link: "border-transparent text-blue-500 underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2 text-[10px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        lg: "h-9 gap-2 px-4 text-xs font-semibold",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }


