import { useState, useRef, useEffect } from 'react'
import { chatbotAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Brain, Send, Loader2, User, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const SUGGESTED_QUESTIONS = {
  student: [
    'What is my attendance percentage?',
    'How many leaves do I have remaining?',
    'Am I eligible for exams?',
    'Show my attendance for this month',
  ],
  teacher: [
    'Which students are below 75% attendance?',
    'Show today\'s attendance summary',
    'How many leave requests are pending?',
    'List most absent students this week',
  ],
  admin: [
    'Show attendance analytics for today',
    'List students below 75% attendance',
    'Which department has lowest attendance?',
    'Generate monthly attendance summary',
  ],
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={clsx('flex gap-3 animate-slide-up', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', isUser ? 'bg-primary-600 text-white' : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white')}>
        {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
      </div>
      {/* Bubble */}
      <div className={clsx('max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
        isUser
          ? 'bg-primary-600 text-white rounded-tr-sm'
          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-sm'
      )}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={clsx('text-xs mt-1.5 opacity-60', isUser ? 'text-right' : '')}>
          {message.timestamp}
        </p>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
        <Brain className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

export default function ChatbotPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name?.split(' ')[0]}! 👋 I'm your AI attendance assistant. I can help you with attendance records, leave balances, analytics, and more. What would you like to know?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const suggestions = SUGGESTED_QUESTIONS[user?.role] || SUGGESTED_QUESTIONS.student

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    setInput('')
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMessage = { role: 'user', content: messageText, timestamp }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const { data } = await chatbotAPI.sendMessage({ message: messageText, history })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Chat cleared. How can I help you?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])
  }

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col gap-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-title leading-none">AI Assistant</h1>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online
            </p>
          </div>
        </div>
        <button onClick={clearChat} className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> Clear chat
        </button>
      </div>

      {/* Chat window */}
      <div className="card flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => <ChatBubble key={i} message={m} />)}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {messages.length <= 1 && (
          <div className="px-5 pb-3 border-t border-gray-50 dark:border-gray-800">
            <p className="text-xs text-gray-400 mb-2 mt-3 font-medium uppercase tracking-wide">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about your attendance, leaves, analytics..."
              className="input flex-1"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="btn-primary px-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Powered by OpenAI GPT with real-time attendance data</p>
        </div>
      </div>
    </div>
  )
}
