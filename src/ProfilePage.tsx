import { useEffect, useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, Bookmark, CalendarDays, LoaderCircle, MessageSquare, Phone, ShieldCheck } from 'lucide-react';
import type { Account, Booking, Conversation } from './types';
import { api, embeddedRoute, prettyDate } from './api';
import ProfilePhoto from './ProfilePhoto';
import ChatModal from './ChatModal';

export default function ProfilePage({ user, sessionReady }: { user: Account | null; sessionReady: boolean }) {
  const location = useLocation();
  const route = location.pathname === '/auth-loginfutahomes'
    ? embeddedRoute(location.search)
    : location.pathname;
  const expectedRole = route.split('/')[1];

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedChatConvId, setSelectedChatConvId] = useState<number | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'user') return;
    let active = true;
    setLoadingItems(true);

    Promise.all([
      api<{ conversations: Conversation[] }>('conversations/list').catch(() => ({ conversations: [] })),
      api<{ bookings: Booking[] }>('bookings/my').catch(() => ({ bookings: [] })),
    ])
      .then(([convRes, bookRes]) => {
        if (active) {
          setConversations(convRes.conversations);
          setBookings(bookRes.bookings);
        }
      })
      .finally(() => {
        if (active) setLoadingItems(false);
      });

    return () => { active = false; };
  }, [user]);

  if (!sessionReady) return <main className="loading page" role="status">Loading your account…</main>;
  if (!user) {
    return (
      <Navigate
        to={expectedRole === 'admin'
          ? '/auth-loginfutahomes?/admin'
          : expectedRole === 'agent'
            ? '/auth-loginfutahomes?/agent/login'
            : '/auth-loginfutahomes?/user/login'}
        replace
        state={{ from: location }}
      />
    );
  }
  if (user.role !== expectedRole) return <Navigate to={`/${user.role}/profile?futahomes/account`} replace />;

  return (
    <main className="site-container page section profile-page space-y-6">
      <div>
        <p className="section-label">YOUR FUTA HOMES ACCOUNT</p>
        <h1 className="page-title">Welcome, {user.name}</h1>
        <p className="section-desc">Manage your housing inquiries, scheduled inspections, and saved homes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Details Card */}
        <section className="card panel profile-card p-6 h-fit space-y-5">
          <div className="profile-heading flex items-center gap-3">
            <ProfilePhoto name={user.name} photo={user.avatar} size="large" />
            <div>
              <h2 className="text-lg font-bold text-ink">
                {user.role === 'agent' ? 'Agent profile' : user.role === 'admin' ? 'Administrator profile' : 'Your profile'}
              </h2>
              <p className="muted text-xs">
                Signed in as {user.role === 'agent' ? 'a property agent' : user.role === 'admin' ? 'an administrator' : 'a home seeker'}.
              </p>
            </div>
          </div>

          <div className="profile-details space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-orange-100">
              <span className="text-slate-400 font-semibold">Name</span>
              <span className="font-bold text-ink">{user.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-orange-100">
              <span className="text-slate-400 font-semibold">Email</span>
              <span className="font-medium text-ink">{user.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-orange-100">
              <span className="text-slate-400 font-semibold">Phone</span>
              <span className="font-medium text-ink">{user.phone || 'Not added'}</span>
            </div>
            {user.role === 'agent' && (
              <>
                <div className="flex justify-between py-1 border-b border-orange-100">
                  <span className="text-slate-400 font-semibold">Business</span>
                  <span className="font-medium text-ink">{user.agent?.business_name || 'Not added'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-orange-100">
                  <span className="text-slate-400 font-semibold">Verification</span>
                  <span className="tag text-[10px]">{user.agent?.verification_status?.replace(/_/g, ' ') || 'Not submitted'}</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <Link className="btn primary w-full text-xs font-bold" to="/explore">
              Explore homes <ArrowRight size={15} />
            </Link>
            <Link className="btn outline w-full text-xs font-semibold" to="/user/saved">
              <Bookmark size={15} className="text-futa" /> Saved homes
            </Link>
          </div>
        </section>

        {/* Right 2 columns: Messages & Viewing Requests */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Chats Panel */}
          {user.role === 'user' && (
            <section className="card p-6">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-orange-100 text-futa">
                    <MessageSquare size={17} />
                  </span>
                  <h3 className="text-base font-bold text-ink">In-App Agent Chats</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
                </span>
              </div>

              {loadingItems ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
                  <LoaderCircle size={16} className="animate-spin text-futa" />
                  <span>Loading inquiries…</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-xs font-medium">No active chats yet.</p>
                  <p className="text-[11px] mt-1 text-slate-400">Click "Chat with Agent" on any property listing to start an instant inquiry.</p>
                </div>
              ) : (
                <div className="divide-y divide-orange-100">
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-orange-50/50 p-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProfilePhoto name={c.partner_name} photo={c.partner_avatar} size="regular" />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-ink truncate">
                            {c.partner_business || c.partner_name}
                          </h4>
                          {c.property_title && (
                            <p className="text-[11px] font-semibold text-futa truncate">{c.property_title}</p>
                          )}
                          <p className="text-xs text-slate-500 truncate mt-0.5">{c.last_message}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400">{prettyDate(c.last_message_at)}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedChatConvId(c.id)}
                          className="btn primary btn-sm text-xs py-1 px-3"
                        >
                          Open Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Viewing Inspection Requests Panel */}
          {user.role === 'user' && (
            <section className="card p-6">
              <div className="flex items-center justify-between border-b border-orange-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-orange-100 text-futa">
                    <CalendarDays size={17} />
                  </span>
                  <h3 className="text-base font-bold text-ink">Scheduled Viewings</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {bookings.length} {bookings.length === 1 ? 'request' : 'requests'}
                </span>
              </div>

              {loadingItems ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
                  <LoaderCircle size={16} className="animate-spin text-futa" />
                  <span>Loading viewings…</span>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-xs font-medium">No viewing inspections booked yet.</p>
                  <p className="text-[11px] mt-1 text-slate-400">Request an in-person viewing on any listing to schedule a date with the agent.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <article key={b.id} className="rounded-xl border border-warm-border p-3.5 flex items-center justify-between gap-3 bg-white">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-ink truncate">{b.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Agent: {b.agent_name || 'Assigned Agent'} · Viewing: <strong>{prettyDate(b.viewing_at)}</strong>
                        </p>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                        b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                        b.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

        </div>

      </div>

      {/* Chat Modal when opened from profile */}
      {selectedChatConvId && (
        <ChatModal
          user={user}
          conversationId={selectedChatConvId}
          onClose={() => setSelectedChatConvId(null)}
        />
      )}
    </main>
  );
}
