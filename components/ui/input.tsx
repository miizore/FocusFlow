import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-none border border-zinc-800 bg-black px-2.5 py-1 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors shadow-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-red-600",
        className
      )}
      {...props}
    />
  )
}

export { Input }

