"use client"

import Dexie, { type Table } from "dexie"
import { useState, useEffect, useCallback } from "react"
import type { CreateFileInput } from "@/lib/validations/file"

// ─── DB Schema ────────────────────────────────────────────────────────────────

const DRAFT_KEY = "new-file-draft"

interface FileDraft {
  /** Primary key — always DRAFT_KEY, one draft at a time. */
  key: string
  formData: CreateFileInput
  savedAt: Date
}

class DraftDatabase extends Dexie {
  drafts!: Table<FileDraft, string>

  constructor() {
    super("AmlakiarDrafts")
    // key is the primary key — put() with the same key overwrites the existing record
    this.version(1).stores({ drafts: "key" })
  }
}

// Lazy singleton — created on first use so the DB is never opened during SSR
let _db: DraftDatabase | null = null
function getDb(): DraftDatabase {
  if (!_db) _db = new DraftDatabase()
  return _db
}

// ─── Standalone DB helpers (exposed for testing) ──────────────────────────────

export async function loadDraftFromDb(): Promise<FileDraft | null> {
  return (await getDb().drafts.get(DRAFT_KEY)) ?? null
}

export async function saveDraftToDb(formData: CreateFileInput): Promise<void> {
  await getDb().drafts.put({ key: DRAFT_KEY, formData, savedAt: new Date() })
}

export async function clearDraftFromDb(): Promise<void> {
  await getDb().drafts.delete(DRAFT_KEY)
}

// ─── React hook ───────────────────────────────────────────────────────────────

export function useDraft() {
  const [draft, setDraft] = useState<FileDraft | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load draft from IndexedDB on mount
  useEffect(() => {
    loadDraftFromDb()
      .then((d) => {
        setDraft(d)
        setIsLoading(false)
      })
      .catch(() => {
        // IndexedDB not available (e.g. private browsing on some browsers) — degrade gracefully
        setIsLoading(false)
      })
  }, [])

  const saveDraft = useCallback(async (formData: CreateFileInput) => {
    try {
      await saveDraftToDb(formData)
      setDraft({ key: DRAFT_KEY, formData, savedAt: new Date() })
    } catch {
      // Non-critical — draft save failure does not block the user
    }
  }, [])

  const clearDraft = useCallback(async () => {
    try {
      await clearDraftFromDb()
      setDraft(null)
    } catch {
      // Non-critical
    }
  }, [])

  return {
    draft,
    isLoading,
    hasDraft: draft !== null,
    saveDraft,
    clearDraft,
  }
}
