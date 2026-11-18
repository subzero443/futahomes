import { useEffect, useMemo, useState, useRef, type FormEvent } from 'react';
import {
  ArrowDownToLine, ArrowRight, BadgeCheck, Banknote, BedDouble, Building2, CalendarDays,
  Check, CheckCheck, ChevronRight, CircleAlert, Crown, FileCheck2, Home, LayoutDashboard,
  LoaderCircle, LogOut, Mail, MapPin, Menu, MessageSquare, Plus, Search, Send, ShieldCheck, Sparkles, Upload,
  UserRound, Users, X,
} from 'lucide-react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { api, mediaUrl, naira, prettyDate } from './api';
import BrandMark from './BrandMark';
import ProfilePhoto from './ProfilePhoto';
import ThemeToggle from './ThemeToggle';
import type { Account, Booking, Conversation, DirectMessage, Property } from './types';
import { notifyToast } from './toast';

type AgentSection = 'overview' | 'add' | 'listings' | 'verification' | 'subscriptions' | 'analytics' | 'tools' | 'bookings' | 'enquiries' | 'messages' | 'profile';
type ApiRecord = Record<string, unknown>;
type AgentOverview = {
  stats: { total?: number | string; approved?: number | string; pending?: number | string; rejected?: number | string };
  bookings: { total?: number | string; pending?: number | string; confirmed?: number | string };
  enquiries: number | string | { total?: number | string };
  views: number | string | { total?: number | string };
  profile: {
    business_name?: string | null;
    bio?: string | null;
    verification_status?: string;
    verification_note?: string | null;
    verified_until?: string | null;
    plan?: string;
    plan_expires_at?: string | null;
  };
  effective_plan: string;
  limit: number;
};
type VerificationInfo = {
  verification_status: string;
  verification_note?: string | null;
  verified_until?: string | null;
  has_document: boolean;
  document_type?: string | null;
  plan: string;
  plan_expires_at?: string | null;
};
type AgentPayment = {
  id: number;
  reference: string;
  plan: string;
  amount_kobo: number;
  provider: string;
  status: string;
  paid_at?: string | null;
  created_at: string;
};
type AgentBooking = Booking & { id: number; user_name: string; user_email: string; created_at: string };
type AgentEnquiry = { id: number; reference: string; title: string; user_name: string; user_email: string; user_phone?: string; message?: string; status: string; created_at: string };
type AnalyticsData = { daily: { day: string; total: number }[]; top: { id: number; title: string; views: number }[] };

const navigation: { id: AgentSection; label: string; icon: typeof Home }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'add', label: 'Add housing', icon: Plus },
  { id: 'listings', label: 'My housing', icon: Building2 },
  { id: 'verification', label: 'Verification', icon: ShieldCheck },
  { id: 'subscriptions', label: 'Agent subscriptions', icon: Crown },
  { id: 'analytics', label: 'Housing analytics', icon: Sparkles },
  { id: 'tools', label: 'Agency tools', icon: Users },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'enquiries', label: 'Enquiries', icon: Mail },
  { id: 'messages', label: 'Direct chat', icon: MessageSquare },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

const headings: Record<AgentSection, { title: string; description: string }> = {
  overview: { title: 'Your agent dashboard', description: 'Manage your housing listings and stay on top of student activity.' },
  add: { title: 'Add housing', description: 'Share accurate details so home seekers can find the right place.' },
  listings: { title: 'My housing', description: 'Manage your housing listings and check their moderation status.' },
  verification: { title: 'Agent verification', description: 'Submit your business document and track its review.' },
  subscriptions: { title: 'Agent subscriptions', description: 'Choose a plan that fits the way you work.' },
  analytics: { title: 'Housing analytics', description: 'See the views and activity on your housing listings.' },
  tools: { title: 'Agency tools', description: 'Import multiple housing records with the Premium plan.' },
  bookings: { title: 'Viewing requests', description: 'Manage housing inspection requests from prospective tenants and buyers.' },
  enquiries: { title: 'Customer enquiries', description: 'Keep track of people interested in your housing.' },
  messages: { title: 'Direct student messages', description: 'Chat in real-time with prospective student tenants and home seekers.' },
  profile: { title: 'Profile settings', description: 'Keep your contact and agency information up to date.' },
};

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function countValue(value: number | string | { total?: number | string } | undefined): number {
  if (typeof value === 'object' && value !== null) return Number(value.total) || 0;
  return Number(value) || 0;
}

function isVerified(status?: string, until?: string | null): boolean {
  return status === 'approved' && Boolean(until) && new Date(String(until).replace(' ', 'T')).getTime() > Date.now();
}

function StatusBadge({ value }: { value?: string }) {
  const status = (value || 'unknown').toLowerCase();
  const label = status.replace(/_/g, ' ');
  const tone = ['approved', 'confirmed', 'available', 'paid', 'completed'].includes(status)
    ? 'good'
    : ['pending', 'open'].includes(status) ? 'pending' : ['rejected', 'cancelled', 'unavailable', 'failed', 'closed'].includes(status) ? 'bad' : '';
  return <span className={`agent-status ${tone}`}>{label}</span>;
}

function Metric({ label, value, icon: Icon, help }: { label: string; value: number | string; icon: typeof Home; help?: string }) {
  return <article className="agent-metric"><span className="agent-metric-icon"><Icon size={19} /></span><small>{label}</small><strong>{value}</strong>{help && <span className="agent-metric-help">{help}</span>}</article>;
}

