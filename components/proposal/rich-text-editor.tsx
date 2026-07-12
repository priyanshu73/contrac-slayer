"use client"

import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Bold, Heading2, Italic, List, ListOrdered, RemoveFormatting, Strikethrough, Underline } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { sanitizeProposalHtml } from "@/lib/sanitize-html"

/**
 * Rich-text editor for proposal text blocks, built on Tiptap (ProseMirror).
 * Replaces the previous hand-rolled `contentEditable` + `document.execCommand`
 * implementation, which was deprecated and produced unsanitized HTML.
 *
 * The persisted format stays as an HTML string (`value` in / `onChange` out) so
 * no document migration is required. All HTML is passed through
 * `sanitizeProposalHtml` on the way in and rendered sanitized in read-only mode.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  className,
  toolbarClassName,
  editorClassName,
  readOnlyClassName,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  readOnly?: boolean
  className?: string
  toolbarClassName?: string
  editorClassName?: string
  readOnlyClassName?: string
}) {
  const t = useTranslations("proposals")
  // Tracks the last HTML this editor emitted, so an external `value` change
  // (AI generation, reset) triggers a re-sync while typing does not.
  const lastEmittedRef = useRef<string>(value)

  const editor = useEditor(
    {
      // Avoid SSR hydration mismatch — render the editor after mount.
      immediatelyRender: false,
      editable: !readOnly,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2] },
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: sanitizeProposalHtml(value),
      editorProps: {
        attributes: {
          class: cn(
            "tiptap min-h-[140px] px-4 py-3 text-[15px] leading-7 text-slate-700 outline-none",
            editorClassName,
          ),
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        lastEmittedRef.current = html
        onChange(html)
      },
    },
    [readOnly],
  )

  // Keep editability in sync if the prop flips at runtime.
  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [editor, readOnly])

  // Re-sync when `value` changes from outside (not from our own onUpdate).
  useEffect(() => {
    if (!editor) return
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    editor.commands.setContent(sanitizeProposalHtml(value) || "", { emitUpdate: false })
  }, [editor, value])

  if (readOnly) {
    if (!value?.trim()) return null
    return (
      <div
        className={cn("prose max-w-none text-[15px] leading-7", readOnlyClassName, className)}
        dangerouslySetInnerHTML={{ __html: sanitizeProposalHtml(value) }}
      />
    )
  }

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white", className)}>
      <div className={cn("flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-1.5", toolbarClassName)}>
        <ToolbarButton editor={editor} title={t("toolbar.bold")} isActive={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} title={t("toolbar.italic")} isActive={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} title={t("toolbar.underline")} isActive={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} title={t("toolbar.strikethrough")} isActive={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 h-4 w-px self-center bg-slate-200" />
        <ToolbarButton editor={editor} title={t("toolbar.heading")} isActive={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 h-4 w-px self-center bg-slate-200" />
        <ToolbarButton editor={editor} title={t("toolbar.bulletList")} isActive={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton editor={editor} title={t("toolbar.numberedList")} isActive={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 h-4 w-px self-center bg-slate-200" />
        <ToolbarButton editor={editor} title={t("toolbar.clearFormatting")} onClick={() => editor?.chain().focus().unsetAllMarks().setParagraph().run()}>
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({
  editor,
  title,
  isActive,
  onClick,
  children,
}: {
  editor: Editor | null
  title: string
  isActive?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      disabled={!editor}
      className={cn("h-7 w-7 p-0", isActive && "bg-slate-200/80 text-slate-900")}
      // onMouseDown + preventDefault keeps the editor selection while clicking.
      onMouseDown={(event) => {
        event.preventDefault()
        onClick()
      }}
    >
      {children}
    </Button>
  )
}
