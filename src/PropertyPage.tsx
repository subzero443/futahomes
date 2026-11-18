import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft, BedDouble, Building2, Calendar, CalendarDays, Check, Eye,
  LoaderCircle, Mail, MapPin, MessageSquare, Phone, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, mediaUrl, naira, prettyDate } from './api';
import type { Account, Property } from './types';
import { notifyToast } from './toast';
import ProfilePhoto from './ProfilePhoto';
import PropertyQA from './PropertyQA';
import PropertyReviews from './PropertyReviews';
import ChatModal from './ChatModal';

export default function PropertyPage({ user }: { user?: Account | null }) {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [selectedMediaIdx, setSelectedMediaIdx] = useState(0);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'qa' | 'reviews'>('details');

  // Modals
  const [chatOpen, setChatOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingPhone, setBookingPhone] = useState(user?.phone || '');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [enquiryLoading, setEnquiryLoading] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setError('This property could not be found.');
      return;
    }
    api<{ property: Property }>('properties/get', { params: { id } })
      .then((result) => {
        setProperty(result.property);
        // Record view count
        api('properties/view', { data: { id } }).catch(() => {});
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not load this property.');
      });
  }, [id]);

  useEffect(() => {
    if (user?.phone && !bookingPhone) {
      setBookingPhone(user.phone);
    }
  }, [user, bookingPhone]);

  // Handle WhatsApp Enquiry
  async function handleWhatsAppEnquiry() {
    if (!property) return;
    if (!user) {
      navigate('/auth-loginfutahomes?/user/login', { state: { from: `/properties/${property.id}` } });
      return;
    }

    setEnquiryLoading(true);
    try {
      const res = await api<{ reference: string; whatsapp_url: string | null }>('enquiries/create', {
        data: {
          property_id: property.id,
          message: `Hello ${property.agent_name}, I am interested in inspecting your listing "${property.title}" on FUTA Homes.`,
        },
      });
      notifyToast(`Inquiry created (${res.reference}). Redirecting to WhatsApp…`);
      if (res.whatsapp_url) {
        window.open(res.whatsapp_url, '_blank');
      } else {
        notifyToast(`Agent phone not registered on WhatsApp. Reference: ${res.reference}`);
      }
    } catch (cause) {
      notifyToast(cause instanceof Error ? cause.message : 'Could not create WhatsApp inquiry.', 'error');
    } finally {
      setEnquiryLoading(false);
    }
  }

  // Handle Booking Request
  async function handleBookingSubmit(e: FormEvent) {
    e.preventDefault();
    if (!property || !bookingDate || !bookingPhone.trim() || bookingSubmitting) return;

    setBookingSubmitting(true);
    try {
      await api('bookings/create', {
        data: {
          property_id: property.id,
          viewing_at: bookingDate.replace('T', ' '),
          phone: bookingPhone.trim(),
          message: bookingMessage.trim(),
        },
      });
      notifyToast('Inspection request sent! The agent has been notified.');
      setBookingOpen(false);
      setBookingMessage('');
    } catch (cause) {
      notifyToast(cause instanceof Error ? cause.message : 'Could not schedule viewing.', 'error');
    } finally {
      setBookingSubmitting(false);
    }
  }

  function openChat() {
    if (!user) {
      navigate('/auth-loginfutahomes?/user/login', { state: { from: `/properties/${property?.id}` } });
      return;
    }
    setChatOpen(true);
  }

  function openBooking() {
    if (!user) {
      navigate('/auth-loginfutahomes?/user/login', { state: { from: `/properties/${property?.id}` } });
      return;
    }
    setBookingOpen(true);
  }

  if (error) {
    return (
      <main className="site-container page section">
        <Link className="back" to="/explore">
          <span className="back-icon"><ArrowLeft size={18} /></span>
          <span>Back to homes</span>
        </Link>
        <div className="alert error" role="alert">{error}</div>
      </main>
    );
  }

  if (!property) return <main className="loading page" role="status">Loading property details…</main>;

  const mediaList = property.media && property.media.length > 0
    ? property.media
    : property.image ? [{ id: 0, file_path: property.image, media_type: 'image' as const }] : [];

  const currentMedia = mediaList[selectedMediaIdx] || mediaList[0];

  return (
    <main className="site-container page detail-page">
      <Link className="back" to="/explore">
        <span className="back-icon"><ArrowLeft size={18} /></span>
        <span>Back to homes</span>
      </Link>

      <div className="detail-layout">
        <div className="detail-main space-y-6">
          
          {/* Main Photo / Video Player */}
          <div className="card overflow-hidden">
            <div className="main-photo relative bg-slate-900 flex items-center justify-center max-h-[460px]">
              {currentMedia?.media_type === 'video' ? (
                <video
                  src={mediaUrl(currentMedia.file_path)}
                  controls
                  className="max-h-[460px] w-full object-contain"
                />
              ) : (
                <img
                  src={mediaUrl(currentMedia?.file_path || property.image)}
                  alt={property.title}
                  className="max-h-[460px] w-full object-cover"
                />
              )}
              <span className="tag absolute top-4 left-4 bg-futa text-white shadow-md">
                {property.listing_type === 'sale' ? 'For sale' : 'For rent'}
              </span>
            </div>

            {/* Media Thumbnails Carousel (if more than 1 media) */}
            {mediaList.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto p-3.5 bg-orange-50/40 border-t border-orange-100">
                {mediaList.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => setSelectedMediaIdx(idx)}
                    className={`relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      selectedMediaIdx === idx ? 'border-futa scale-105 shadow-sm' : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    {item.media_type === 'video' ? (
                      <div className="flex size-full items-center justify-center bg-slate-800 text-white text-[10px] font-bold">
                        VIDEO
                      </div>
                    ) : (
                      <img src={mediaUrl(item.file_path)} alt="" className="size-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Header info */}
            <div className="detail-body p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink leading-tight">{property.title}</h1>
                  <p className="line muted text-sm mt-1.5 flex items-center gap-1.5">
                    <MapPin size={17} className="text-futa shrink-0" /> {property.address}, {property.location}
                  </p>
                </div>
                <div className="text-right">
                  <div className="detail-price">
                    <span className="price text-2xl sm:text-3xl font-black text-futa">{naira(property.price)}</span>
                    {property.listing_type === 'rent' && <span className="muted text-sm font-semibold"> / {property.price_period}</span>}
                  </div>
                  {property.total_package && Number(property.total_package) > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total package: <strong className="text-ink">{naira(property.total_package)}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Core Amenities */}
              <div className="amenities mt-5 flex flex-wrap gap-4 pt-4 border-t border-orange-100 text-sm text-slate-700">
                <span className="flex items-center gap-1.5 font-medium">
                  <BedDouble size={18} className="text-futa" /> {property.bedrooms} {property.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Building2 size={18} className="text-futa" /> {property.bathrooms} {property.bathrooms === 1 ? 'bathroom' : 'bathrooms'}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="capitalize">{property.property_type}</span>
                </span>
                {property.verified_agent && (
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
                    <ShieldCheck size={16} /> Verified agent
                  </span>
                )}
                {property.views > 0 && (
                  <span className="flex items-center gap-1.5 text-slate-400 text-xs ml-auto">
                    <Eye size={15} /> {property.views} views
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Details / Q&A / Reviews) */}
          <div className="flex border-b border-orange-200 gap-2 text-sm font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pb-3 px-4 border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-futa text-futa'
                  : 'border-transparent text-slate-500 hover:text-ink'
              }`}
            >
              Description & Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qa')}
              className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'qa'
                  ? 'border-futa text-futa'
                  : 'border-transparent text-slate-500 hover:text-ink'
              }`}
            >
              <span>Student Q&A</span>
              <span className="size-2 rounded-full bg-futa" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'reviews'
                  ? 'border-futa text-futa'
                  : 'border-transparent text-slate-500 hover:text-ink'
              }`}
            >
              <span>Reviews & Living Experience</span>
            </button>
          </div>

          {/* Tab 1: Description */}
          {activeTab === 'details' && (
            <section className="card p-6 sm:p-7 space-y-4">
              <h2 className="text-xl font-bold text-ink">About this home</h2>
              <p className="description text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {property.description}
              </p>
            </section>
          )}

          {/* Tab 2: Feature 5 - Community Q&A */}
          {activeTab === 'qa' && (
            <PropertyQA property={property} user={user || null} />
          )}

          {/* Tab 3: Feature 5 - Reviews & Ratings */}
          {activeTab === 'reviews' && (
            <PropertyReviews property={property} user={user || null} />
          )}

        </div>

        {/* Sidebar Actions & Agent Contact */}
        <aside className="detail-aside space-y-4">
          <div className="card p-6 space-y-5">
            <div>
              <p className="section-label text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">LISTED BY</p>
              <div className="flex items-center gap-3">
                <ProfilePhoto
                  name={property.business_name || property.agent_name}
                  photo={property.agent_avatar}
                  size="regular"
                />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-ink truncate">{property.business_name || property.agent_name}</h3>
                  <p className="text-xs text-slate-500 truncate">{property.agent_name}</p>
                </div>
              </div>
            </div>

            {property.verified_agent && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                <span>Verified agent on FUTA Homes. Documents verified by administration.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              
              {/* Feature 4: Direct Chat Button */}
              <button
                type="button"
                onClick={openChat}
                className="btn primary w-full font-bold flex items-center justify-center gap-2 shadow-md"
              >
                <MessageSquare size={18} />
                <span>Chat with Agent</span>
              </button>

              {/* Schedule Viewing / Inspection */}
              <button
                type="button"
                onClick={openBooking}
                className="btn outline w-full font-semibold flex items-center justify-center gap-2"
              >
                <CalendarDays size={18} className="text-futa" />
                <span>Schedule Inspection</span>
              </button>

              {/* WhatsApp Lead Inquiry */}
              <button
                type="button"
                onClick={() => void handleWhatsAppEnquiry()}
                disabled={enquiryLoading}
                className="btn outline w-full font-semibold flex items-center justify-center gap-2 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
              >
                {enquiryLoading ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Mail size={18} className="text-emerald-600" />
                )}
                <span>WhatsApp Enquiry</span>
              </button>

              {/* Phone call button */}
              {property.agent_phone && (
                <a
                  className="btn ghost w-full font-semibold flex items-center justify-center gap-2"
                  href={`tel:${property.agent_phone}`}
                >
                  <Phone size={17} /> Call {property.agent_name}
                </a>
              )}
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-normal">
              Viewing requests and in-app messages are saved to your account. Always inspect properties in person before making payments.
            </p>
          </div>
        </aside>
      </div>

      {/* Feature 4: In-App Chat Modal */}
      {chatOpen && (
        <ChatModal
          user={user || null}
          property={property}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Viewing Inspection Booking Modal */}
      {bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-orange-100">
            <div className="flex items-center justify-between border-b border-orange-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-orange-100 text-futa">
                  <CalendarDays size={18} />
                </span>
                <h3 className="text-base font-bold text-ink">Schedule Property Inspection</h3>
              </div>
              <button
                type="button"
                onClick={() => setBookingOpen(false)}
                className="text-slate-400 hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Choose your preferred date and time to physically inspect <strong>{property.title}</strong> with {property.agent_name}.
            </p>

            <form onSubmit={handleBookingSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full rounded-xl border border-orange-200 bg-canvas/30 p-2.5 text-xs text-ink focus:border-futa focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 08012345678"
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  className="w-full rounded-xl border border-orange-200 bg-canvas/30 p-2.5 text-xs text-ink focus:border-futa focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note to Agent (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Coming with my friend from South Gate..."
                  value={bookingMessage}
                  onChange={(e) => setBookingMessage(e.target.value)}
                  className="w-full rounded-xl border border-orange-200 bg-canvas/30 p-2.5 text-xs text-ink focus:border-futa focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingOpen(false)}
                  className="btn outline btn-sm text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting || !bookingDate || !bookingPhone.trim()}
                  className="btn primary btn-sm text-xs"
                >
                  {bookingSubmitting ? <LoaderCircle size={15} className="animate-spin" /> : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
