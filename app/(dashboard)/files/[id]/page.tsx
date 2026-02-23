import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  Edit,
  Phone,
  MapPin,
  Calendar,
  ChevronLeft,
  FileCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileStatusBadge } from "@/components/files/FileStatusBadge"
import { ActivityLogList } from "@/components/files/ActivityLogList"
import { PriceHistoryList } from "@/components/files/PriceHistoryList"
import { ArchiveFileButton } from "@/components/files/ArchiveFileButton"
import { AgentAssignmentPanel } from "@/components/files/AgentAssignmentPanel"
import { ShareLinksPanel } from "@/components/files/ShareLinksPanel"
import { LocationAnalysisDisplay } from "@/components/files/LocationAnalysisDisplay"
import { MapView } from "@/components/shared/MapView"
import { formatToman, formatJalali } from "@/lib/utils"
import { parseLocationAnalysis } from "@/lib/maps"
import type { TransactionType, PropertyType, Role } from "@/types"

interface FileDetailPageProps {
  params: Promise<{ id: string }>
}

const transactionTypeLabels: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

const propertyTypeLabels: Record<PropertyType, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "مغازه",
  OFFICE: "دفتر",
  OTHER: "سایر",
}

const contactTypeLabels: Record<string, string> = {
  OWNER: "مالک",
  TENANT: "مستاجر",
  LANDLORD: "موجر",
  BUYER: "خریدار",
}

