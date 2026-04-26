"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Pencil, Trash2, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Plan } from "@/types"

interface Branch {
  id: string
  name: string
  address: string | null
  isHeadquarters: boolean
  managerId: string | null
  manager: { id: string; displayName: string } | null
  _count: { users: number; files: number; customers: number }
}

interface TeamBranchesSectionProps {
  plan: Plan
  initialMultiBranchEnabled: boolean
  initialShareFiles: boolean
  initialShareCustomers: boolean
}

export function TeamBranchesSection({
  plan,
  initialMultiBranchEnabled,
  initialShareFiles,
  initialShareCustomers,
}: TeamBranchesSectionProps) {
  const router = useRouter()
  const [multiBranchEnabled, setMultiBranchEnabled] = useState(initialMultiBranchEnabled)
  const [shareFiles, setShareFiles] = useState(initialShareFiles)
  const [shareCustomers, setShareCustomers] = useState(initialShareCustomers)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [enableConfirmOpen, setEnableConfirmOpen] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editor dialog
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", address: "" })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true)
    try {
      const res = await fetch("/api/branches")
      const body = await res.json()
      if (body.success) setBranches(body.data as Branch[])
    } catch {
      // Silent — error state covered elsewhere
    } finally {
      setLoadingBranches(false)
    }
  }, [])

  // Notify the dashboard's BranchSwitcher (mounted in DashboardShell, separate
  // tree) so it refreshes its own cached list when we mutate branches here.
  const notifyBranchListChanged = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("branch-list-changed"))
    }
  }, [])

  useEffect(() => {
    if (multiBranchEnabled) {
      fetchBranches()
    }
  }, [multiBranchEnabled, fetchBranches])

  // Plan gate: only TEAM can use this feature. Show CTA for other plans.
  if (plan !== "TEAM") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <Building2 className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">قابلیت چند شعبه</p>
        <p className="mt-1 text-xs text-muted-foreground">
          این قابلیت فقط در پلن تیم فعال است. برای ایجاد شعبه‌های مستقل و مدیریت هر شعبه توسط مدیر شعبه، به پلن تیم ارتقا دهید.
        </p>
        <Button asChild size="sm" className="mt-4">
          <a href="#billing">ارتقا به پلن تیم</a>
        </Button>
      </div>
    )
  }

  async function handleEnable() {
    setEnabling(true)
    setError(null)
    try {
      const res = await fetch("/api/branches/enable", { method: "POST" })
      const body = await res.json()
      if (!body.success) {
        setError(body.error ?? "خطا در فعال‌سازی")
      } else {
        setMultiBranchEnabled(true)
        setEnableConfirmOpen(false)
        notifyBranchListChanged()
        router.refresh()
      }
    } catch {
      setError("خطا در اتصال به سرور")
    } finally {
      setEnabling(false)
    }
  }

  async function handleToggleShareFiles(value: boolean) {
    setShareFiles(value)
    await fetch("/api/branches/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareFilesAcrossBranches: value }),
    }).catch(() => setShareFiles(!value))
  }

  async function handleToggleShareCustomers(value: boolean) {
    setShareCustomers(value)
    await fetch("/api/branches/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareCustomersAcrossBranches: value }),
    }).catch(() => setShareCustomers(!value))
  }

  function openCreate() {
    setEditingBranch(null)
    setForm({ name: "", address: "" })
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(branch: Branch) {
    setEditingBranch(branch)
    setForm({ name: branch.name, address: branch.address ?? "" })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("نام شعبه الزامی است")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const url = editingBranch ? `/api/branches/${editingBranch.id}` : "/api/branches"
      const method = editingBranch ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || null,
        }),
      })
      const body = await res.json()
      if (!body.success) {
        setFormError(body.error ?? "خطا در ذخیره")
      } else {
        setDialogOpen(false)
        await fetchBranches()
        notifyBranchListChanged()
      }
    } catch {
      setFormError("خطا در اتصال به سرور")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingBranch) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/branches/${deletingBranch.id}`, { method: "DELETE" })
      const body = await res.json()
      if (body.success) {
        setDeletingBranch(null)
        await fetchBranches()
        notifyBranchListChanged()
      } else {
        setError(body.error ?? "خطا در حذف")
      }
    } catch {
      setError("خطا در اتصال به سرور")
    } finally {
      setDeleting(false)
    }
  }

  // Not enabled yet — show enablement card
  if (!multiBranchEnabled) {
    return (
      <>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">فعال‌سازی چند شعبه</p>
              <p className="mt-1 text-xs text-muted-foreground">
                با فعال کردن این قابلیت می‌توانید برای دفتر خود چند شعبه مستقل ایجاد کنید. هر شعبه می‌تواند مدیر و کاربران خود را داشته باشد و شما می‌توانید تصمیم بگیرید که فایل‌ها و مشتریان بین شعبه‌ها به اشتراک گذاشته شوند یا مجزا بمانند.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setEnableConfirmOpen(true)}
              >
                فعال‌سازی چند شعبه
              </Button>
              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            </div>
          </div>
        </div>

        <AlertDialog open={enableConfirmOpen} onOpenChange={setEnableConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>فعال‌سازی چند شعبه؟</AlertDialogTitle>
              <AlertDialogDescription>
                یک شعبه مرکزی به نام «دفتر مرکزی» ایجاد خواهد شد و تمام کاربران، فایل‌ها و مشتریان فعلی به این شعبه منتقل می‌شوند. سپس می‌توانید شعبه‌های جدید اضافه کنید.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enabling}>انصراف</AlertDialogCancel>
              <AlertDialogAction onClick={handleEnable} disabled={enabling}>
                {enabling && <Loader2 className="ml-2 size-4 animate-spin" />}
                فعال‌سازی
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // Enabled — show branch list + sharing toggles
  return (
    <div className="space-y-6">
      {/* Sharing toggles */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Label htmlFor="share-files" className="text-sm font-medium">
              اشتراک فایل‌ها بین شعبه‌ها
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              اگر فعال باشد، کاربران هر شعبه می‌توانند فایل‌های شعبه‌های دیگر را ببینند.
            </p>
          </div>
          <Switch
            id="share-files"
            checked={shareFiles}
            onCheckedChange={handleToggleShareFiles}
          />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Label htmlFor="share-customers" className="text-sm font-medium">
              اشتراک مشتریان بین شعبه‌ها
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              اگر فعال باشد، مشتریان بین تمام شعبه‌ها مشترک هستند.
            </p>
          </div>
          <Switch
            id="share-customers"
            checked={shareCustomers}
            onCheckedChange={handleToggleShareCustomers}
          />
        </div>
      </div>

      {/* Branch list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">شعبه‌ها</p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="ml-1 size-4" />
            شعبه جدید
          </Button>
        </div>

        {loadingBranches ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : branches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            هنوز شعبه‌ای ثبت نشده است
          </div>
        ) : (
          <ul className="space-y-2">
            {branches.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    {b.isHeadquarters && (
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        مرکزی
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {b.manager?.displayName
                      ? `مدیر: ${b.manager.displayName} · `
                      : "بدون مدیر · "}
                    {b._count.users.toLocaleString("fa-IR")} کاربر ·{" "}
                    {b._count.files.toLocaleString("fa-IR")} فایل ·{" "}
                    {b._count.customers.toLocaleString("fa-IR")} مشتری
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                    <Pencil className="size-4" />
                  </Button>
                  {!b.isHeadquarters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingBranch(b)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? "ویرایش شعبه" : "شعبه جدید"}
            </DialogTitle>
            <DialogDescription>
              نام شعبه و آدرس آن را وارد کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="branch-name">نام شعبه</Label>
              <Input
                id="branch-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثلاً شعبه شمال"
              />
            </div>
            <div>
              <Label htmlFor="branch-address">آدرس (اختیاری)</Label>
              <Input
                id="branch-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              انصراف
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="ml-2 size-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deletingBranch !== null}
        onOpenChange={(v) => !v && setDeletingBranch(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف شعبه؟</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف شعبه «{deletingBranch?.name}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="ml-2 size-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