function PropertyForm({ initial, saving, onSave }: {
  initial: Property | null;
  saving: boolean;
  onSave: (values: Record<string, string>, files: File[]) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) values[key] = String(value);
    const mediaField = form.elements.namedItem('media');
    const files = mediaField instanceof HTMLInputElement ? Array.from(mediaField.files ?? []) : [];
    onSave(values, files);
  }

  return (
    <form className="agent-form" onSubmit={submit}>
      <div className="agent-form-grid">
        <label className="agent-field span-two">Housing title<input name="title" defaultValue={initial?.title ?? ''} required minLength={4} maxLength={170} placeholder="e.g. Bright self-contained apartment near FUTA" /></label>
        <label className="agent-field">Housing type<select name="property_type" defaultValue={initial?.property_type ?? 'selfcon'}><option value="selfcon">Self-contained</option><option value="apartment">Apartment</option><option value="hostel">Hostel</option><option value="shared">Shared accommodation</option><option value="house">House</option><option value="other">Other</option></select></label>
        <label className="agent-field">Listing type<select name="listing_type" defaultValue={initial?.listing_type ?? 'rent'}><option value="rent">For rent</option><option value="sale">For sale</option></select></label>
        <label className="agent-field">Price (₦)<input name="price" type="number" min="1" step="0.01" required defaultValue={initial?.price ?? ''} /></label>
        <label className="agent-field">Price period<select name="price_period" defaultValue={initial?.price_period ?? 'year'}><option value="year">Per year</option><option value="month">Per month</option><option value="once">One-time price</option></select></label>
        <label className="agent-field span-two">Total package (optional)<input name="total_package" type="number" min="0" step="0.01" defaultValue={initial?.total_package ?? ''} placeholder="Include extra charges if applicable" /></label>
        <label className="agent-field span-two">Street address<input name="address" required maxLength={200} defaultValue={initial?.address ?? ''} placeholder="Building, street, and nearby landmark" /></label>
        <label className="agent-field span-two">Area / location<input name="location" required maxLength={120} defaultValue={initial?.location ?? ''} placeholder="e.g. South Gate, Akure" /></label>
        <label className="agent-field">Bedrooms<input name="bedrooms" type="number" min="0" max="99" defaultValue={initial?.bedrooms ?? 1} /></label>
        <label className="agent-field">Bathrooms<input name="bathrooms" type="number" min="0" max="99" defaultValue={initial?.bathrooms ?? 1} /></label>
        <label className="agent-field span-two">Description<textarea name="description" rows={5} required minLength={5} maxLength={3000} defaultValue={initial?.description ?? ''} placeholder="Describe the housing, its amenities, and what makes it useful to a home seeker." /></label>
        <label className="agent-field span-two">Photos or videos {initial && <span className="agent-field-note">Adding media sends the listing for moderation again.</span>}<input name="media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple /></label>
      </div>
      <div className="agent-form-actions"><button className="btn primary" type="submit" disabled={saving}>{saving ? <><LoaderCircle size={16} className="agent-spin" /> Saving…</> : <>{initial ? 'Save changes' : 'Submit housing'} <ArrowRight size={16} /></>}</button></div>
    </form>
  );
}