export default async function FileDetailPage({ params }: FileDetailPageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const { officeId, role, id: userId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const file = await db.propertyFile.findFirst({
    where: {
      id,
      officeId,
      ...(role === "AGENT" && {
        assignedAgents: { some: { userId } },
      }),
    },
    include: {
      createdBy: { select: { displayName: true } },
      contacts: true,
      photos: { orderBy: { order: "asc" } },
      office: { select: { name: true } },
      assignedAgents: {
        include: { user: { select: { id: true, displayName: true } } },
      },
      priceHistory: {
        include: { changedBy: { select: { displayName: true } } },
        orderBy: { changedAt: "desc" },
      },
    },
  })

  if (!file) notFound()

  // CRM customers (BUYER/RENTER) for the SMS combobox — only needed when the file is ACTIVE
  // so the ShareLinksPanel is rendered. Filtered to the two types most likely to receive a share link.
  const crmCustomers =
    file.status === "ACTIVE"
      ? await db.customer.findMany({
          where: { officeId, type: { in: ["BUYER", "RENTER"] } },
          select: { name: true, phone: true },
          orderBy: { name: "asc" },
        })
      : []

  // Activity log is fetched separately — manager only. Conditional includes break Prisma's return types.
  const activityLogs =
    role === "MANAGER"
      ? await db.activityLog.findMany({
          where: { fileId: id },
          include: { user: { select: { displayName: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : []

  const canEdit =
    file.status === "ACTIVE" &&
    (role === "MANAGER" ||
      file.assignedAgents.some((a) => a.user.id === userId))

  const showSalePrice =
    file.transactionType === "SALE" || file.transactionType === "PRE_SALE"
  const showRentFields =
    file.transactionType === "LONG_TERM_RENT" || file.transactionType === "SHORT_TERM_RENT"

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/files" className="hover:text-foreground transition-colors">
          فایل‌ها
        </Link>
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        <span className="text-foreground">
          {transactionTypeLabels[file.transactionType]}
          {file.propertyType && ` · ${propertyTypeLabels[file.propertyType]}`}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">
              {transactionTypeLabels[file.transactionType]}
              {file.propertyType && ` · ${propertyTypeLabels[file.propertyType]}`}
              {file.area && ` · ${file.area.toLocaleString("fa-IR")} متر`}
            </h1>
            <FileStatusBadge status={file.status} />
          </div>
          {(file.neighborhood || file.address) && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {file.neighborhood ? `${file.neighborhood} · ${file.address ?? ""}` : file.address}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          {role === "MANAGER" && file.status === "ACTIVE" && (
            <>
              <ArchiveFileButton fileId={file.id} />
              <Button asChild variant="outline">
                <Link href={`/contracts/new?fileId=${file.id}`}>
                  <FileCheck className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
                  بستن قرارداد
                </Link>
              </Button>
            </>
          )}
          {canEdit && (
            <Button asChild>
              <Link href={`/files/${file.id}/edit`}>
                <Edit className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
                ویرایش
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Price */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {showSalePrice && file.salePrice && (
              <div>
                <p className="text-xs text-muted-foreground">قیمت فروش</p>
                <p className="text-base font-semibold text-primary">
                  {formatToman(file.salePrice)}
                </p>
              </div>
            )}
            {showRentFields && file.depositAmount && (
              <div>
                <p className="text-xs text-muted-foreground">رهن</p>
                <p className="text-base font-semibold text-primary">
                  {formatToman(file.depositAmount)}
                </p>
              </div>
            )}
            {showRentFields && file.rentAmount && (
              <div>
                <p className="text-xs text-muted-foreground">اجاره ماهانه</p>
                <p className="text-base font-semibold text-primary">
                  {formatToman(file.rentAmount)}
                </p>
              </div>
            )}
            {!file.salePrice && !file.depositAmount && !file.rentAmount && (
              <p className="text-sm text-muted-foreground col-span-full">قیمت ثبت نشده</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">مشخصات ملک</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {file.area && (
              <div>
                <dt className="text-muted-foreground">متراژ</dt>
                <dd className="font-medium">{file.area.toLocaleString("fa-IR")} متر</dd>
              </div>
            )}
            {file.floorNumber !== null && (
              <div>
                <dt className="text-muted-foreground">طبقه</dt>
                <dd className="font-medium">
                  {file.floorNumber.toLocaleString("fa-IR")}
                  {file.totalFloors && ` از ${file.totalFloors.toLocaleString("fa-IR")}`}
                </dd>
              </div>
            )}
            {file.buildingAge !== null && (
              <div>
                <dt className="text-muted-foreground">سن بنا</dt>
                <dd className="font-medium">{file.buildingAge.toLocaleString("fa-IR")} سال</dd>
              </div>
            )}
          </dl>

          {/* Amenities */}
          {(file.hasElevator || file.hasParking || file.hasStorage || file.hasBalcony || file.hasSecurity) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {file.hasElevator && <AmenityTag label="آسانسور" />}
              {file.hasParking && <AmenityTag label="پارکینگ" />}
              {file.hasStorage && <AmenityTag label="انباری" />}
              {file.hasBalcony && <AmenityTag label="بالکن" />}
              {file.hasSecurity && <AmenityTag label="نگهبانی" />}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      {file.latitude !== null && file.longitude !== null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">موقعیت</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <MapView lat={file.latitude} lng={file.longitude} height="h-56" />
            {file.address && (
              <p className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                {file.address}
              </p>
            )}
            <LocationAnalysisDisplay analysis={parseLocationAnalysis(file.locationAnalysis)} />
          </CardContent>
        </Card>
      ) : file.address ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">موقعیت</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              {file.address}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">مخاطبین</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {file.contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="space-y-0.5">
                <p className="font-medium">
                  {contact.name ?? "—"}
                  <span className="mr-1.5 text-xs text-muted-foreground font-normal">
                    ({contactTypeLabels[contact.type]})
                  </span>
                </p>
              </div>
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                <span dir="ltr">{contact.phone}</span>
              </a>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Description */}
      {file.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">توضیحات</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{file.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Internal notes — agents can see if assigned */}
      {file.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">یادداشت داخلی</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {file.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Assigned agents — editable for manager, read-only for agents */}
      {role === "MANAGER" ? (
        <AgentAssignmentPanel fileId={file.id} currentAgents={file.assignedAgents} />
      ) : (
        file.assignedAgents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">مشاوران تخصیص‌داده‌شده</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex flex-wrap gap-2">
              {file.assignedAgents.map((a) => (
                <span key={a.id} className="rounded-full bg-accent px-3 py-1 text-sm">
                  {a.user.displayName}
                </span>
              ))}
            </CardContent>
          </Card>
        )
      )}

      {/* Share links — available for ACTIVE files to all roles */}
      {file.status === "ACTIVE" && (
        <ShareLinksPanel
          fileId={file.id}
          transactionType={file.transactionType}
          role={role === "AGENT" ? "AGENT" : "MANAGER"}
          contacts={file.contacts.map((c) => ({ name: c.name, phone: c.phone }))}
          customers={crmCustomers}
          agentName={session.user.name ?? ""}
          officeName={file.office.name}
        />
      )}

      {/* Price history */}
      {file.priceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">تاریخچه قیمت</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <PriceHistoryList
              entries={file.priceHistory.map((p) => ({
                ...p,
                oldPrice: p.oldPrice != null ? Number(p.oldPrice) : null,
                newPrice: p.newPrice != null ? Number(p.newPrice) : null,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Activity log — manager only */}
      {role === "MANAGER" && activityLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">تاریخچه فعالیت</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ActivityLogList
              entries={activityLogs.map((log) => ({
                ...log,
                diff: log.diff as Record<string, (string | number | boolean | null)[]> | null,
                user: {
                  displayName: log.user.displayName,
                  role: log.user.role as Role,
                },
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pb-8">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          ایجاد: {formatJalali(new Date(file.createdAt))}
        </span>
        <span>توسط: {file.createdBy.displayName}</span>
        <span>آخرین ویرایش: {formatJalali(new Date(file.updatedAt))}</span>
      </div>
    </div>
  )
}

function AmenityTag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium">
      {label}
    </span>
  )
}
