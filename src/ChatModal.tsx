import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Building2, Check, CheckCheck, LoaderCircle, MapPin, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { api, mediaUrl, naira, prettyDate } from './api';
import type { Account, Conversation, DirectMessage, Property } from './types';
import { notifyToast } from './toast';
import ProfilePhoto from './ProfilePhoto';

type ChatModalProps = {
  user: Account | null;
  property?: Property | null;
  agentId?: number;
  conversationId?: number | null;
  onClose: () => void;
};

type MessagesResponse = {
  messages: DirectMessage[];
  conversation: Conversation;
  property?: Property | null;
  partner?: {
    id: number;
    name: string;
    phone?: string;
    avatar?: string;
    role: string;
    business_name?: string;
  };
};

const QUICK_PROMPTS = [
  'Hello! Is this property still available?',
  'Can I schedule a physical inspection this week?',
  'What is the electricity and borehole water situation?',
  'What is the total package including agreement and agency fees?',
];

export default function ChatModal({ user, property, agentId, conversationId: initialConvId, onClose }: ChatModalProps) {
  const [convId, setConvId] = useState<number | null>(initialConvId || null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [partner, setPartner] = useState<MessagesResponse['partner'] | null>(null);
  const [activeProperty, setActiveProperty] = useState<Property | null>(property || null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const targetAgentId = agentId || property?.agent_id;

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // 1. Initialize or load conversation
  useEffect(() => {
    if (!user) return;
    let active = true;

    async function initConversation() {
      try {
        setLoading(true);
        let currentId = convId;

        // If no conversation ID yet, start/get one via property or agent
        if (!currentId && (property || targetAgentId)) {
          const res = await api<{ conversation_id: number }>('conversations/start', {
            data: {
              property_id: property?.id,
              agent_id: targetAgentId,
            },
          });
          currentId = res.conversation_id;
          if (active) setConvId(currentId);
        }

        if (currentId) {
          const res = await api<MessagesResponse>('conversations/messages', {
            params: { conversation_id: currentId },
          });
          if (active) {
            setMessages(res.messages);
            if (res.partner) setPartner(res.partner);
            if (res.property) setActiveProperty(res.property);
          }
        }
      } catch (err) {
        if (active) {
          notifyToast(err instanceof Error ? err.message : 'Could not load chat.', 'error');
        }
      } finally {
        if (active) {
          setLoading(false);
          setTimeout(() => scrollToBottom(false), 80);
        }
      }
    }

    void initConversation();
    return () => { active = false; };
  }, [user, property, targetAgentId, convId]);

  // 2. Poll for new incoming messages every 3.5 seconds while open
  useEffect(() => {
    if (!convId || !user) return;
    const interval = setInterval(() => {
      api<MessagesResponse>('conversations/messages', {
        params: { conversation_id: convId },
      })
        .then((res) => {
          setMessages((prev) => {
            if (res.messages.length > prev.length) {
              setTimeout(() => scrollToBottom(true), 60);
              return res.messages;
            }
            return prev;
          });
        })
        .catch(() => {});
    }, 3500);

    return () => clearInterval(interval);
  }, [convId, user]);

  async function handleSend(msgToSend?: string) {
    const text = (msgToSend ?? inputMessage).trim();
    if (!text || !convId || sending) return;

    setSending(true);
    try {
      const res = await api<{ message: DirectMessage }>('conversations/send', {
        data: {
          conversation_id: convId,
          message: text,
        },
      });
      setInputMessage('');
      setMessages((prev) => [...prev, res.message]);
      setTimeout(() => scrollToBottom(true), 60);
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : 'Could not send message.', 'error');
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSend();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm animate-fadeIn">
      <div className="relative flex h-[92vh] max-h-[720px] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-orange-100">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-orange-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <ProfilePhoto
              name={partner?.name || property?.business_name || property?.agent_name || 'Agent'}
              photo={partner?.avatar || property?.agent_avatar}
              size="regular"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink truncate">
                  {partner?.business_name || partner?.name || property?.business_name || property?.agent_name || 'Chat'}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Direct Chat
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {partner?.role === 'agent' ? 'Property Agent' : partner?.role === 'admin' ? 'Administrator' : 'FUTA Home Seeker'}
                {partner?.phone ? ` · ${partner.phone}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-orange-50 hover:text-futa transition-colors"
            aria-label="Close chat"
          >
            <X size={20} />
          </button>
        </header>

        {/* Property Context Banner (if linked to a listing) */}
        {activeProperty && (
          <div className="flex items-center gap-3 border-b border-orange-100/70 bg-orange-50/60 px-5 py-2.5 text-xs text-slate-700">
            <img
              src={mediaUrl(activeProperty.image)}
              alt={activeProperty.title}
              className="size-10 rounded-lg object-cover border border-orange-200"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink truncate">{activeProperty.title}</p>
              <p className="text-slate-500 flex items-center gap-1 truncate">
                <MapPin size={12} /> {activeProperty.location} · <strong className="text-futa font-bold">{naira(activeProperty.price)}</strong>
                {activeProperty.listing_type === 'rent' && `/${activeProperty.price_period}`}
              </p>
            </div>
          </div>
        )}

        {/* Message Thread Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-canvas/30">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
              <LoaderCircle size={20} className="animate-spin text-futa" />
              <span>Loading messages…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="size-12 rounded-full bg-orange-100 text-futa flex items-center justify-center mb-3">
                <MessageSquare size={22} />
              </div>
              <h4 className="font-bold text-ink mb-1">Start a conversation</h4>
              <p className="text-xs max-w-sm mb-5 text-slate-500">
                Ask the agent about rent, electricity, borehole water, security, or arrange an inspection.
              </p>
              <div className="w-full max-w-md space-y-2">
                <p className="text-xs font-semibold text-slate-400 text-left flex items-center gap-1.5">
                  <Sparkles size={13} className="text-futa" /> QUICK SUGGESTIONS
                </p>
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void handleSend(prompt)}
                    disabled={sending}
                    className="w-full text-left rounded-xl border border-orange-200/80 bg-white p-2.5 text-xs text-slate-700 hover:border-futa hover:bg-orange-50/50 hover:text-futa transition-all shadow-sm"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="text-center my-2">
                <span className="rounded-full bg-orange-100/70 px-3 py-1 text-[11px] font-medium text-slate-600">
                  Direct inquiry thread with verified contact
                </span>
              </div>
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-futa text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-warm-border rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400">
                      <span>{new Date(msg.created_at.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        <span>
                          {msg.is_read ? <CheckCheck size={12} className="text-futa" /> : <Check size={12} />}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Footer */}
        <form onSubmit={onSubmit} className="border-t border-orange-100 bg-white p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message here…"
              disabled={loading || sending}
              maxLength={2000}
              className="flex-1 rounded-xl border border-orange-200 bg-canvas/40 px-4 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-futa focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200/50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sending || loading}
              className="flex size-10 items-center justify-center rounded-xl bg-futa text-white hover:bg-futa-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shrink-0"
              aria-label="Send message"
            >
              {sending ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
