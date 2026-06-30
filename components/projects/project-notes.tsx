"use client"

import type { Project, ProjectNote } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
import { useEffect, useState } from "react"
import { Loader2, Plus, Pencil, Trash2, StickyNote, X, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { api } from "@/lib/api"

interface ProjectNotesProps {
  project: Project
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function ProjectNotes({ project }: ProjectNotesProps) {
  const { toast } = useToast()

  const [notes, setNotes] = useState<ProjectNote[]>([])
  const [loading, setLoading] = useState(true)

  const [draft, setDraft] = useState("")
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBody, setEditBody] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<ProjectNote | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .getProjectNotes(project.id)
      .then((data) => {
        if (!cancelled) setNotes(data)
      })
      .catch(() => {
        if (!cancelled)
          toast({ title: "Couldn't load notes", description: "Please try again.", variant: "destructive" })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [project.id])

  const handleCreate = async () => {
    const body = draft.trim()
    if (!body) return
    setCreating(true)
    try {
      const note = await api.createProjectNote(project.id, body)
      setNotes((prev) => [note, ...prev])
      setDraft("")
    } catch {
      toast({ title: "Couldn't add note", description: "Please try again.", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (note: ProjectNote) => {
    setEditingId(note.id)
    setEditBody(note.body)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditBody("")
  }

  const handleSaveEdit = async (note: ProjectNote) => {
    const body = editBody.trim()
    if (!body) return
    if (body === note.body) {
      cancelEdit()
      return
    }
    setSavingEdit(true)
    try {
      const updated = await api.updateProjectNote(project.id, note.id, body)
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)))
      cancelEdit()
    } catch {
      toast({ title: "Couldn't save note", description: "Please try again.", variant: "destructive" })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api.deleteProjectNote(project.id, pendingDelete.id)
      setNotes((prev) => prev.filter((n) => n.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch {
      toast({ title: "Couldn't delete note", description: "Please try again.", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Composer */}
      <Card className="p-4 space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note — site update, call log, decision…"
          rows={3}
          className="resize-y"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault()
              handleCreate()
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Tip: ⌘/Ctrl + Enter to save</span>
          <Button size="sm" onClick={handleCreate} disabled={creating || !draft.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add note
          </Button>
        </div>
      </Card>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
          <StickyNote className="h-8 w-8 mb-2" />
          <p className="text-sm">No notes yet. Add the first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isEditing = editingId === note.id
            return (
              <Card key={note.id} className="p-4 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{note.author_name || "Unknown"}</span>
                    <span className="mx-1.5">·</span>
                    <span>{formatTimestamp(note.created_at)}</span>
                    {note.updated_at && note.updated_at !== note.created_at && (
                      <span className="ml-1.5 italic text-slate-400">(edited)</span>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-slate-700"
                        onClick={() => startEdit(note)}
                        aria-label="Edit note"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-600"
                        onClick={() => setPendingDelete(note)}
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                      className="resize-y"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={savingEdit}>
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(note)}
                        disabled={savingEdit || !editBody.trim()}
                      >
                        {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap break-words">{note.body}</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
