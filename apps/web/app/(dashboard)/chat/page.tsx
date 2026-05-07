import { ChatInterface } from '@/components/chat/ChatInterface'

export const metadata = {
  title: 'AI Assistant — FieldPro',
}

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full -m-6">
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Chat with Claude — full context of your jobs, invoices, and customers
        </p>
      </div>
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <ChatInterface />
      </div>
    </div>
  )
}
