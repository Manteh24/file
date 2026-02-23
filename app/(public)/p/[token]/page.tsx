import { notFound } from "next/navigation"
import { MapPin, Home, Building2, AlertTriangle } from "lucide-react"
import { db } from "@/lib/db"
import { formatToman } from "@/lib/utils"
import { parseLocationAnalysis } from "@/lib/maps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapView } from "@/components/shared/MapView"
import { LocationAnalysisDisplay } from "@/components/files/LocationAnalysisDisplay"

interface SharePageProps {
  params: Promise<{ token: string }>
}

const transactionTypeLabels: Record<string, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

const propertyTypeLabels: Record<string, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "مغازه",
  OFFICE: "دفتر",
  OTHER: "سایر",
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params

  const link = await db.shareLink.findUnique({
    where: { token },
    include: {
      file: {
        include: {
          office: { select: { name: true } },
        },
      },
    },
  })

  // Show expired message for missing, inactive, or closed-file links
  const isExpired =
    !link ||
    !link.isActive ||
    link.file.status !== "ACTIVE"

  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">لینک منقضی شده است</h1>
          <p className="text-sm text-muted-foreground">
            این لینک دیگر فعال نیست یا ملک مورد نظر از دسترس خارج شده است.
          </p>
        </div>
      </div>
    )
  }

  // Increment view count asynchronously — fire and forget to keep page fast
  db.shareLink
    .update({ where: { token }, data: { viewCount: { increment: 1 } } })
    .catch(() => {
      // Non-critical — view count is best-effort
    })

  const file = link.file
  const isSale = file.transactionType === "SALE" || file.transactionType === "PRE_SALE"
  const isRent =
    file.transactionType === "LONG_TERM_RENT" ||
    file.transactionType === "SHORT_TERM_RENT"

  // customPrice overrides the file's price when set
  const displayCustomPrice = link.customPrice != null

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4 shrink-0" />
          <span>{file.office.name}</span>
        </div>
        <h1 className="text-2xl font-bold">
          {transactionTypeLabels[file.transactionType]}
          {file.propertyType && ` · ${propertyTypeLabels[file.propertyType]}`}
          {file.area && ` · ${file.area.toLocaleString("fa-IR")} متر`}
        </h1>
        {file.neighborhood && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {file.neighborhood}
          </p>
        )}
      </div>

      {/* Price */}
      <Card>
        <CardContent className="p-4">
          {displayCustomPrice ? (
            // Custom price set by the sharer
            <div>
              <p className="text-xs text-muted-foreground mb-1">قیمت</p>
              <p className="text-xl font-bold text-primary">
                {formatToman(link.customPrice!)}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {isSale && file.salePrice && (
                <div>
                  <p className="text-xs text-muted-foreground">قیمت فروش</p>
                  <p className="text-xl font-bold text-primary">{formatToman(file.salePrice)}</p>
                </div>
              )}
              {isRent && file.depositAmount && (
                <div>
                  <p className="text-xs text-muted-foreground">رهن</p>
                  <p className="text-lg font-semibold text-primary">{formatToman(file.depositAmount)}</p>
                </div>
              )}
              {isRent && file.rentAmount && (
                <div>
                  <p className="text-xs text-muted-foreground">اجاره ماهانه</p>
                  <p className="text-lg font-semibold text-primary">{formatToman(file.rentAmount)}</p>
                </div>
              )}
              {!file.salePrice && !file.depositAmount && !file.rentAmount && (
                <p className="text-sm text-muted-foreground">قیمت درخواستی — تماس بگیرید</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Home className="h-4 w-4" />
            مشخصات ملک
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
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
                  {file.totalFloors &&
                    ` از ${file.totalFloors.toLocaleString("fa-IR")}`}
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
          {(file.hasElevator ||
            file.hasParking ||
            file.hasStorage ||
            file.hasBalcony ||
            file.hasSecurity) && (
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

      {/* Location map — shown only when coordinates are available. Neighborhood only, no exact address. */}
      {file.latitude !== null && file.longitude !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              موقعیت
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <MapView lat={file.latitude} lng={file.longitude} height="h-48" />
            <LocationAnalysisDisplay analysis={parseLocationAnalysis(file.locationAnalysis)} />
          </CardContent>
        </Card>
      )}

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

      {/* CTA */}
      <div className="rounded-xl border bg-accent/50 px-5 py-4 text-center space-y-1">
        <p className="text-sm font-medium">برای اطلاعات بیشتر با دفتر مراجعه نمایید</p>
        <p className="text-xs text-muted-foreground">{file.office.name}</p>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground pb-4">ارائه‌شده توسط سامانه املاک‌یار</p>
    </div>
  )
}

function AmenityTag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium">{label}</span>
  )
}
