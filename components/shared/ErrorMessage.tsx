import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorMessageProps {
  message: string
  className?: string
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className
      )}
    >
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  )
}
