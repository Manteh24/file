"use client"

import Dexie, { type Table } from "dexie"
import { useState, useEffect, useCallback } from "react"
import type { CreateFileInput } from "@/lib/validations/file"

// ─── DB Schema ────────────────────────────────────────────────────────────────

const BASE_DRAFT_KEY = "new-file-draft"

/** Returns a per-user draft key so different users on the same browser don't share drafts. */
function draftKey(userId?: string): string {
  return userId ? `${BASE_DRAFT_KEY}:${userId}` : BASE_DRAFT_KEY
}

interface FileDraft {
  /** Primary key — always DRAFT_KEY, one draft at a time. */
  key: string
  formData: CreateFileInput
  savedAt: Date
}

class DraftDatabase extends Dexie {
  drafts!: Table<FileDraft, string>

  constructor() {
    super("AmlakBinDrafts")
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

export async function loadDraftFromDb(userId?: string): Promise<FileDraft | null> {
  return (await getDb().drafts.get(draftKey(userId))) ?? null
}

export async function saveDraftToDb(formData: CreateFileInput, userId?: string): Promise<void> {
  await getDb().drafts.put({ key: draftKey(userId), formData, savedAt: new Date() })
}

export async function clearDraftFromDb(userId?: string): Promise<void> {
  await getDb().drafts.delete(draftKey(userId))
}

// ─── React hook ───────────────────────────────────────────────────────────────

export function useDraft(userId?: string) {
  const [draft, setDraft] = useState<FileDraft | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load draft from IndexedDB on mount
  useEffect(() => {
    loadDraftFromDb(userId)
      .then((d) => {
        setDraft(d)
        setIsLoading(false)
      })
      .catch(() => {
        // IndexedDB not available (e.g. private browsing on some browsers) — degrade gracefully
        setIsLoading(false)
      })
  }, [userId])

  const saveDraft = useCallback(async (formData: CreateFileInput) => {
    try {
      await saveDraftToDb(formData, userId)
      setDraft({ key: draftKey(userId), formData, savedAt: new Date() })
    } catch {
      // Non-critical — draft save failure does not block the user
    }
  }, [userId])

  const clearDraft = useCallback(async () => {
    try {
      await clearDraftFromDb(userId)
      setDraft(null)
    } catch {
      // Non-critical
    }
  }, [userId])

  return {
    draft,
    isLoading,
    hasDraft: draft !== null,
    saveDraft,
    clearDraft,
  }
}
