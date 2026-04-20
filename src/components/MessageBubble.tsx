import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../store/conversationStore'
import { formatBytes } from '../lib/fileHandler'
import { FileText, Image as ImageIcon } from 'lucide-react'

interface Props {
  message: Message
  isStreaming?: boolean
}

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
          isUser
            ? 'bg-[#1d1d1f] text-white'
            : 'bg-[#0071e3] text-white'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={`max-w-[76%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* File attachments */}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.files.map((f, i) =>
              f.kind === 'image' && f.previewUrl ? (
                <img
                  key={i}
                  src={f.previewUrl}
                  alt={f.name}
                  className="max-h-40 max-w-xs rounded-2xl object-cover"
                  style={{ borderRadius: '12px' }}
                />
              ) : (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f5f5f7] text-xs text-[rgba(0,0,0,0.56)]"
                >
                  {f.kind === 'image' ? <ImageIcon size={13} /> : <FileText size={13} />}
                  <span className="font-mono">{f.name}</span>
                  <span className="text-[rgba(0,0,0,0.36)]">{formatBytes(f.size)}</span>
                </div>
              ),
            )}
          </div>
        )}

        {/* Bubble */}
        {(message.content || isStreaming) && (
          <div
            className={`px-4 py-3 text-sm leading-relaxed tracking-tight ${
              isUser
                ? 'bg-[#1d1d1f] text-white rounded-2xl rounded-tr-sm'
                : 'bg-white text-[#1d1d1f] rounded-2xl rounded-tl-sm shadow-[0_2px_12px_rgba(0,0,0,0.10)]'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : message.content ? (
              <div className="ai-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#0071e3] animate-pulse rounded-sm" />
                )}
              </div>
            ) : (
              /* Waiting for first token */
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
