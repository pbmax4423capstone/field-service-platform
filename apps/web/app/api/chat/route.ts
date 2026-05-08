import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const bodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const tools: Anthropic.Tool[] = [
  {
    name: 'get_job_details',
    description:
      'Retrieve full details for a specific job, including line items and status history.',
    input_schema: {
      type: 'object' as const,
      properties: {
        job_id: { type: 'string', description: 'UUID of the job' },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'get_customer_history',
    description:
      'Retrieve full service history and invoice list for a specific customer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: { type: 'string', description: 'UUID of the customer' },
      },
      required: ['customer_id'],
    },
  },
]

async function fetchOrgContext(orgId: string) {
  const admin = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0]
  const lastWeekStr = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0]

  const [jobsResult, invoicesResult, customersResult] = await Promise.all([
    admin
      .from('jobs')
      .select('id, title, status, scheduled_start, customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .gte('scheduled_start', lastWeekStr)
      .order('scheduled_start', { ascending: false })
      .limit(50),
    admin
      .from('invoices')
      .select('id, invoice_number, status, total, balance_due, due_date, customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('customers')
      .select('id, first_name, last_name, email, phone')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const jobs = jobsResult.data ?? []
  const invoices = invoicesResult.data ?? []
  const customers = customersResult.data ?? []

  const todayJobs = jobs.filter((j) => j.scheduled_start?.startsWith(todayStr))
  const tomorrowJobs = jobs.filter((j) => j.scheduled_start?.startsWith(tomorrowStr))
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue')
  const lastWeekInvoices = invoices.filter(
    (i) =>
      i.status === 'paid' &&
      i.due_date &&
      i.due_date >= lastWeekStr &&
      i.due_date <= todayStr,
  )
  const lastWeekRevenue = lastWeekInvoices.reduce(
    (sum, i) => sum + (i.total ?? 0),
    0,
  )

  return `
You are an AI assistant for a field service (HVAC) business. You have access to real-time business data.

TODAY'S DATE: ${todayStr}

ORGANIZATION CONTEXT:
- Total customers: ${customers.length}
- Total invoices loaded: ${invoices.length}
- Overdue invoices: ${overdueInvoices.length}
- Last 7 days revenue (paid): $${lastWeekRevenue.toFixed(2)}

TODAY'S JOBS (${todayJobs.length}):
${
  todayJobs.length === 0
    ? 'No jobs scheduled today.'
    : todayJobs
        .map(
          (j) =>
            `- [${j.id}] "${j.title}" — Status: ${j.status} — Customer: ${(j.customers as any)?.first_name} ${(j.customers as any)?.last_name} — Time: ${j.scheduled_start}`,
        )
        .join('\n')
}

TOMORROW'S JOBS (${tomorrowJobs.length}):
${
  tomorrowJobs.length === 0
    ? 'No jobs scheduled tomorrow.'
    : tomorrowJobs
        .map(
          (j) =>
            `- [${j.id}] "${j.title}" — Status: ${j.status} — Customer: ${(j.customers as any)?.first_name} ${(j.customers as any)?.last_name} — Time: ${j.scheduled_start}`,
        )
        .join('\n')
}

OVERDUE INVOICES (${overdueInvoices.length}):
${
  overdueInvoices.length === 0
    ? 'No overdue invoices.'
    : overdueInvoices
        .map(
          (i) =>
            `- [${i.id}] Invoice #${i.invoice_number} — Customer: ${(i.customers as any)?.first_name} ${(i.customers as any)?.last_name} — Balance due: $${i.balance_due?.toFixed(2)} — Due: ${i.due_date}`,
        )
        .join('\n')
}

ALL CUSTOMERS (${customers.length} total):
${customers
  .slice(0, 20)
  .map((c) => `- [${c.id}] ${c.first_name} ${c.last_name} — ${c.email ?? 'no email'} — ${c.phone ?? 'no phone'}`)
  .join('\n')}${customers.length > 20 ? `\n... and ${customers.length - 20} more` : ''}

RECENT INVOICES (last 50):
${invoices
  .slice(0, 15)
  .map(
    (i) =>
      `- [${i.id}] #${i.invoice_number} — ${(i.customers as any)?.first_name} ${(i.customers as any)?.last_name} — $${i.total?.toFixed(2)} — Status: ${i.status} — Due: ${i.due_date ?? 'N/A'}`,
  )
  .join('\n')}${invoices.length > 15 ? `\n... and ${invoices.length - 15} more` : ''}

Use the provided tools when the user asks for specific job or customer details. Answer concisely and helpfully.

APP USAGE GUIDE:
You can also help users understand how to use this FieldPro app. Here are the key features and how to use them:

CUSTOMERS: Go to the Customers page to view all customers. Click "Add Customer" to create a new customer with their contact info and service address. Click a customer's name to view their full history including jobs, invoices, and equipment.

JOBS: Go to the Jobs page to see all scheduled and past jobs. Click "New Job" to schedule a new service call — you'll select a customer, their service address, assign a technician, set the date/time, and add a title and description. Click a job to view details and update its status.

INVOICES: Go to the Invoices page to view all invoices. Click "New Invoice" to create an invoice — select a customer, add a title, add line items (service name, quantity, price), set a tax rate, and set a due date. Click an invoice to view it, send it, or record a payment.

ESTIMATES: Similar to invoices but sent for approval before work begins. Go to Estimates → New Estimate. Once a customer accepts, you can convert it to an invoice.

PRICE BOOK: Go to Price Book to manage your catalog of services and parts with standard prices. Click "Add Item" to add a service/part with its price, cost, category, and whether it's taxable. Items appear as selectable line items when creating invoices and estimates.

SETTINGS: Go to Settings to update your business name, phone, email, and address. Changes save immediately.

BOOKINGS: Customers can request service through your booking widget. Go to Bookings to review and approve incoming requests.

LOCATIONS: Go to Locations to manage multiple office or service locations for your business.

ANALYTICS: Go to Analytics to see revenue charts, job status breakdowns, and technician performance.

When users ask "how do I" questions or "where is" questions, answer using this app guide. When they ask about business data (jobs, customers, invoices, revenue), use the live data above.
`.trim()
}

async function executeToolCall(
  toolName: string,
  toolInput: Record<string, string>,
  orgId: string,
): Promise<string> {
  const admin = createAdminClient()

  if (toolName === 'get_job_details') {
    const { job_id } = toolInput
    const { data: job } = await admin
      .from('jobs')
      .select(`
        *,
        customers(first_name, last_name, email, phone),
        customer_addresses(street, city, state, zip),
        users(full_name),
        job_line_items(*),
        job_status_history(from_status, to_status, created_at),
        job_notes(content, created_at)
      `)
      .eq('id', job_id)
      .eq('organization_id', orgId)
      .single()

    if (!job) return JSON.stringify({ error: 'Job not found' })
    return JSON.stringify(job, null, 2)
  }

  if (toolName === 'get_customer_history') {
    const { customer_id } = toolInput
    const [customerResult, jobsResult, invoicesResult] = await Promise.all([
      admin
        .from('customers')
        .select('*, customer_addresses(*), customer_equipment(*)')
        .eq('id', customer_id)
        .eq('organization_id', orgId)
        .single(),
      admin
        .from('jobs')
        .select('id, title, status, scheduled_start, job_line_items(*)')
        .eq('customer_id', customer_id)
        .eq('organization_id', orgId)
        .order('scheduled_start', { ascending: false }),
      admin
        .from('invoices')
        .select('id, invoice_number, status, total, balance_due, due_date')
        .eq('customer_id', customer_id)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false }),
    ])

    return JSON.stringify(
      {
        customer: customerResult.data,
        jobs: jobsResult.data ?? [],
        invoices: invoicesResult.data ?? [],
      },
      null,
      2,
    )
  }

  return JSON.stringify({ error: 'Unknown tool' })
}

export async function POST(req: NextRequest) {
  // Guard against missing API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI chat is not configured (missing API key).' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Auth check
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!userData?.organization_id) {
    return new Response(JSON.stringify({ error: 'Organization not found' }), { status: 404 })
  }

  const orgId = userData.organization_id

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 })
  }

  const { conversationId, message } = parsed.data
  const admin = createAdminClient()

  // Load or create conversation
  let conversation: { id: string; messages: Anthropic.MessageParam[] }

  if (conversationId) {
    const { data: existing } = await admin
      .from('chat_conversations')
      .select('id, messages')
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .single()

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404 })
    }
    conversation = { id: existing.id, messages: (existing.messages as Anthropic.MessageParam[]) ?? [] }
  } else {
    const { data: newConv } = await admin
      .from('chat_conversations')
      .insert({ organization_id: orgId, messages: [] })
      .select('id, messages')
      .single()

    if (!newConv) {
      return new Response(JSON.stringify({ error: 'Failed to create conversation' }), { status: 500 })
    }
    conversation = { id: newConv.id, messages: [] }
  }

  // Append user message
  conversation.messages.push({ role: 'user', content: message })

  // Fetch org context for system prompt
  const systemPrompt = await fetchOrgContext(orgId)

  // Build streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Send conversationId immediately so the client can reference it
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'conversation_id', id: conversation.id })}\n\n`),
      )

      let fullAssistantContent: Anthropic.ContentBlock[] = []

      // Agentic loop — Claude may call tools multiple times
      let currentMessages = [...conversation.messages]

      while (true) {
        let accumulatedText = ''
        const contentBlocks: Anthropic.ContentBlock[] = []
        let currentBlockIndex = -1
        let currentBlockType: string | null = null

        // Stream from Claude
        const claudeStream = anthropic.messages.stream({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2048,
          system: systemPrompt,
          tools,
          messages: currentMessages,
        })

        for await (const event of claudeStream) {
          if (event.type === 'content_block_start') {
            currentBlockIndex++
            currentBlockType = event.content_block.type
            if (event.content_block.type === 'text') {
              contentBlocks.push({ type: 'text', text: '', citations: [] } as any)
            } else if (event.content_block.type === 'tool_use') {
              contentBlocks.push({
                type: 'tool_use',
                id: event.content_block.id,
                name: event.content_block.name,
                input: {},
              } as any)
            }
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              accumulatedText += event.delta.text
              ;(contentBlocks[currentBlockIndex] as Anthropic.TextBlock).text += event.delta.text
              // Stream text tokens to client
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'token', text: event.delta.text })}\n\n`,
                ),
              )
            } else if (event.delta.type === 'input_json_delta') {
              // Accumulate tool input JSON
              const toolBlock = contentBlocks[currentBlockIndex] as Anthropic.ToolUseBlock
              const existing = JSON.stringify(toolBlock.input)
              // We'll collect raw JSON and parse at end
              ;(toolBlock as any)._rawInput = ((toolBlock as any)._rawInput ?? '') + event.delta.partial_json
            }
          } else if (event.type === 'content_block_stop') {
            // Parse tool input if needed
            if (currentBlockType === 'tool_use') {
              const toolBlock = contentBlocks[currentBlockIndex] as Anthropic.ToolUseBlock & { _rawInput?: string }
              try {
                toolBlock.input = JSON.parse(toolBlock._rawInput ?? '{}')
              } catch {
                toolBlock.input = {}
              }
              delete (toolBlock as any)._rawInput
            }
          } else if (event.type === 'message_stop') {
            // handled below
          }
        }

        const finalMessage = await claudeStream.finalMessage()
        const stopReason = finalMessage.stop_reason

        // Add assistant turn to messages
        currentMessages.push({ role: 'assistant', content: contentBlocks })
        fullAssistantContent = contentBlocks

        if (stopReason === 'tool_use') {
          // Execute each tool call
          const toolResults: Anthropic.ToolResultBlockParam[] = []

          for (const block of contentBlocks) {
            if (block.type === 'tool_use') {
              // Notify client a tool is being called
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'tool_call', name: block.name })}\n\n`,
                ),
              )

              const result = await executeToolCall(
                block.name,
                block.input as Record<string, string>,
                orgId,
              )

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result,
              })
            }
          }

          // Append tool results and continue loop
          currentMessages.push({ role: 'user', content: toolResults })
          continue
        }

        // end_turn or other — we're done
        break
      }

      // Persist messages to DB
      const allMessages = currentMessages
      await admin
        .from('chat_conversations')
        .update({ messages: allMessages })
        .eq('id', conversation.id)

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Conversation-Id': conversation.id,
    },
  })
}
