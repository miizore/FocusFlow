import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-none border border-zinc-800 bg-black px-2.5 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors shadow-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-red-600",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

