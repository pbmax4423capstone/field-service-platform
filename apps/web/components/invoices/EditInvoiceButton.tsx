'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { EditInvoiceModal } from './EditInvoiceModal'

interface EditInvoiceButtonProps {
  invoice: {
    id: string
    title: string
    due_date?: string | null
    notes?: string | null
    terms?: string | null
  }
}

export function EditInvoiceButton({ invoice }: EditInvoiceButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  function handleSaved() {
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-gray-400 hover:text-gray-600 transition-colors p-2"
        title="Edit invoice"
        type="button"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {showModal && (
        <EditInvoiceModal
          invoice={invoice}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
