'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditInvoiceModal } from './EditInvoiceModal'

interface EditInvoiceButtonProps {
  invoice: {
    id: string
    title: string
    status: string
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
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        type="button"
      >
        Edit
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
