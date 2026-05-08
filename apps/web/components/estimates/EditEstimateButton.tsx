'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditEstimateModal } from './EditEstimateModal'

interface EditEstimateButtonProps {
  estimate: {
    id: string
    title: string
    notes?: string | null
    terms?: string | null
    valid_until?: string | null
  }
  lineItems?: { id: string; name: string; description?: string | null; quantity: number; unit_price: number; taxable: boolean }[]
}

export function EditEstimateButton({ estimate, lineItems = [] }: EditEstimateButtonProps) {
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
        <EditEstimateModal
          estimate={estimate}
          lineItems={lineItems}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
