import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Pencil, Mail, UserCircle, Briefcase, KeyRound } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
// Client-only wrapper — ssr: false lives in a Client Component to satisfy Next.js rules
import { DeactivateAgentButton, ResetPasswordForm } from "@/components/agents/AgentDetailActions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatJalali } from "@/lib/utils"
import type { TransactionType, FileStatus } from "@/types"
import { canOfficeDo } from "@/lib/office-permissions"

interface AgentPageProps {
  params: Promise<{ id: string }>
}

const transactionTypeLabels: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

const fileStatusLabels: Record<FileStatus, string> = {
  ACTIVE: "فعال",
  ARCHIVED: "آرشیو",
  SOLD: "فروخته شده",
  RENTED: "اجاره رفته",
  EXPIRED: "منقضی",
}

export default async function AgentPage({ params }: AgentPageProps) {
  const session = await auth()
  if (!session) redirect("/login")
  if (!canOfficeDo(session.user, "manageAgents")) redirect("/dashboard")

  const { id } = await params
  const { officeId } = session.user

  const agent = await db.user.findFirst({
    where: { id, officeId, role: "AGENT" },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      isActive: true,
      createdAt: true,
      _count: { select: { fileAssignments: true } },
      fileAssignments: {
        select: {
          file: { select: { id: true, transactionType: true, status: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  })

  if (!agent) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={agent.displayName}
        description={`ثبت شده در ${formatJalali(new Date(agent.createdAt))}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/agents/${id}/edit`}>
              <Pencil className="h-4 w-4 rtl:ml-1.5" />
              ویرایش
            </Link>
          </Button>
        }
      />

      {/* Agent info */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant={agent.isActive ? "default" : "secondary"}>
            {agent.isActive ? "فعال" : "غیرفعال"}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          <span dir="ltr">{agent.username}</span>
        </div>

        {agent.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span dir="ltr">{agent.email}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Briefcase className="h-4 w-4 shrink-0" />
          <span>{agent._count.fileAssignments.toLocaleString("fa-IR")} فایل اختصاص داده شده</span>
        </div>
      </div>

      {/* Manager actions */}
      <div className="flex flex-wrap gap-3">
        <DeactivateAgentButton
          agentId={agent.id}
          agentName={agent.displayName}
          isActive={agent.isActive}
        />
      </div>

      <Separator />

      {/* Reset password */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <KeyRound className="h-4 w-4" />
          بازنشانی رمز عبور
        </h2>
        <ResetPasswordForm agentId={agent.id} />
      </div>

      <Separator />

      {/* Assigned files */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">فایل‌های اختصاص داده شده</h2>
        {agent.fileAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">هیچ فایلی اختصاص داده نشده است</p>
        ) : (
          <div className="space-y-2">
            {agent.fileAssignments.map(({ file }) => (
              <Link
                key={file.id}
                href={`/files/${file.id}`}
                className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors"
              >
                <span>{transactionTypeLabels[file.transactionType as TransactionType]}</span>
                <Badge variant="outline">
                  {fileStatusLabels[file.status as FileStatus]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
