import { MessageSquare } from "lucide-react"
import { formatJalali } from "@/lib/utils"
import type { CustomerNote } from "@/types"

interface CustomerNoteListProps {
  notes: CustomerNote[]
}

export function CustomerNoteList({ notes }: CustomerNoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">هنوز یادداشتی ثبت نشده</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {notes.map((note) => (
        <li key={note.id} className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
          <p className="text-xs text-muted-foreground">
            {note.user.displayName} · {formatJalali(new Date(note.createdAt), "yyyy/MM/dd HH:mm")}
          </p>
        </li>
      ))}
    </ul>
  )
}
