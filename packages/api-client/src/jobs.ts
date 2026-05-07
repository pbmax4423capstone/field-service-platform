import type { SupabaseClient } from './client'
import type { Insert, Job, JobLineItem, JobNote, JobPhoto, JobStatus, Update } from '@field-service/shared'
import { JOB_STATUS_TRANSITIONS } from '@field-service/shared'

export const jobsApi = (client: SupabaseClient) => ({
  async list(
    organizationId: string,
    opts?: {
      status?: JobStatus | JobStatus[]
      technicianId?: string
      customerId?: string
      dateFrom?: string
      dateTo?: string
      page?: number
      perPage?: number
    },
  ) {
    const page = opts?.page ?? 1
    const perPage = opts?.perPage ?? 50
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    let query = client
      .from('jobs')
      .select(
        '*, customers(first_name, last_name, phone, email), customer_addresses(street, city, state, zip), users(full_name)',
        { count: 'exact' },
      )
      .eq('organization_id', organizationId)
      .order('scheduled_start', { ascending: true })
      .range(from, to)

    if (opts?.status) {
      const statuses = Array.isArray(opts.status) ? opts.status : [opts.status]
      query = query.in('status', statuses)
    }
    if (opts?.technicianId) query = query.eq('technician_id', opts.technicianId)
    if (opts?.customerId) query = query.eq('customer_id', opts.customerId)
    if (opts?.dateFrom) query = query.gte('scheduled_start', opts.dateFrom)
    if (opts?.dateTo) query = query.lte('scheduled_start', opts.dateTo)

    return query
  },

  async getById(id: string, organizationId: string) {
    return client
      .from('jobs')
      .select(
        '*, customers(*), customer_addresses(*), users(*), job_line_items(*), job_photos(*), job_notes(*, users(full_name)), job_status_history(*, users(full_name))',
      )
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()
  },

  async create(data: Insert<Job>) {
    const { data: job, error } = await client.from('jobs').insert(data).select().single()
    if (error) return { data: null, error }
    // Record initial status history
    await client.from('job_status_history').insert({
      job_id: job.id,
      organization_id: job.organization_id,
      changed_by: data.technician_id ?? '',
      from_status: null,
      to_status: 'scheduled',
    })
    return { data: job, error: null }
  },

  async update(id: string, data: Update<Job>) {
    return client.from('jobs').update(data).eq('id', id).select().single()
  },

  async updateStatus(
    id: string,
    organizationId: string,
    toStatus: JobStatus,
    changedBy: string,
    note?: string,
  ) {
    const { data: job } = await client
      .from('jobs')
      .select('status')
      .eq('id', id)
      .single()

    if (!job) return { data: null, error: { message: 'Job not found' } }

    const allowed = JOB_STATUS_TRANSITIONS[job.status] ?? []
    if (!allowed.includes(toStatus)) {
      return {
        data: null,
        error: { message: `Cannot transition from ${job.status} to ${toStatus}` },
      }
    }

    const [updateResult] = await Promise.all([
      client.from('jobs').update({ status: toStatus }).eq('id', id).select().single(),
      client.from('job_status_history').insert({
        job_id: id,
        organization_id: organizationId,
        changed_by: changedBy,
        from_status: job.status,
        to_status: toStatus,
        note,
      }),
    ])

    return updateResult
  },

  lineItems: {
    async list(jobId: string) {
      return client.from('job_line_items').select('*').eq('job_id', jobId)
    },
    async create(data: Insert<JobLineItem>) {
      return client.from('job_line_items').insert(data).select().single()
    },
    async update(id: string, data: Update<JobLineItem>) {
      return client.from('job_line_items').update(data).eq('id', id).select().single()
    },
    async delete(id: string) {
      return client.from('job_line_items').delete().eq('id', id)
    },
  },

  notes: {
    async list(jobId: string) {
      return client
        .from('job_notes')
        .select('*, users(full_name)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true })
    },
    async create(data: Insert<JobNote>) {
      return client.from('job_notes').insert(data).select().single()
    },
  },

  photos: {
    async list(jobId: string) {
      return client.from('job_photos').select('*').eq('job_id', jobId)
    },
    async create(data: Insert<JobPhoto>) {
      return client.from('job_photos').insert(data).select().single()
    },
    async delete(id: string) {
      return client.from('job_photos').delete().eq('id', id)
    },
  },
})
