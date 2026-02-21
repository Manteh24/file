"use client"

import { useState } from "react"
import { Send, Loader2, ChevronsUpDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface Contact {
  name: string | null
  phone: string
}

interface SmsPanelProps {
  // Pre-filled phone — e.g. from a customer record. User can still edit it.
  defaultPhone?: string
  // Pre-filled message — e.g. from a template. User can edit before sending.
  defaultMessage: string
  // File contacts (owner, tenant, etc.) shown in the first group of the combobox.
  contacts?: Contact[]
  // CRM customers (BUYER/RENTER) shown in the second group of the combobox.
  customers?: Contact[]
}

export function SmsPanel({
  defaultPhone = "",
  defaultMessage,
  contacts,
  customers,
}: SmsPanelProps) {
  const [phone, setPhone] = useState(defaultPhone)
  const [message, setMessage] = useState(defaultMessage)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Combobox state
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)

  const hasContacts = contacts && contacts.length > 0
  const hasCustomers = customers && customers.length > 0
  const showCombobox = hasContacts || hasCustomers

  function handleSelect(contact: Contact) {
    setPhone(contact.phone)
    setSelectedLabel(contact.name ? `${contact.name} — ${contact.phone}` : contact.phone)
    setOpen(false)
  }

  async function handleSend() {
    setSending(true)
    setResult(null)

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), message: message.trim() }),
      })
      const body = await res.json()
      if (body.success) {
        setResult({ type: "success", text: "پیامک با موفقیت ارسال شد" })
      } else {
        setResult({ type: "error", text: body.error ?? "خطا در ارسال پیامک" })
      }
    } catch {
      setResult({ type: "error", text: "خطا در ارتباط با سرور" })
    } finally {
      setSending(false)
    }
  }

  const canSend = phone.trim().length > 0 && message.trim().length > 0 && !sending

  return (
    <div className="space-y-3">
      {/* Grouped combobox — shown when file contacts or CRM customers are available */}
      {showCombobox && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">انتخاب مخاطب</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal"
              >
                <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
                  {selectedLabel ?? "جستجو در مخاطبین و مشتریان..."}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 rtl:mr-2 ltr:ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="جستجوی نام یا شماره..." />
                <CommandList>
                  <CommandEmpty>نتیجه‌ای یافت نشد</CommandEmpty>

                  {hasContacts && (
                    <CommandGroup heading="مخاطبین فایل">
                      {contacts!.map((c) => (
                        <CommandItem
                          key={c.phone}
                          value={`${c.name ?? ""} ${c.phone}`}
                          onSelect={() => handleSelect(c)}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            {c.name && (
                              <p className="truncate text-sm font-medium">{c.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground" dir="ltr">
                              {c.phone}
                            </p>
                          </div>
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              phone === c.phone ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {hasContacts && hasCustomers && <CommandSeparator />}

                  {hasCustomers && (
                    <CommandGroup heading="مشتریان">
                      {customers!.map((c) => (
                        <CommandItem
                          key={c.phone}
                          value={`${c.name ?? ""} ${c.phone}`}
                          onSelect={() => handleSelect(c)}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            {c.name && (
                              <p className="truncate text-sm font-medium">{c.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground" dir="ltr">
                              {c.phone}
                            </p>
                          </div>
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              phone === c.phone ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Phone input — always shown, editable */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">شماره موبایل گیرنده</label>
        <input
          type="text"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09123456789"
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          dir="ltr"
        />
      </div>

      {/* Message textarea */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">متن پیامک</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="متن پیامک را اینجا بنویسید..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground text-end">
          {message.length} / ۵۰۰
        </p>
      </div>

      {/* Result feedback */}
      {result && (
        <p className={`text-xs ${result.type === "success" ? "text-green-600" : "text-destructive"}`}>
          {result.text}
        </p>
      )}

      <Button size="sm" onClick={handleSend} disabled={!canSend}>
        {sending ? (
          <Loader2 className="h-3.5 w-3.5 rtl:ml-1.5 ltr:mr-1.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5 rtl:ml-1.5 ltr:mr-1.5" />
        )}
        ارسال پیامک
      </Button>
    </div>
  )
}
