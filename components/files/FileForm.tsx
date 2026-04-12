"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, type Resolver } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { Plus, Trash2, Sparkles, MapPin, Wifi, WifiOff, ChevronDown } from "lucide-react"
import { createFileSchema, type CreateFileInput } from "@/lib/validations/file"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { PriceInput } from "@/components/forms/PriceInput"
import { LocationPicker } from "@/components/files/LocationPicker"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"
import { useDraft } from "@/hooks/useDraft"
import { usePlanStatus } from "@/hooks/usePlanStatus"
import { toFarsiDigits, parseFarsiNumber } from "@/lib/utils"
import { LocationAnalysisDisplay } from "@/components/files/LocationAnalysisDisplay"
import type { PropertyFileDetail, LocationAnalysis } from "@/types"
import type { DescriptionTone } from "@/lib/ai"

interface FileFormProps {
  // When provided, the form is in edit mode
  initialData?: Partial<PropertyFileDetail>
  fileId?: string
  // Pre-loaded location analysis from DB (edit mode only)
  initialLocationAnalysis?: LocationAnalysis | null
  // Used to scope the IndexedDB draft to this user so different users on the same browser don't share drafts
  userId?: string
  // Role determines which UpgradePrompt copy is shown on plan limit errors
  role?: "MANAGER" | "AGENT"
}

const TRANSACTION_TYPE_OPTIONS = [
  { value: "SALE", label: "فروش" },
  { value: "LONG_TERM_RENT", label: "اجاره بلندمدت" },
  { value: "SHORT_TERM_RENT", label: "اجاره کوتاه‌مدت" },
  { value: "PRE_SALE", label: "پیش‌فروش" },
] as const

const PROPERTY_TYPE_OPTIONS = [
  { value: "APARTMENT", label: "آپارتمان" },
  { value: "HOUSE", label: "خانه" },
  { value: "VILLA", label: "ویلا" },
  { value: "LAND", label: "زمین" },
  { value: "COMMERCIAL", label: "مغازه" },
  { value: "OFFICE", label: "دفتر" },
  { value: "OTHER", label: "سایر" },
] as const

const CONTACT_TYPE_OPTIONS = [
  { value: "OWNER", label: "مالک" },
  { value: "TENANT", label: "مستاجر" },
  { value: "LANDLORD", label: "موجر" },
  { value: "BUYER", label: "خریدار" },
] as const

const TONE_OPTIONS: { value: DescriptionTone; label: string }[] = [
  { value: "formal", label: "رسمی" },
  { value: "standard", label: "معمولی" },
  { value: "compelling", label: "جذاب" },
]