export default function AgentDashboardPage({
  user, sessionReady, onSignOut, onAccountUpdate,
}: {
  user: Account | null;
  sessionReady: boolean;
  onSignOut: () => void;
  onAccountUpdate: (user: Account) => void;
}) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get('section') || 'overview';
  const section: AgentSection = navigation.some((item) => item.id === sectionParam) ? sectionParam as AgentSection : 'overview';
  const [overview, setOverview] = useState<AgentOverview | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [verification, setVerification] = useState<VerificationInfo | null>(null);
  const [payments, setPayments] = useState<AgentPayment[]>([]);
  const [bookings, setBookings] = useState<AgentBooking[]>([]);
  const [enquiries, setEnquiries] = useState<AgentEnquiry[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsDenied, setAnalyticsDenied] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatConvId, setActiveChatConvId] = useState<number | null>(null);
  const [activeChatMessages, setActiveChatMessages] = useState<DirectMessage[]>([]);
  const [activeChatPartner, setActiveChatPartner] = useState<{ id: number; name: string; avatar?: string; phone?: string; email?: string } | null>(null);
  const [activeChatProperty, setActiveChatProperty] = useState<Property | null>(null);
  const [agentChatInput, setAgentChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Property | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toolJson, setToolJson] = useState('[\\n  {\\n    \"title\": \"Example apartment\",\\n    \"description\": \"A clean and comfortable property near FUTA.\",\\n    \"address\": \"12 Example Street\",\\n    \"location\": \"Akure\",\\n    \"price\": 250000,\\n    \"bedrooms\": 1,\\n    \"bathrooms\": 1\\n  }\\n]');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (error) {
      notifyToast(error, 'error');
      setError('');
    } else if (notice) {
      notifyToast(notice);
      setNotice('');
    }
  }, [error, notice]);

  const heading = headings[section];

  useEffect(() => {
    if (!sessionReady || user?.role !== 'agent') return;
    let active = true;
    setLoading(true);
    setError('');
    setNotice('');

    async function load() {
      try {
        if (section === 'overview') {
          const [overviewResult, propertiesResult] = await Promise.all([
            api<AgentOverview>('agent/overview'),
            api<{ properties: Property[] }>('properties/my'),
          ]);
          if (active) { setOverview(overviewResult); setProperties(propertiesResult.properties); }
        } else if (section === 'listings') {
          const [result, overviewResult] = await Promise.all([
            api<{ properties: Property[] }>('properties/my'),
            api<AgentOverview>('agent/overview'),
          ]);
          if (active) { setProperties(result.properties); setOverview(overviewResult); }
        } else if (section === 'add') {
          const result = await api<AgentOverview>('agent/overview');
          if (active) setOverview(result);
        } else if (section === 'verification') {
          const result = await api<{ verification: VerificationInfo }>('agent/verification');
          if (active) setVerification(result.verification);
        } else if (section === 'subscriptions') {
          const [overviewResult, paymentResult] = await Promise.all([
            api<AgentOverview>('agent/overview'),
            api<{ payments: AgentPayment[] }>('agent/payments'),
          ]);
          if (active) { setOverview(overviewResult); setPayments(paymentResult.payments); }
        } else if (section === 'analytics') {
          const result = await api<AnalyticsData>('agent/analytics');
          if (active) { setAnalytics(result); setAnalyticsDenied(false); }
        } else if (section === 'bookings') {
          const result = await api<{ bookings: AgentBooking[] }>('bookings/agent');
          if (active) setBookings(result.bookings);
        } else if (section === 'enquiries') {
          const result = await api<{ enquiries: AgentEnquiry[] }>('enquiries/agent');
          if (active) setEnquiries(result.enquiries);
        } else if (section === 'messages') {
          const result = await api<{ conversations: Conversation[] }>('conversations/list');
          if (active) {
            setConversations(result.conversations);
            if (result.conversations.length > 0 && !activeChatConvId) {
              setActiveChatConvId(result.conversations[0].id);
            }
          }
        } else if (section === 'profile') {
          const result = await api<AgentOverview>('agent/overview');
          if (active) setOverview(result);
        }
      } catch (cause) {
        if (active) {
          if (section === 'analytics') setAnalyticsDenied(true);
          setError(cause instanceof Error ? cause.message : 'Could not load this agent dashboard view.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [section, sessionReady, user?.role, refreshKey]);

  useEffect(() => {
    if (section !== 'messages' || !activeChatConvId || !sessionReady || user?.role !== 'agent') return;
    let active = true;
    setChatLoading(true);
    api<{ messages: DirectMessage[]; property?: Property; partner?: { id: number; name: string; avatar?: string; phone?: string; email?: string } }>('conversations/messages', {
      params: { conversation_id: activeChatConvId },
    })
      .then((res) => {
        if (active) {
          setActiveChatMessages(res.messages);
          if (res.partner) setActiveChatPartner(res.partner);
          if (res.property) setActiveChatProperty(res.property);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setChatLoading(false); });

    const interval = setInterval(() => {
      api<{ messages: DirectMessage[] }>('conversations/messages', {
        params: { conversation_id: activeChatConvId },
      })
        .then((res) => {
          if (active) {
            setActiveChatMessages((prev) => {
              if (res.messages.length > prev.length) {
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                return res.messages;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 3500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [section, activeChatConvId, sessionReady, user?.role]);

  async function handleAgentSendMessage(e: FormEvent) {
    e.preventDefault();
    const text = agentChatInput.trim();
    if (!text || !activeChatConvId || chatSending) return;
    setChatSending(true);
    try {
      const res = await api<{ message: DirectMessage }>('conversations/send', {
        data: { conversation_id: activeChatConvId, message: text },
      });
      setAgentChatInput('');
      setActiveChatMessages((prev) => [...prev, res.message]);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeChatConvId ? { ...c, last_message: text, last_message_at: res.message.created_at } : c))
      );
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (cause) {
      notifyToast(cause instanceof Error ? cause.message : 'Could not send message.', 'error');
    } finally {
      setChatSending(false);
    }
  }

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference || section !== 'subscriptions' || !sessionReady || user?.role !== 'agent') return;
    let active = true;
    setBusy(true);
    api<{ paid: boolean }>('paystack/verify', { data: { reference } })
      .then((result) => { if (active) setNotice(result.paid ? 'Payment confirmed. Your subscription is active.' : 'Payment has not been confirmed yet.'); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not verify the payment.'); })
      .finally(() => {
        if (active) {
          setBusy(false);
          const next = new URLSearchParams(searchParams);
          next.delete('reference');
          setSearchParams(next, { replace: true });
          setRefreshKey((current) => current + 1);
        }
      });
    return () => { active = false; };
  }, [searchParams, section, sessionReady, setSearchParams, user?.role]);

  const filteredProperties = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? properties.filter((item) => `${item.title} ${item.location} ${item.moderation_status}`.toLowerCase().includes(term)) : properties;
  }, [properties, search]);

  if (!sessionReady) return <main className="loading page" role="status">Loading your agent workspace…</main>;
  if (!user) return <Navigate to="/auth-loginfutahomes?/agent/login" replace state={{ from: location }} />;
  if (user.role !== 'agent') return <Navigate to={`/${user.role}/profile?futahomes/account`} replace />;
  const agentUser = user;

  function navigateSection(next: AgentSection) {
    setSearchParams({ section: next });
    setMenuOpen(false);
    setSearch('');
    if (next !== 'add') setEditing(null);
  }

  async function saveProperty(values: Record<string, string>, files: File[]) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = { ...values, ...(editing ? { id: editing.id } : {}) };
      const saved = await api<{ id: number; message: string }>('properties/save', { data: payload });
      for (const file of files) {
        const form = new FormData();
        form.set('property_id', String(saved.id));
        form.set('file', file);
        await api('properties/media', { form });
      }
      setNotice(files.length ? 'Your listing and media were submitted for admin approval.' : saved.message);
      setEditing(null);
      setSearchParams({ section: 'listings' });
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your housing.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteProperty(property: Property) {
    if (!window.confirm(`Delete “${property.title}”? This cannot be undone.`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('properties/delete', { data: { id: property.id } });
      setProperties((current) => current.filter((item) => item.id !== property.id));
      setNotice('Housing listing deleted.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the housing listing.');
    } finally {
      setBusy(false);
    }
  }

  async function setBookingStatus(id: number, status: string) {
    setBusy(true);
    setError('');
    try {
      await api('bookings/status', { data: { id, status } });
      setNotice(`Viewing request ${status}.`);
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the viewing request.');
    } finally {
      setBusy(false);
    }
  }

  async function setEnquiryStatus(id: number, status: string) {
    setBusy(true);
    setError('');
    try {
      await api('enquiries/status', { data: { id, status } });
      setNotice(`Enquiry marked ${status}.`);
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this enquiry.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get('document');
    if (!(file instanceof File) || file.size === 0) {
      setError('Choose a PDF, JPG, or PNG document to submit.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Verification documents must be 5 MB or smaller.');
      return;
    }
    const form = new FormData();
    form.set('document', file);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<{ message: string }>('agent/verification', { form });
      setNotice(result.message);
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit your verification document.');
    } finally {
      setBusy(false);
    }
  }

  async function subscribe(plan: 'pro' | 'premium') {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ url: string }>('paystack/init', { data: { plan } });
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the subscription payment.');
      setBusy(false);
    }
  }

  async function importProperties(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(toolJson);
    } catch {
      setError('The import must be valid JSON. Check commas, quotes, and brackets.');
      return;
    }
    if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
      setError('Provide a JSON array of property objects.');
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ created: number; message: string }>('agent/bulk', { data: { properties: parsed } });
      setNotice(`${result.message} ${result.created} listing(s) added.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import listings.');
    } finally {
      setBusy(false);
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setProfileSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api<{ user: Account }>('profile/update', { data });
      onAccountUpdate(result.user);
      setNotice('Your profile was updated.');
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update your profile.');
    } finally {
      setProfileSaving(false);
    }
  }

  function renderOverview() {
    const stats = overview?.stats;
    const plan = overview?.effective_plan ?? agentUser.agent?.plan ?? 'free';
    const verified = isVerified(overview?.profile?.verification_status ?? agentUser.agent?.verification_status, overview?.profile?.verified_until ?? agentUser.agent?.verified_until);
    return (
      <>
        <section className="agent-welcome-card">
          <div className="agent-welcome-copy">
            <p className="agent-eyebrow">{overview?.profile?.business_name || agentUser.agent?.business_name || 'FUTA HOMES AGENT'}</p>
            <h2>Welcome back, {agentUser.name.split(' ')[0]}.</h2>
            <p>Manage your properties, connect with home seekers, and grow your agency.</p>
            <div className="agent-welcome-actions"><button className="btn primary" onClick={() => navigateSection(verified ? 'add' : 'verification')}>{verified ? 'Add a property' : 'Get verified'} <ArrowRight size={16} /></button><button className="btn outline" onClick={() => navigateSection('listings')}>View listings</button></div>
          </div>
          <div className="agent-house-emblem"><Home size={58} strokeWidth={1.35} /><span><Sparkles size={15} /> Built around your next move</span></div>
        </section>
        {!verified && <section className="agent-notice-card"><ShieldCheck size={21} /><div><strong>Get verified to start listing properties</strong><p>An administrator must approve your business document before you can publish a listing.</p></div><button className="agent-text-button" onClick={() => navigateSection('verification')}>Start verification <ArrowRight size={15} /></button></section>}
        <div className="agent-metrics">
          <Metric label="My properties" value={Number(stats?.total) || 0} icon={Building2} help={`${Number(stats?.approved) || 0} approved`} />
          <Metric label="Pending review" value={Number(stats?.pending) || 0} icon={FileCheck2} help={`${Number(stats?.rejected) || 0} need attention`} />
          <Metric label="Viewing requests" value={Number(overview?.bookings?.total) || 0} icon={CalendarDays} help={`${Number(overview?.bookings?.pending) || 0} awaiting reply`} />
          <Metric label="Property views" value={countValue(overview?.views)} icon={Search} help="All-time listing views" />
        </div>
        <div className="agent-overview-grid">
          <section className="agent-panel">
            <div className="agent-panel-title"><div><h2>Recent properties</h2><p>Keep track of the listings you manage.</p></div><button className="agent-link-button" onClick={() => navigateSection('listings')}>All properties <ChevronRight size={15} /></button></div>
            {properties.slice(0, 4).length ? <div className="agent-recent-properties">{properties.slice(0, 4).map((property) => <div className="agent-recent-property" key={property.id}><img src={mediaUrl(property.image)} alt="" /><div><strong>{property.title}</strong><span><MapPin size={13} />{property.location}</span></div><StatusBadge value={property.moderation_status} /></div>)}</div> : <div className="agent-empty"><Building2 size={26} /><p>Your first listing will appear here once created.</p><button className="agent-link-button" onClick={() => navigateSection(verified ? 'add' : 'verification')}>{verified ? 'Add a property' : 'Complete verification'} <ArrowRight size={15} /></button></div>}
          </section>
          <section className="agent-panel agent-account-panel"><div className="agent-panel-title"><div><h2>Agency status</h2><p>Your account at a glance.</p></div><span className={`agent-verified-badge ${verified ? 'verified' : ''}`}>{verified ? <BadgeCheck size={15} /> : <ShieldCheck size={15} />}{verified ? 'Verified agent' : 'Not verified'}</span></div><div className="agent-account-row"><span>Subscription plan</span><strong>{plan.toUpperCase()}</strong></div><div className="agent-account-row"><span>Listing allowance</span><strong>{overview?.limit ?? 3} active</strong></div><div className="agent-account-row"><span>Customer enquiries</span><strong>{countValue(overview?.enquiries)}</strong></div><button className="agent-link-button" onClick={() => navigateSection('subscriptions')}>Manage subscription <ArrowRight size={15} /></button></section>
        </div>
      </>
    );
  }

  function renderListing() {
    if (section === 'add' && !editing && !isVerified(overview?.profile?.verification_status ?? agentUser.agent?.verification_status, overview?.profile?.verified_until ?? agentUser.agent?.verified_until)) {
      return <section className="agent-panel agent-verification-gate"><ShieldCheck size={28} /><h2>Get verified before you list</h2><p>An administrator needs to approve your agent verification before you can submit a property.</p><button className="btn primary" onClick={() => navigateSection('verification')}>Continue to verification <ArrowRight size={16} /></button></section>;
    }
    if (section === 'add') return <section className="agent-panel"><div className="agent-panel-title"><div><h2>{editing ? 'Edit your property' : 'Property details'}</h2><p>Submitted listings are reviewed by an administrator before they go live.</p></div></div><PropertyForm key={editing?.id ?? 'new'} initial={editing} saving={busy} onSave={(values, files) => void saveProperty(values, files)} /></section>;
    const approvedUntil = overview?.profile?.verified_until ?? agentUser.agent?.verified_until;
    return (
      <>
        <section className="agent-listing-summary"><div><h2>{properties.length} {properties.length === 1 ? 'housing listing' : 'housing listings'}</h2><p>{overview?.limit ?? 3} active listings available on your current plan.</p></div><button className="btn primary" onClick={() => { setEditing(null); navigateSection('add'); }}><Plus size={16} /> Add housing</button></section>
        {filteredProperties.length ? <div className="agent-property-list">{filteredProperties.map((property) => <article className="agent-property-card" key={property.id}><img className="agent-property-image" src={mediaUrl(property.image)} alt={property.title} /><div className="agent-property-info"><div className="agent-property-title-row"><div><h2>{property.title}</h2><p><MapPin size={14} />{property.address}, {property.location}</p></div><StatusBadge value={property.moderation_status} /></div><div className="agent-property-facts"><span>{naira(property.price)}{property.listing_type === 'rent' ? ` / ${property.price_period}` : ''}</span><span><BedDouble size={14} />{property.bedrooms} bed</span><span><Building2 size={14} />{property.views} views</span><span>Submitted {prettyDate(property.created_at)}</span></div>{property.moderation_note && <p className="agent-property-note"><CircleAlert size={14} />{property.moderation_note}</p>}<div className="agent-property-actions"><button className="agent-action-button" onClick={() => { setEditing(property); navigateSection('add'); }}>Edit</button><Link className="agent-action-button" to={`/properties/${property.id}`}>Preview</Link><button className="agent-action-button danger" disabled={busy} onClick={() => void deleteProperty(property)}>Delete</button></div></div></article>)}</div> : <section className="agent-panel agent-empty"><Building2 size={31} /><h2>No housing found</h2><p>{search ? 'Try another search.' : 'Add your first housing to get started.'}</p><button className="btn primary" onClick={() => { setEditing(null); navigateSection(isVerified(overview?.profile?.verification_status ?? agentUser.agent?.verification_status, approvedUntil) ? 'add' : 'verification'); }}>{isVerified(overview?.profile?.verification_status ?? agentUser.agent?.verification_status, approvedUntil) ? 'Add housing' : 'Get verified'} <ArrowRight size={16} /></button></section>}
      </>
    );
  }

  function renderVerification() {
    const current = verification;
    const approved = isVerified(current?.verification_status ?? agentUser.agent?.verification_status, current?.verified_until ?? agentUser.agent?.verified_until);
    const status = current?.verification_status ?? agentUser.agent?.verification_status ?? 'not_submitted';
    return (
      <section className="agent-panel agent-verification-panel">
        <div className="agent-verification-intro"><span className="agent-outline-icon"><ShieldCheck size={24} /></span><div><h2>{approved ? 'You’re a verified FUTA Homes agent' : 'Get verified as a FUTA Homes agent'}</h2><p>Upload proof of housing agency authorization or your business registration certificate. An administrator must approve your document before you can list housing.</p></div><button className="agent-action-button" onClick={() => setRefreshKey((current) => current + 1)}>Refresh status</button></div>
        <div className="agent-verification-status"><div className="agent-panel-title"><div><h3>Your latest application</h3><p>Verification status</p></div><StatusBadge value={status} /></div>{current?.has_document && <p className="agent-document-line"><FileCheck2 size={16} />Document on file <span>{current.document_type || 'Submitted file'}</span></p>}{current?.verification_note && <p className={`agent-verification-note ${status === 'rejected' ? 'bad' : ''}`}><CircleAlert size={15} />{current.verification_note}</p>}{approved && current?.verified_until && <p className="agent-verified-until"><BadgeCheck size={15} />Verified until {prettyDate(current.verified_until)}</p>}{approved && <div className="agent-verified-callout"><BadgeCheck size={18} /> Your document is approved. You can now list housing.</div>}</div>
        <form className="agent-upload-form" onSubmit={(event) => void uploadVerification(event)}><label className="agent-field">Business registration or authorization document<input type="file" name="document" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required /><span className="agent-field-note">PDF, JPG, or PNG · up to 5 MB. A new submission replaces the current document.</span></label><button className="btn primary" type="submit" disabled={busy}><Upload size={16} />{busy ? 'Uploading…' : status === 'not_submitted' ? 'Submit for verification' : 'Resubmit document'}</button></form>
        {!approved && <p className="agent-verification-footnote">Verification documents are private and are only available to you and authorized administrators.</p>}
      </section>
    );
  }

  function renderSubscriptions() {
    const current = overview?.effective_plan ?? agentUser.agent?.plan ?? 'free';
    return (
      <>
        <section className="agent-current-plan"><span className="agent-plan-mark"><Crown size={22} /></span><div><small>CURRENT PLAN</small><h2>{current.toUpperCase()}</h2><p>{overview?.profile?.plan_expires_at ? `Renews / expires ${prettyDate(overview.profile.plan_expires_at)}` : current === 'free' ? 'A simple start for your agency.' : 'Your current subscription is active.'}</p></div><span className="agent-plan-limit">{overview?.limit ?? 3} active listings</span></section>
        <div className="agent-plan-grid">
          <article className={`agent-plan-card ${current === 'pro' ? 'selected' : ''}`}><span className="agent-plan-pill">GROWING AGENCY</span><h2>Pro</h2><p className="agent-plan-price">{naira(10000)}<small> / month</small></p><p className="agent-plan-description">More room to grow and understand listing performance.</p><ul><li><Check size={15} /> Up to 100 active listings</li><li><Check size={15} /> Advanced analytics</li><li><Check size={15} /> Priority placement tools</li></ul><button className="btn primary full" disabled={busy || current === 'pro' || current === 'premium'} onClick={() => void subscribe('pro')}>{current === 'pro' ? 'Current plan' : 'Choose Pro'} <ArrowRight size={16} /></button></article>
          <article className={`agent-plan-card featured ${current === 'premium' ? 'selected' : ''}`}><span className="agent-plan-pill">FOR BUSY TEAMS</span><h2>Premium</h2><p className="agent-plan-price">{naira(15000)}<small> / month</small></p><p className="agent-plan-description">Power tools for agencies managing a growing portfolio.</p><ul><li><Check size={15} /> Up to 250 active listings</li><li><Check size={15} /> Advanced analytics</li><li><Check size={15} /> Bulk housing import tools</li></ul><button className="btn primary full" disabled={busy || current === 'premium'} onClick={() => void subscribe('premium')}>{current === 'premium' ? 'Current plan' : 'Choose Premium'} <ArrowRight size={16} /></button></article>
        </div>
        <section className="agent-panel agent-payment-panel"><div className="agent-panel-title"><div><h2>Payment history</h2><p>Recent subscriptions and payment references.</p></div></div>{payments.length ? <div className="agent-table-wrap"><table className="agent-table"><thead><tr><th>Plan</th><th>Reference</th><th>Amount</th><th>Paid through</th><th>Status</th><th>Date</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{payment.plan.toUpperCase()}</td><td>{payment.reference}</td><td>{naira(payment.amount_kobo / 100)}</td><td>{payment.provider}</td><td><StatusBadge value={payment.status} /></td><td>{prettyDate(payment.paid_at || payment.created_at)}</td></tr>)}</tbody></table></div> : <div className="agent-empty compact"><Banknote size={24} /><p>No subscription payments yet.</p></div>}</section>
      </>
    );
  }

  function renderAnalytics() {
    if (analyticsDenied || (overview?.effective_plan ?? agentUser.agent?.plan ?? 'free') === 'free') return <section className="agent-panel agent-upgrade-card"><span className="agent-outline-icon"><Sparkles size={24} /></span><h2>Unlock housing analytics</h2><p>See 30-day viewing trends and discover which of your housing listings attract the most interest with a Pro or Premium subscription.</p><button className="btn primary" onClick={() => navigateSection('subscriptions')}>Explore subscriptions <ArrowRight size={16} /></button></section>;
    const days = analytics?.daily ?? [];
    const max = Math.max(1, ...days.map((day) => Number(day.total) || 0));
    return <><div className="agent-metrics"><Metric label="Housing views (30 days)" value={days.reduce((sum, item) => sum + Number(item.total || 0), 0)} icon={Search} /><Metric label="Housing tracked" value={analytics?.top.length ?? 0} icon={Building2} /></div><section className="agent-panel"><div className="agent-panel-title"><div><h2>Daily views</h2><p>Listing views over the last 30 days.</p></div></div>{days.length ? <div className="agent-chart">{days.map((day) => <div key={day.day} title={`${day.total} views on ${prettyDate(day.day)}`}><span style={{ height: `${Math.max(4, Number(day.total) / max * 100)}%` }} /><small>{new Date(`${day.day}T12:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</small></div>)}</div> : <div className="agent-empty compact"><Search size={24} /><p>No views have been recorded in the last 30 days.</p></div>}</section><section className="agent-panel"><div className="agent-panel-title"><div><h2>Most viewed housing</h2><p>Listings with the highest total view count.</p></div></div>{analytics?.top.length ? <div className="agent-top-properties">{analytics.top.map((item, index) => <div key={item.id}><span>{index + 1}</span><strong>{item.title}</strong><small>{item.views} views</small></div>)}</div> : <div className="agent-empty compact"><p>Add housing listings to start tracking their performance.</p></div>}</section></>;
  }

  function renderTools() {
    return <section className="agent-panel agent-tools-panel"><div className="agent-panel-title"><div><h2>Bulk housing import</h2><p>Import up to 50 housing listings at once from a JSON array.</p></div><span className="agent-plan-lock"><Crown size={14} /> PREMIUM</span></div><div className="agent-tool-note"><CircleAlert size={17} />Imported housing listings are submitted for admin moderation. Photo uploads are not included in this import tool.</div><form onSubmit={(event) => void importProperties(event)}><label className="agent-field">Housing JSON<textarea className="agent-code-input" rows={15} spellCheck={false} value={toolJson} onChange={(event) => setToolJson(event.target.value)} /></label><div className="agent-form-actions"><button className="btn primary" disabled={busy}><ArrowDownToLine size={16} />{busy ? 'Importing…' : 'Import housing'}</button></div></form></section>;
  }

  function renderBookings() {
    return bookings.length ? <div className="agent-stack">{bookings.map((booking) => <article className="agent-panel agent-record-card" key={booking.id}><div className="agent-record-heading"><div><span className="agent-record-kind">VIEWING REQUEST</span><h2>{booking.title}</h2><p>{booking.user_name} · {booking.user_email}</p></div><StatusBadge value={booking.status} /></div><div className="agent-record-meta"><span><CalendarDays size={15} />{prettyDate(booking.viewing_at)}</span><span><UserRound size={15} />{booking.phone}</span></div>{booking.message && <p className="agent-record-message">{booking.message}</p>}<div className="agent-record-actions">{booking.status === 'pending' && <button className="agent-action-button primary" disabled={busy} onClick={() => void setBookingStatus(booking.id, 'confirmed')}>Confirm viewing</button>}{booking.status === 'confirmed' && <button className="agent-action-button primary" disabled={busy} onClick={() => void setBookingStatus(booking.id, 'completed')}>Mark completed</button>}{!['completed', 'cancelled'].includes(booking.status) && <button className="agent-action-button danger" disabled={busy} onClick={() => void setBookingStatus(booking.id, 'cancelled')}>Cancel</button>}</div></article>)}</div> : <section className="agent-panel agent-empty"><CalendarDays size={30} /><h2>No viewing requests yet</h2><p>Requests from people interested in your housing will appear here.</p></section>;
  }

  function renderEnquiries() {
    return enquiries.length ? <div className="agent-stack">{enquiries.map((enquiry) => <article className="agent-panel agent-record-card" key={enquiry.id}><div className="agent-record-heading"><div><span className="agent-record-kind">{enquiry.reference}</span><h2>{enquiry.title}</h2><p>{enquiry.user_name} · {enquiry.user_email}</p></div><StatusBadge value={enquiry.status} /></div>{enquiry.message && <p className="agent-record-message">{enquiry.message}</p>}<div className="agent-record-meta">{enquiry.user_phone && <span><UserRound size={15} />{enquiry.user_phone}</span>}<span>{prettyDate(enquiry.created_at)}</span></div><div className="agent-record-actions">{enquiry.user_phone && <a className="agent-action-button primary" href={`tel:${enquiry.user_phone}`}>Call customer</a>}{enquiry.status === 'open' && <button className="agent-action-button" disabled={busy} onClick={() => void setEnquiryStatus(enquiry.id, 'contacted')}>Mark contacted</button>}{enquiry.status !== 'closed' && <button className="agent-action-button" disabled={busy} onClick={() => void setEnquiryStatus(enquiry.id, 'closed')}>Close enquiry</button>}</div></article>)}</div> : <section className="agent-panel agent-empty"><Mail size={30} /><h2>No enquiries yet</h2><p>Interested home seekers will show up here.</p></section>;
  }

  function renderMessages() {
    if (!conversations.length) {
      return (
        <section className="agent-panel agent-empty">
          <MessageSquare size={32} />
          <h2>No direct student messages yet</h2>
          <p>When student home seekers click "Chat with Agent" on your housing listings, messages will appear here.</p>
        </section>
      );
    }

    const activeConv = conversations.find((c) => c.id === activeChatConvId) || conversations[0];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 rounded-3xl bg-white border border-warm-border shadow-card overflow-hidden min-h-[580px]">
        {/* Left pane: Conversation list */}
        <div className="border-r border-orange-100 flex flex-col bg-canvas/30">
          <div className="p-4 border-b border-orange-100 bg-white">
            <h3 className="font-bold text-ink text-sm">Conversations ({conversations.length})</h3>
            <p className="text-xs text-slate-500">Student inquiries and viewing chats</p>
          </div>
          <div className="overflow-y-auto divide-y divide-orange-100/60 flex-1">
            {conversations.map((c) => {
              const selected = c.id === (activeChatConvId || activeConv.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveChatConvId(c.id)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                    selected ? 'bg-orange-50/80 border-l-4 border-futa' : 'hover:bg-white'
                  }`}
                >
                  <ProfilePhoto name={c.partner_name} photo={c.partner_avatar} size="regular" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-ink text-xs truncate">{c.partner_name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{prettyDate(c.last_message_at)}</span>
                    </div>
                    {c.property_title && (
                      <p className="text-[11px] font-semibold text-futa truncate">{c.property_title}</p>
                    )}
                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.last_message || 'No messages'}</p>
                  </div>
                  {c.unread_count && c.unread_count > 0 ? (
                    <span className="size-5 rounded-full bg-futa text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {c.unread_count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right pane: Active chat conversation */}
        <div className="md:col-span-2 flex flex-col bg-white">
          {activeConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-orange-100 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <ProfilePhoto name={activeChatPartner?.name || activeConv.partner_name} photo={activeChatPartner?.avatar} size="regular" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-ink text-sm truncate">{activeChatPartner?.name || activeConv.partner_name}</h3>
                    <p className="text-xs text-slate-500 truncate">
                      {activeChatPartner?.phone ? `Phone: ${activeChatPartner.phone}` : activeChatPartner?.email || 'FUTA Home Seeker'}
                    </p>
                  </div>
                </div>
                {activeChatProperty && (
                  <Link
                    to={`/properties/${activeChatProperty.id}`}
                    target="_blank"
                    className="text-xs font-semibold text-futa hover:underline flex items-center gap-1 shrink-0 bg-orange-50 px-2.5 py-1 rounded-lg"
                  >
                    <span>View Housing</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-canvas/30 max-h-[420px] min-h-[340px]">
                {chatLoading ? (
                  <div className="flex h-full items-center justify-center gap-2 text-xs text-slate-500">
                    <LoaderCircle size={16} className="animate-spin text-futa" />
                    <span>Loading conversation…</span>
                  </div>
                ) : activeChatMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-400">
                    <p className="text-xs">No messages yet. Send a friendly reply to the student.</p>
                  </div>
                ) : (
                  activeChatMessages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 text-xs leading-relaxed shadow-2xs ${
                            isMe
                              ? 'bg-futa text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-warm-border rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                          {new Date(msg.created_at.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Footer */}
              <form onSubmit={handleAgentSendMessage} className="p-3 border-t border-orange-100 flex items-center gap-2 bg-white">
                <input
                  type="text"
                  value={agentChatInput}
                  onChange={(e) => setAgentChatInput(e.target.value)}
                  placeholder={`Reply to ${activeConv.partner_name}…`}
                  disabled={chatSending}
                  className="flex-1 rounded-xl border border-orange-200 bg-canvas/30 px-3.5 py-2 text-xs text-ink focus:border-futa focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!agentChatInput.trim() || chatSending}
                  className="flex size-9 items-center justify-center rounded-xl bg-futa text-white hover:bg-futa-dark disabled:opacity-40 transition-all shadow-sm shrink-0"
                >
                  {chatSending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400 text-xs">
              Select a conversation to read and reply.
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderProfile() {
    return <section className="agent-panel agent-profile-panel"><div className="agent-profile-heading"><ProfilePhoto name={agentUser.name} photo={agentUser.avatar} size="large" /><div><h2>{agentUser.name}</h2><p>{agentUser.email}</p></div></div><form className="agent-form" onSubmit={(event) => void updateProfile(event)}><div className="agent-form-grid"><label className="agent-field">Full name<input name="name" required minLength={2} defaultValue={agentUser.name} /></label><label className="agent-field">Phone number<input name="phone" type="tel" defaultValue={agentUser.phone ?? ''} /></label><label className="agent-field span-two">Agency / business name<input name="business_name" maxLength={160} defaultValue={overview?.profile?.business_name ?? agentUser.agent?.business_name ?? ''} /></label><label className="agent-field span-two">About your agency<textarea name="bio" rows={5} maxLength={2000} defaultValue={overview?.profile?.bio ?? agentUser.agent?.bio ?? ''} /></label></div><div className="agent-form-actions"><button className="btn primary" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save profile'} <Check size={16} /></button></div></form></section>;
  }

  function renderContent() {
    switch (section) {
      case 'overview': return renderOverview();
      case 'add':
      case 'listings': return renderListing();
      case 'verification': return renderVerification();
      case 'subscriptions': return renderSubscriptions();
      case 'analytics': return renderAnalytics();
      case 'tools': return renderTools();
      case 'bookings': return renderBookings();
      case 'enquiries': return renderEnquiries();
      case 'messages': return renderMessages();
      case 'profile': return renderProfile();
    }
  }

  const verified = isVerified(overview?.profile?.verification_status ?? agentUser.agent?.verification_status, overview?.profile?.verified_until ?? agentUser.agent?.verified_until);
  const showSearch = section === 'listings';

  return (
    <div className="agent-dashboard">
      <header className="agent-topbar">
        <div className="agent-brand"><BrandMark /></div>
        <nav className="agent-top-links" aria-label="Agent primary navigation"><Link to="/">Home</Link><button className="active" onClick={() => navigateSection('overview')}>Dashboard</button></nav>
        <div className="agent-top-account">
          <ThemeToggle />
          <ProfilePhoto name={agentUser.name} photo={agentUser.avatar} />
          <span>Agent</span>
          <button className="agent-logout" onClick={onSignOut}><LogOut size={16} /><span>Logout</span></button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button className="agent-mobile-menu" aria-label="Open dashboard menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
        </div>
      </header>
      <div className="agent-dashboard-body">
        {menuOpen && <button className="agent-menu-backdrop" aria-label="Close dashboard menu" onClick={() => setMenuOpen(false)} />}
        <aside className={`agent-sidebar${menuOpen ? ' open' : ''}`}>
          <div className="agent-sidebar-head"><span>FUTA HOMES AGENT</span><button aria-label="Close dashboard menu" onClick={() => setMenuOpen(false)}><X size={19} /></button></div>
          <nav aria-label="Agent dashboard">
            {navigation.map(({ id, label, icon: Icon }) => <button key={id} className={section === id ? 'active' : ''} onClick={() => navigateSection(id)}><Icon size={18} /><span>{label}</span>{id === 'verification' && verified && <BadgeCheck size={15} className="agent-nav-verified" />}</button>)}
          </nav>
          <div className="agent-sidebar-theme px-4 py-3 border-t border-orange-100 flex items-center justify-between mt-auto">
            <span className="text-xs font-semibold text-slate-500">Theme</span>
            <ThemeToggle showLabel />
          </div>
        </aside>
        <main className="agent-dashboard-main">
          <div className="agent-page-heading"><div><p className="agent-eyebrow">{section === 'overview' ? 'FUTA HOMES AGENT' : 'YOUR WORKSPACE'}</p><h1>{heading.title}</h1><p>{heading.description}</p></div>{verified && <span className="agent-verified-badge verified large"><BadgeCheck size={17} /> Verified Agent</span>}</div>
          {showSearch && <label className="agent-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your housing…" /><span>{filteredProperties.length}</span></label>}
          {loading ? <div className="agent-loading"><LoaderCircle size={21} /> Loading your dashboard…</div> : renderContent()}
        </main>
      </div>
      {busy && section !== 'add' && section !== 'tools' && <span className="agent-busy-indicator" role="status"><LoaderCircle size={16} /> Updating…</span>}
    </div>
  );
}
