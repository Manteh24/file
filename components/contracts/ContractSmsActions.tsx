"use client"

import { useState } from "react"
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmsPanel } from "@/components/shared/SmsPanel"
import { buildRatingRequestMessage, buildRentFollowupMessage } from "@/lib/sms"

interface Contact {
  name: string | null
  phone: string
}

interface ContractSmsActionsProps {
  contacts: Contact[]
  agentName: string
  officeName: string
  transactionType: string
}

type ActivePanel = "rating" | "rentFollowup" | null

export function ContractSmsActions({
  contacts,
  agentName,
  officeName,
  transactionType,
}: ContractSmsActionsProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  function toggle(panel: ActivePanel) {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  const ratingMessage = buildRatingRequestMessage({ agentName, officeName })
  const rentFollowupMessage = buildRentFollowupMessage({ officeName })
  const isRental = transactionType === "LONG_TERM_RENT"

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          ارسال پیامک
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activePanel === "rating" ? "default" : "outline"}
            onClick={() => toggle("rating")}
          >
            پیامک رضایت‌سنجی
            {activePanel === "rating" ? (
              <ChevronUp className="h-3.5 w-3.5 rtl:mr-1.5 ltr:ml-1.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 rtl:mr-1.5 ltr:ml-1.5" />
            )}
          </Button>

          {isRental && (
            <Button
              size="sm"
              variant={activePanel === "rentFollowup" ? "default" : "outline"}
              onClick={() => toggle("rentFollowup")}
            >
              پیامک پیگیری اجاره
              {activePanel === "rentFollowup" ? (
                <ChevronUp className="h-3.5 w-3.5 rtl:mr-1.5 ltr:ml-1.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 rtl:mr-1.5 ltr:ml-1.5" />
              )}
            </Button>
          )}
        </div>

        {/* Rating SMS panel */}
        {activePanel === "rating" && (
          <div className="rounded-lg border bg-accent/30 p-3">
            <SmsPanel
              defaultMessage={ratingMessage}
              contacts={contacts}
            />
          </div>
        )}

        {/* Rent follow-up SMS panel */}
        {activePanel === "rentFollowup" && (
          <div className="rounded-lg border bg-accent/30 p-3">
            <SmsPanel
              defaultMessage={rentFollowupMessage}
              contacts={contacts}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
