"use client"

import { useState, useEffect } from "react"
import { UserPlus, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CustomerType } from "@/types"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ContactWithMatch {
  id: string
  name: string | null
  phone: string
  type: string
  matchedCustomerId: string | null
  matchedCustomerName: string | null
  matchedCustomerTypes: CustomerType[] | null
}

interface ExistingCustomerLink {
  customerId: string
  role: CustomerType
}

interface NewCustomer {
  name: string
  phone: string
  types: CustomerType[]
  role: CustomerType
}

interface CustomerPickerProps {
  fileId: string
  onCustomerLinksChange: (links: ExistingCustomerLink[]) => void
  onNewCustomersChange: (customers: NewCustomer[]) => void
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "BUYER", label: "خریدار" },
  { value: "RENTER", label: "مستأجر" },
  { value: "SELLER", label: "فروشنده" },
  { value: "LANDLORD", label: "موجر" },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export function CustomerPicker({ fileId, onCustomerLinksChange, onNewCustomersChange }: CustomerPickerProps) {
  const [contacts, setContacts] = useState<ContactWithMatch[]>([])
  const [selectedLinks, setSelectedLinks] = useState<ExistingCustomerLink[]>([])
  const [newCustomers, setNewCustomers] = useState<NewCustomer[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newForm, setNewForm] = useState<NewCustomer>({ name: "", phone: "", types: ["BUYER"], role: "BUYER" })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!fileId) return
    setLoading(true)
    fetch(`/api/files/${fileId}/contacts-with-crm-match`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setContacts(d.data)
          // Auto-suggest matched contacts
          const autoLinks: ExistingCustomerLink[] = d.data
            .filter((c: ContactWithMatch) => c.matchedCustomerId)
            .map((c: ContactWithMatch) => ({
              customerId: c.matchedCustomerId!,
              role: c.type === "TENANT" ? "RENTER" : (c.type as CustomerType),
            }))
          setSelectedLinks(autoLinks)
          onCustomerLinksChange(autoLinks)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fileId])

  function toggleLink(customerId: string, role: CustomerType) {
    const exists = selectedLinks.find((l) => l.customerId === customerId)
    let updated: ExistingCustomerLink[]
    if (exists) {
      updated = selectedLinks.filter((l) => l.customerId !== customerId)
    } else {
      updated = [...selectedLinks, { customerId, role }]
    }
    setSelectedLinks(updated)
    onCustomerLinksChange(updated)
  }

  function updateLinkRole(customerId: string, role: CustomerType) {
    const updated = selectedLinks.map((l) => l.customerId === customerId ? { ...l, role } : l)
    setSelectedLinks(updated)
    onCustomerLinksChange(updated)
  }

  function addNewCustomer() {
    if (!newForm.name.trim() || !newForm.phone.trim()) return
    const updated = [...newCustomers, { ...newForm }]
    setNewCustomers(updated)
    onNewCustomersChange(updated)
    setNewForm({ name: "", phone: "", types: ["BUYER"], role: "BUYER" })
    setShowAddForm(false)
  }

  function removeNewCustomer(index: number) {
    const updated = newCustomers.filter((_, i) => i !== index)
    setNewCustomers(updated)
    onNewCustomersChange(updated)
  }

  if (loading) return <p className="text-sm text-muted-foreground">در حال بررسی مشتریان...</p>

  return (
    <div className="space-y-3">
      {/* Contacts from file with CRM match suggestion */}
      {contacts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">مخاطبین فایل</p>
          {contacts.map((contact) => {
            if (!contact.matchedCustomerId) return null
            const link = selectedLinks.find((l) => l.customerId === contact.matchedCustomerId)
            const isSelected = !!link
            return (
              <div key={contact.id} className={`rounded-lg border p-3 space-y-2 transition-colors ${isSelected ? "border-[var(--color-teal-400)] bg-[var(--color-teal-50-a)]" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{contact.matchedCustomerName ?? contact.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{contact.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleLink(contact.matchedCustomerId!, link?.role ?? "BUYER")}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      isSelected
                        ? "bg-[var(--color-teal-500)] text-white border-[var(--color-teal-500)]"
                        : "border-[var(--color-border-subtle)] text-muted-foreground hover:border-[var(--color-teal-400)]"
                    }`}
                  >
                    {isSelected ? "انتخاب‌شده" : "انتخاب"}
                  </button>
                </div>
                {isSelected && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground shrink-0">نقش در قرارداد:</p>
                    <div className="flex gap-1 flex-wrap">
                      {ROLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateLinkRole(contact.matchedCustomerId!, opt.value)}
                          className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                            link?.role === opt.value
                              ? "bg-[var(--color-teal-500)] text-white border-[var(--color-teal-500)]"
                              : "border-[var(--color-border-subtle)] text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* New customers added inline */}
      {newCustomers.map((nc, i) => (
        <div key={i} className="rounded-lg border p-3 bg-[var(--color-surface-2)] flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{nc.name}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">{nc.phone} · {ROLE_OPTIONS.find(r => r.value === nc.role)?.label}</p>
          </div>
          <button type="button" onClick={() => removeNewCustomer(i)} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Inline add new customer form */}
      {showAddForm ? (
        <div className="rounded-lg border p-3 space-y-3 bg-[var(--color-surface-2)]">
          <p className="text-sm font-medium">افزودن مشتری جدید</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="نام"
              value={newForm.name}
              onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="۰۹۱۲..."
              dir="ltr"
              value={newForm.phone}
              onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground shrink-0">نقش:</span>
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNewForm((f) => ({ ...f, role: opt.value, types: [opt.value] }))}
                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                  newForm.role === opt.value
                    ? "bg-[var(--color-teal-500)] text-white border-[var(--color-teal-500)]"
                    : "border-[var(--color-border-subtle)] text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addNewCustomer} disabled={!newForm.name.trim() || !newForm.phone.trim()}>
              افزودن
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              انصراف
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[var(--color-teal-600)] transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          افزودن مشتری جدید
        </button>
      )}
    </div>
  )
}
