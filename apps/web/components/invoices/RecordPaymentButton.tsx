'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { RecordPaymentModal } from './RecordPaymentModal'

interface RecordPaymentButtonProps {
  invoiceId: string
  balanceDue: number
}

export function RecordPaymentButton({ invoiceId, balanceDue }: RecordPaymentButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  function handleRecorded() {
    router.refresh()
  }

  if (balanceDue <= 0) return null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 mt-3"
      >
        <Plus className="w-3.5 h-3.5" />
        Record Payment
      </button>

      {showModal && (
        <RecordPaymentModal
          invoiceId={invoiceId}
          balanceDue={balanceDue}
          onClose={() => setShowModal(false)}
          onRecorded={handleRecorded}
        />
      )}
    </>
  )
}
