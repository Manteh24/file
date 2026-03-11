import { MapPin, Home, Building2, AlertTriangle, Phone, MessageSquare } from "lucide-react"
import { db } from "@/lib/db"
import { formatToman } from "@/lib/utils"
import { parseLocationAnalysis } from "@/lib/maps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapView } from "@/components/shared/MapView"
import { LocationAnalysisDisplay } from "@/components/files/LocationAnalysisDisplay"
import { PhotoGallery } from "@/components/files/PhotoGallery"

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
      createdBy: {
        select: { displayName: true, avatarUrl: true, phone: true, bio: true },
      },
      file: {
        include: {
          office: {
            select: {
              name: true,
              phone: true,
              logoUrl: true,
              officeBio: true,
              subscription: { select: { plan: true } },
            },
          },
          photos: { orderBy: { order: "asc" as const } },
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

  // Show custom prices when at least one override is set
  const hasCustomPrice = link.customPrice != null || link.customDepositAmount != null
  const isLongTermRent = file.transactionType === "LONG_TERM_RENT"

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

      {/* Photos */}
      {file.photos.length > 0 && (
        <PhotoGallery
          initialPhotos={file.photos.map((p) => ({
            ...p,
            createdAt: new Date(p.createdAt),
          }))}
          fileId={file.id}
          canEdit={false}
        />
      )}

      {/* Price */}
      <Card>
        <CardContent className="p-4">
          {hasCustomPrice ? (
            // Custom price(s) set by the sharer — show overrides only
            <div className="space-y-2">
              {isLongTermRent ? (
                <>
                  {link.customDepositAmount != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">رهن</p>
                      <p className="text-lg font-semibold text-primary">
                        {formatToman(link.customDepositAmount)}
                      </p>
                    </div>
                  )}
                  {link.customPrice != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">اجاره ماهانه</p>
                      <p className="text-lg font-semibold text-primary">
                        {formatToman(link.customPrice)}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">قیمت</p>
                  <p className="text-xl font-bold text-primary">
                    {formatToman(link.customPrice!)}
                  </p>
                </div>
              )}
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

      {/* Agent contact card */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">مشاور ملک</p>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="h-14 w-14 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center overflow-hidden">
              {link.createdBy.avatarUrl ? (
                <img
                  src={link.createdBy.avatarUrl}
                  alt={link.createdBy.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold">{link.createdBy.displayName.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base">{link.createdBy.displayName}</p>
              {link.createdBy.bio && (
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{link.createdBy.bio}</p>
              )}
              {link.createdBy.phone && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <a
                    href={`tel:${link.createdBy.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    تماس
                  </a>
                  <a
                    href={`sms:${link.createdBy.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    پیامک
                  </a>
                </div>
              )}
              {!link.createdBy.phone && (
                <p className="text-xs text-muted-foreground mt-2">برای تماس با دفتر مراجعه کنید</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Office card */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">دفتر مسکن</p>
          <div className="flex items-start gap-4">
            {/* Office logo */}
            <div className="h-14 w-14 shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
              {file.office.logoUrl ? (
                <img
                  src={file.office.logoUrl}
                  alt={file.office.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base">{file.office.name}</p>
              {file.office.officeBio && (
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{file.office.officeBio}</p>
              )}
              {file.office.phone && (
                <a
                  href={`tel:${file.office.phone}`}
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {file.office.phone}
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer — FREE plan shows powered-by watermark */}
      {file.office.subscription?.plan === "FREE" ? (
        <p className="text-center text-xs text-muted-foreground pb-4">
          ساخته شده با{" "}
          <a href="/pricing" className="font-medium text-primary hover:underline">
            سرایار
          </a>
        </p>
      ) : (
        <p className="text-center text-xs text-muted-foreground pb-4">ارائه‌شده توسط سامانه املاکبین</p>
      )}
    </div>
  )
}

function AmenityTag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium">{label}</span>
  )
}
