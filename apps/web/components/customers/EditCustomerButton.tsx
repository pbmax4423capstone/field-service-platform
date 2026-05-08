'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { EditCustomerModal } from './EditCustomerModal'

interface EditCustomerButtonProps {
  customer: {
    id: string
    first_name: string
    last_name: string
    phone: string
    email?: string | null
    phone_alt?: string | null
    notes?: string | null
  }
}

export function EditCustomerButton({ customer }: EditCustomerButtonProps) {
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
        <Pencil className="w-3.5 h-3.5" />
        Edit
      </button>

      {showModal && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
