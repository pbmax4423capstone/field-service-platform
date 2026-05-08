'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface EditJobModalProps {
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
  onClose: () => void
  onSaved: () => void
}

export function EditJobModal({ job, technicians, onClose, onSaved }: EditJobModalProps) {
  const [form, setForm] = useState({
    title: job.title,
    description: job.description ?? '',
    internal_notes: job.internal_notes ?? '',
    scheduled_start: job.scheduled_start ? new Date(job.scheduled_start).toISOString().slice(0, 16) : '',
    scheduled_end: job.scheduled_end ? new Date(job.scheduled_end).toISOString().slice(0, 16) : '',
    technician_id: job.technician_id ?? '',
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg('')

    try {
      const body: any = {
        title: form.title,
      }

      if (form.description) body.description = form.description
      if (form.internal_notes) body.internal_notes = form.internal_notes
      if (form.scheduled_start) body.scheduled_start = new Date(form.scheduled_start).toISOString()
      if (form.scheduled_end) body.scheduled_end = new Date(form.scheduled_end).toISOString()
      if (form.technician_id) body.technician_id = form.technician_id

      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error ?? 'Failed to update job')
      } else {
        onSaved()
        onClose()
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error — please try again')
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Edit Job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Job title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Start *</label>
            <input
              type="datetime-local"
              name="scheduled_start"
              value={form.scheduled_start}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled End</label>
            <input
              type="datetime-local"
              name="scheduled_end"
              value={form.scheduled_end}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
            <select
              name="technician_id"
              value={form.technician_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Unassigned</option>
              {technicians.map(tech => (
                <option key={tech.id} value={tech.id}>
                  {tech.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Job description"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea
              name="internal_notes"
              value={form.internal_notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Internal notes"
              rows={2}
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === 'saving'}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
            >
              {status === 'saving' ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