export function FileForm({ initialData, fileId, initialLocationAnalysis, userId, role }: FileFormProps) {
  const router = useRouter()
  const isEdit = !!fileId

  const [isExpanded, setIsExpanded] = useState(false)
  const [aiTone, setAiTone] = useState<DescriptionTone>("standard")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [filePlanLimit, setFilePlanLimit] = useState(false)
  const [aiPlanLimit, setAiPlanLimit] = useState(false)
  const [locationAnalysis, setLocationAnalysis] = useState<LocationAnalysis | null>(
    initialLocationAnalysis ?? null
  )
  const [savedFileId, setSavedFileId] = useState<string | null>(fileId ?? null)

  // ── Offline / draft state ──────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(true)
  const [justCameOnline, setJustCameOnline] = useState(false)
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasDraftRef = useRef(false)

  const { draft, isLoading: draftLoading, hasDraft, saveDraft, clearDraft } = useDraft(userId)
  const { isAtLimit: isPlanAtLimit, isNearLimit: isPlanNearLimit } = usePlanStatus()

  // Keep ref in sync so the online event handler always sees the latest value
  hasDraftRef.current = hasDraft

  // Detect online/offline transitions
  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (!isEdit && hasDraftRef.current) setJustCameOnline(true)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setJustCameOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [isEdit]) // isEdit is stable — effect runs once

  const form = useForm<CreateFileInput>({
    // Cast needed: standardSchemaResolver's return type has a different third generic
    // than useForm<CreateFileInput> expects. Runtime behavior is correct.
    resolver: standardSchemaResolver(createFileSchema) as Resolver<CreateFileInput>,
    defaultValues: {
      transactionType: (initialData?.transactionType as CreateFileInput["transactionType"]) ?? "SALE",
      propertyType: initialData?.propertyType ?? undefined,
      area: initialData?.area ?? undefined,
      floorNumber: initialData?.floorNumber ?? undefined,
      totalFloors: initialData?.totalFloors ?? undefined,
      buildingAge: initialData?.buildingAge ?? undefined,
      salePrice: initialData?.salePrice ?? undefined,
      depositAmount: initialData?.depositAmount ?? undefined,
      rentAmount: initialData?.rentAmount ?? undefined,
      latitude: initialData?.latitude ?? undefined,
      longitude: initialData?.longitude ?? undefined,
      address: initialData?.address ?? "",
      neighborhood: initialData?.neighborhood ?? "",
      description: initialData?.description ?? "",
      notes: initialData?.notes ?? "",
      hasElevator: initialData?.hasElevator ?? false,
      hasParking: initialData?.hasParking ?? false,
      hasStorage: initialData?.hasStorage ?? false,
      hasBalcony: initialData?.hasBalcony ?? false,
      hasSecurity: initialData?.hasSecurity ?? false,
      hasGym: initialData?.hasGym ?? false,
      hasPool: initialData?.hasPool ?? false,
      hasWesternToilet: initialData?.hasWesternToilet ?? false,
      hasSmartHome: initialData?.hasSmartHome ?? false,
      hasSauna: initialData?.hasSauna ?? false,
      hasJacuzzi: initialData?.hasJacuzzi ?? false,
      hasRoofGarden: initialData?.hasRoofGarden ?? false,
      contacts:
        initialData?.contacts?.map((c) => ({
          type: c.type,
          name: c.name ?? "",
          phone: c.phone,
          notes: c.notes ?? "",
        })) ?? [{ type: "OWNER", name: "", phone: "", notes: "" }],
    },
  })

  // Auto-save form changes to IndexedDB draft (create mode only, 1.5 s debounce).
  // Only saves when the user has actually changed something (isDirty) to avoid
  // persisting the initial default values and showing a false draft-restore banner.
  useEffect(() => {
    if (isEdit) return

    const subscription = form.watch((values) => {
      if (!form.formState.isDirty) return
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(() => {
        void saveDraft(values as CreateFileInput)
      }, 1500)
    })

    return () => {
      subscription.unsubscribe()
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [isEdit, form, saveDraft])

  const { fields: contactFields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  })

  const transactionType = form.watch("transactionType")
  const showSalePrice = transactionType === "SALE" || transactionType === "PRE_SALE"
  const showRentFields =
    transactionType === "LONG_TERM_RENT" || transactionType === "SHORT_TERM_RENT"

  async function onSubmit(values: CreateFileInput) {
    // Offline: save to draft only, do not call the server
    if (!isOnline) {
      await saveDraft(values)
      form.setError("root", {
        message: "اتصال به اینترنت قطع است. اطلاعات به صورت محلی ذخیره شد.",
      })
      return
    }

    const url = isEdit ? `/api/files/${fileId}` : "/api/files"
    const method = isEdit ? "PATCH" : "POST"

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    const result = (await response.json()) as {
      success: boolean
      data?: { id: string }
      error?: string
      code?: string
    }

    if (!result.success) {
      if (result.code === "PLAN_LIMIT_EXCEEDED") {
        setFilePlanLimit(true)
        return
      }
      form.setError("root", { message: result.error ?? "خطا در ذخیره فایل" })
      return
    }

    const targetId = isEdit ? fileId! : result.data?.id
    if (targetId) setSavedFileId(targetId)

    // Persist location analysis to DB so the detail page can display it
    const formValues = form.getValues()
    if (targetId && formValues.latitude !== undefined && formValues.longitude !== undefined) {
      try {
        await fetch(`/api/files/${targetId}/analyze-location`, { method: "POST" })
      } catch {
        // Non-critical — analysis failure doesn't block navigation
      }
    }

    // Clear the local draft after a successful server save
    if (!isEdit) await clearDraft()

    router.push(`/files/${targetId}`)
    router.refresh()
  }

  async function handlePinDrop(lat: number, lng: number) {
    form.setValue("latitude", lat, { shouldDirty: true })
    form.setValue("longitude", lng, { shouldDirty: true })

    // Fetch address and location analysis in parallel
    const [geoOutcome, analysisOutcome] = await Promise.allSettled([
      fetch(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`).then((r) => r.json() as Promise<{ success: boolean; data?: { address: string | null } }>),
      fetch(`/api/maps/location-analysis?lat=${lat}&lng=${lng}`).then((r) => r.json() as Promise<{ success: boolean; data?: LocationAnalysis }>),
    ])

    if (geoOutcome.status === "fulfilled" && geoOutcome.value.success && geoOutcome.value.data?.address) {
      form.setValue("address", geoOutcome.value.data.address, { shouldDirty: true })
    }

    if (analysisOutcome.status === "fulfilled" && analysisOutcome.value.success && analysisOutcome.value.data) {
      setLocationAnalysis(analysisOutcome.value.data)
    }
  }

  async function handleGenerateDescription() {
    setAiError(null)
    setAiLoading(true)

    const values = form.getValues()
    // Build a compact location context string from analysis for the AI prompt
    let locationContext: string | null = null
    if (locationAnalysis) {
      const parts: string[] = []
      if (locationAnalysis.transitWalkingMinutes !== undefined) {
        parts.push(`${locationAnalysis.transitWalkingMinutes} دقیقه تا حمل‌ونقل عمومی`)
      }
      const parks = locationAnalysis.nearbyPOIs.filter((p) => p.category === "park").length
      const schools = locationAnalysis.nearbyPOIs.filter((p) => p.category === "school").length
      const hospitals = locationAnalysis.nearbyPOIs.filter((p) => p.category === "hospital").length
      if (parks > 0) parts.push(`${parks} پارک مجاور`)
      if (schools > 0) parts.push(`مدرسه در نزدیکی`)
      if (hospitals > 0) parts.push(`بیمارستان در نزدیکی`)
      if (parts.length > 0) locationContext = parts.join("، ")
    }

    const payload = {
      transactionType: values.transactionType,
      propertyType: values.propertyType ?? null,
      area: values.area ?? null,
      floorNumber: values.floorNumber ?? null,
      totalFloors: values.totalFloors ?? null,
      buildingAge: values.buildingAge ?? null,
      salePrice: values.salePrice ?? null,
      depositAmount: values.depositAmount ?? null,
      rentAmount: values.rentAmount ?? null,
      address: values.address ?? null,
      neighborhood: values.neighborhood ?? null,
      hasElevator: values.hasElevator,
      hasParking: values.hasParking,
      hasStorage: values.hasStorage,
      hasBalcony: values.hasBalcony,
      hasSecurity: values.hasSecurity,
      hasGym: values.hasGym,
      hasPool: values.hasPool,
      hasWesternToilet: values.hasWesternToilet,
      hasSmartHome: values.hasSmartHome,
      hasSauna: values.hasSauna,
      hasJacuzzi: values.hasJacuzzi,
      hasRoofGarden: values.hasRoofGarden,
      locationContext,
      tone: aiTone,
    }

    try {
      const response = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as {
        success: boolean
        data?: { description: string }
        error?: string
        code?: string
      }

      if (!result.success) {
        if (result.code === "PLAN_LIMIT_EXCEEDED") {
          setAiPlanLimit(true)
        } else {
          setAiError(result.error ?? "خطا در تولید توضیحات")
        }
      } else if (!result.data?.description) {
        setAiError("خطا در تولید توضیحات")
      } else {
        form.setValue("description", result.data.description, { shouldDirty: true })
      }
    } catch {
      setAiError("خطا در اتصال به سرویس هوش مصنوعی")
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* Draft restore banner — shown in create mode when a previous draft is available */}
        {!isEdit && hasDraft && !draftBannerDismissed && !draftLoading && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-amber-800 dark:text-amber-200">
              پیش‌نویس ذخیره‌شده‌ای موجود است. آیا می‌خواهید بازیابی کنید؟
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-amber-300 hover:bg-amber-100 dark:border-amber-700"
                onClick={() => {
                  if (draft) form.reset(draft.formData)
                  setDraftBannerDismissed(true)
                }}
              >
                بازیابی
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  void clearDraft()
                  setDraftBannerDismissed(true)
                }}
              >
                رد کردن
              </Button>
            </div>
          </div>
        )}

        {/* Reconnect banner — shown when coming back online with a draft pending */}
        {!isEdit && justCameOnline && hasDraft && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <Wifi className="h-4 w-4 shrink-0" />
              <p>اتصال برقرار شد. پیش‌نویس آماده ارسال است.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  setJustCameOnline(false)
                  await form.handleSubmit(onSubmit)()
                }}
              >
                ارسال به سرور
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setJustCameOnline(false)}
              >
                بعداً
              </Button>
            </div>
          </div>
        )}

        {/* Transaction Type */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">نوع معامله</h2>
          <FormField
            control={form.control}
            name="transactionType"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        field.value === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Property Details — optional in create mode */}
        {(isExpanded || isEdit) && <section className="space-y-4">
          <h2 className="text-base font-semibold">مشخصات ملک</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="propertyType"
              render={({ field }) => (
                <FormItem className="col-span-2 sm:col-span-3">
                  <FormLabel>نوع ملک</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                          field.value === opt.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-accent"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>متراژ (متر)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="مثال: ۱۲۰"
                      value={field.value !== undefined ? toFarsiDigits(field.value) : ""}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v && !/^[0-9\u06F0-\u06F9]+$/.test(v)) return
                        field.onChange(parseFarsiNumber(v))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="floorNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>طبقه</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="مثال: ۳"
                      value={field.value !== undefined ? toFarsiDigits(field.value) : ""}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v && !/^[0-9\u06F0-\u06F9]+$/.test(v)) return
                        field.onChange(parseFarsiNumber(v))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalFloors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>کل طبقات</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="مثال: ۵"
                      value={field.value !== undefined ? toFarsiDigits(field.value) : ""}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v && !/^[0-9\u06F0-\u06F9]+$/.test(v)) return
                        field.onChange(parseFarsiNumber(v))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buildingAge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سن بنا (سال)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="مثال: ۵"
                      value={field.value !== undefined ? toFarsiDigits(field.value) : ""}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v && !/^[0-9\u06F0-\u06F9]+$/.test(v)) return
                        field.onChange(parseFarsiNumber(v))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>}

        {/* Price — optional in create mode */}
        {(isExpanded || isEdit) && <section className="space-y-4">
          <h2 className="text-base font-semibold">قیمت</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {showSalePrice && (
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>قیمت فروش (تومان)</FormLabel>
                    <FormControl>
                      <PriceInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="مثال: ۵۰۰,۰۰۰,۰۰۰"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {showRentFields && (
              <>
                {transactionType === "LONG_TERM_RENT" && (
                  <FormField
                    control={form.control}
                    name="depositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رهن (تومان)</FormLabel>
                        <FormControl>
                          <PriceInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="مثال: ۱۰۰,۰۰۰,۰۰۰"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اجاره ماهانه (تومان)</FormLabel>
                      <FormControl>
                        <PriceInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="مثال: ۵,۰۰۰,۰۰۰"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
        </section>}

        {/* Location */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">موقعیت</h2>

          {/* Map pin drop */}
          <LocationPicker
            lat={form.watch("latitude")}
            lng={form.watch("longitude")}
            onPinDrop={handlePinDrop}
          />

          {/* Pin confirmation badge */}
          {form.watch("latitude") !== undefined && form.watch("longitude") !== undefined && (
            <div className="flex items-center gap-1.5 text-sm text-primary">
              <MapPin className="h-4 w-4" />
              <span>موقعیت روی نقشه انتخاب شد</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>آدرس <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="آدرس کامل ملک را وارد کنید" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>محله / منطقه</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: جردن" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Location analysis shown immediately after pin drop */}
          {locationAnalysis && (
            <div className="rounded-lg border p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">تحلیل موقعیت</p>
              <LocationAnalysisDisplay analysis={locationAnalysis} />
            </div>
          )}
        </section>

        {/* Amenities — optional in create mode */}
        {(isExpanded || isEdit) && <section className="space-y-4">
          <h2 className="text-base font-semibold">امکانات</h2>
          <div className="flex flex-wrap gap-3">
            {(
              [
                { name: "hasElevator", label: "آسانسور" },
                { name: "hasParking", label: "پارکینگ" },
                { name: "hasStorage", label: "انباری" },
                { name: "hasBalcony", label: "بالکن" },
                { name: "hasSecurity", label: "نگهبانی" },
                { name: "hasGym", label: "باشگاه بدنسازی" },
                { name: "hasPool", label: "استخر" },
                { name: "hasWesternToilet", label: "توالت فرنگی" },
                { name: "hasSmartHome", label: "خانه هوشمند" },
                { name: "hasSauna", label: "سونا" },
                { name: "hasJacuzzi", label: "جکوزی" },
                { name: "hasRoofGarden", label: "روف گاردن" },
              ] as const
            ).map(({ name, label }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      field.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                )}
              />
            ))}
          </div>
        </section>}

        {/* Contacts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              مخاطبین <span className="text-destructive">*</span>
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ type: "OWNER", name: "", phone: "", notes: "" })}
            >
              <Plus className="h-4 w-4 rtl:ml-1 ltr:mr-1" />
              افزودن مخاطب
            </Button>
          </div>

          {contactFields.map((field, index) => (
            <div key={field.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {CONTACT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setValue(`contacts.${index}.type`, opt.value)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                        form.watch(`contacts.${index}.type`) === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {contactFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`contacts.${index}.name`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>نام</FormLabel>
                      <FormControl>
                        <Input placeholder="نام مخاطب" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`contacts.${index}.phone`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>شماره تماس <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
                          dir="ltr"
                          {...f}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}

          {form.formState.errors.contacts?.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.contacts.root.message}
            </p>
          )}
          {typeof form.formState.errors.contacts?.message === "string" && (
            <p className="text-sm text-destructive">
              {form.formState.errors.contacts.message}
            </p>
          )}
        </section>

        {/* Expand toggle — create mode only */}
        {!isEdit && (
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[var(--color-border-default)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            {isExpanded ? "بستن جزئیات" : "تکمیل فایل"}
          </button>
        )}

        {/* Description — optional in create mode */}
        {(isExpanded || isEdit) && <section className="space-y-4">
          <h2 className="text-base font-semibold">توضیحات</h2>

          {/* AI description generator */}
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <p className="text-sm text-muted-foreground">تولید خودکار توضیحات با هوش مصنوعی</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAiTone(opt.value)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      aiTone === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateDescription}
                disabled={aiLoading || !isOnline || isPlanAtLimit("ai")}
                title={
                  !isOnline
                    ? "اتصال اینترنت برای تولید توضیحات لازم است"
                    : isPlanAtLimit("ai")
                    ? "سهمیه ماهانه هوش مصنوعی تمام شده است"
                    : undefined
                }
              >
                <Sparkles className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
                {aiLoading ? "در حال تولید..." : "تولید توضیحات"}
              </Button>
            </div>
            {/* Show near-limit info text */}
            {!aiPlanLimit && isPlanNearLimit("ai") && !isPlanAtLimit("ai") && (
              <p className="text-xs text-amber-700">به سقف ماهانه هوش مصنوعی نزدیک می‌شوید.</p>
            )}
            {aiPlanLimit && <UpgradePrompt reason="ai" role={role} />}
            {!aiPlanLimit && aiError && <p className="text-sm text-destructive">{aiError}</p>}
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>توضیحات ملک</FormLabel>
                <FormControl>
                  <textarea
                    rows={4}
                    placeholder="توضیحات ملک را وارد کنید یا از دکمه بالا برای تولید خودکار استفاده کنید..."
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>یادداشت داخلی</FormLabel>
                <FormControl>
                  <textarea
                    rows={3}
                    placeholder="یادداشت‌های داخلی (برای سایرین نمایش داده نمی‌شود)"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>}

        {/* Plan limit hit on file creation — show upgrade prompt */}
        {filePlanLimit && <UpgradePrompt reason="files" role={role} />}

        {/* Root error */}
        {!filePlanLimit && form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        {/* Offline status indicator */}
        {!isOnline && (
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-200">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              {isEdit
                ? "اتصال قطع است. لطفاً پس از اتصال مجدد تغییرات را ذخیره کنید."
                : "اتصال قطع است. اطلاعات به صورت محلی ذخیره می‌شود."}
            </span>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "در حال ذخیره..."
              : isEdit
              ? "ذخیره تغییرات"
              : isOnline
              ? isExpanded
                ? "ایجاد فایل"
                : "ایجاد سریع فایل"
              : "ذخیره محلی"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
