import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { FileForm } from "@/components/files/FileForm"

interface EditFilePageProps {
  params: Promise<{ id: string }>
}

export default async function EditFilePage({ params }: EditFilePageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const { officeId, role, id: userId } = session.user

  const file = await db.propertyFile.findFirst({
    where: {
      id,
      officeId,
      ...(role === "AGENT" && {
        assignedAgents: { some: { userId } },
      }),
    },
    include: {
      contacts: true,
    },
  })

  if (!file) notFound()

  // Only active files can be edited
  if (file.status !== "ACTIVE") {
    redirect(`/files/${id}`)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/files" className="hover:text-foreground transition-colors">
          فایل‌ها
        </Link>
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        <Link href={`/files/${id}`} className="hover:text-foreground transition-colors">
          جزئیات فایل
        </Link>
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        <span className="text-foreground">ویرایش</span>
      </nav>

      <PageHeader title="ویرایش فایل" />

      <FileForm
        fileId={id}
        initialData={{
          transactionType: file.transactionType,
          propertyType: file.propertyType ?? undefined,
          area: file.area ?? undefined,
          floorNumber: file.floorNumber ?? undefined,
          totalFloors: file.totalFloors ?? undefined,
          buildingAge: file.buildingAge ?? undefined,
          salePrice: file.salePrice != null ? Number(file.salePrice) : undefined,
          depositAmount: file.depositAmount != null ? Number(file.depositAmount) : undefined,
          rentAmount: file.rentAmount != null ? Number(file.rentAmount) : undefined,
          address: file.address ?? "",
          neighborhood: file.neighborhood ?? "",
          description: file.description ?? "",
          notes: file.notes ?? "",
          hasElevator: file.hasElevator,
          hasParking: file.hasParking,
          hasStorage: file.hasStorage,
          hasBalcony: file.hasBalcony,
          hasSecurity: file.hasSecurity,
          contacts: file.contacts.map((c) => ({
            id: c.id,
            fileId: c.fileId,
            type: c.type,
            name: c.name,
            phone: c.phone,
            notes: c.notes,
            createdAt: c.createdAt,
          })),
        }}
      />
    </div>
  )
}
