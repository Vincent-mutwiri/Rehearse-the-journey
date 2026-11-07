import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SettingsDrawer({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const dialogId = useId()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        className="rounded-full px-3"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        aria-expanded={open}
        onClick={() => {
          dialogRef.current?.showModal()
          setOpen(true)
        }}
      >
        <Settings data-icon="inline-start" aria-hidden="true" />
        Settings
      </Button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-labelledby={titleId}
        className="settings-drawer"
        onKeyDown={event => {
          if (event.key !== 'Tab') return
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])',
          )).filter(control => control.checkVisibility())
          const first = controls[0]
          const last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        onClose={() => {
          setOpen(false)
          triggerRef.current?.focus()
        }}
        onClick={event => {
          if (event.target !== event.currentTarget) return
          const rect = event.currentTarget.getBoundingClientRect()
          if (event.clientX < rect.left || event.clientX > rect.right ||
              event.clientY < rect.top || event.clientY > rect.bottom) {
            event.currentTarget.close()
          }
        }}
      >
        <header className="settings-drawer-header">
          <h2 id={titleId} className="text-xl font-semibold">Settings</h2>
          <Button
            variant="ghost"
            className="rounded-full px-3"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close settings"
            autoFocus
          >
            <X data-icon="inline-start" aria-hidden="true" />
            Close
          </Button>
        </header>
        <div className="settings-drawer-body">
          {children}
          <section aria-labelledby={`${titleId}-about`} className="border-t border-ink/15 pt-6">
            <h3 id={`${titleId}-about`} className="mb-3 font-semibold">About this practice</h3>
            <p role="note" aria-label="Fictional scenario notice" className="text-sm leading-relaxed">
              <strong>Practice scenario — not a real hospital.</strong> This conversation is fictional
              and used only for rehearsal. Use made-up details. Starting connects to an AI provider;
              typed messages and any enabled microphone audio are sent for replies. The mic starts off.
              This app does not save the transcript.
            </p>
          </section>
        </div>
      </dialog>
    </>
  )
}
