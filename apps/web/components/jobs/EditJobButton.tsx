'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditJobModal } from './EditJobModal'

interface EditJobButtonProps {
  job: {
    id: string
    title: string
    description?: string | null
    internal_notes?: string | null
    scheduled_start: string
    scheduled_end?: string | null
    technician_id?: string | null
  }
  technicians: { id: string; full_name: string }[]
  lineItems: { id: string; name: string; description?: string | null; quantity: number; unit_price: number }[]
}

export function EditJobButton({ job, technicians, lineItems }: EditJobButtonProps) {
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
      >
        Edit
      </button>

      {showModal && (
        <EditJobModal
          job={job}
          technicians={technicians}
          lineItems={lineItems}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
