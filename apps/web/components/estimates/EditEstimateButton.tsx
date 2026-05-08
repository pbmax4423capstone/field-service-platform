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
}

export function EditEstimateButton({ estimate }: EditEstimateButtonProps) {
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
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
