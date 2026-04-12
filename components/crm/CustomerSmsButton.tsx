"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SmsPanel } from "@/components/shared/SmsPanel"

interface CustomerSmsButtonProps {
  phone: string
  customerName: string
}

export function CustomerSmsButton({ phone, customerName }: CustomerSmsButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageSquare className="h-4 w-4 rtl:ml-1.5" />
        پیامک
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ارسال پیامک به {customerName}</DialogTitle>
          </DialogHeader>
          <SmsPanel defaultPhone={phone} defaultMessage="" type="bulk" />
        </DialogContent>
      </Dialog>
    </>
  )
}
