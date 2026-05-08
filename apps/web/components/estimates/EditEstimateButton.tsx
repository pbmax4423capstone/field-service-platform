'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
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
        className="text-gray-400 hover:text-gray-600 transition-colors p-2"
        title="Edit estimate"
        type="button"
      >
        <Pencil className="w-4 h-4" />
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
