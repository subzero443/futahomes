import { useEffect, useState, type FormEvent } from 'react';
import { Droplet, LoaderCircle, Shield, Sparkles, Star, ThumbsUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, prettyDate } from './api';
import type { Account, Property, PropertyReview, PropertyReviewSummary } from './types';
import { notifyToast } from './toast';
import ProfilePhoto from './ProfilePhoto';

const WATER_OPTIONS = ['Constant', 'Moderate', 'Scarce'];
const POWER_OPTIONS = ['Stable (Prepaid)', 'Frequent outages', 'Generator only'];
const SECURITY_OPTIONS = ['Very safe (Gated)', 'Moderate', 'Caution needed'];

export default function PropertyReviews({
  property,
  user,
}: {
  property: Property;
  user: Account | null;
}) {
  const [reviews, setReviews] = useState<PropertyReview[]>([]);
  const [summary, setSummary] = useState<PropertyReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [water, setWater] = useState('Constant');
  const [power, setPower] = useState('Stable (Prepaid)');
  const [security, setSecurity] = useState('Very safe (Gated)');

  const canReview = user && user.role === 'user';
  const hasReviewed = user && reviews.some((r) => r.user_id === user.id);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<{ reviews: PropertyReview[]; summary: PropertyReviewSummary }>('properties/reviews/list', {
      params: { property_id: property.id },
    })
      .then((res) => {
        if (active) {
          setReviews(res.reviews);
          setSummary(res.summary);
        }
      })
      .catch((cause) => {
        if (active) {
          notifyToast(cause instanceof Error ? cause.message : 'Could not load property reviews.', 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [property.id]);

  async function handleSubmitReview(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api('properties/reviews/create', {
        data: {
          property_id: property.id,
          rating,
          comment: comment.trim(),
          category_water: water,
          category_power: power,
          category_security: security,
        },
      });
      notifyToast('Thank you! Your review has been published.');
      setFormOpen(false);
      setComment('');

      // Reload reviews
      const res = await api<{ reviews: PropertyReview[]; summary: PropertyReviewSummary }>('properties/reviews/list', {
        params: { property_id: property.id },
      });
      setReviews(res.reviews);
      setSummary(res.summary);
    } catch (cause) {
      notifyToast(cause instanceof Error ? cause.message : 'Could not submit review.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const reviewCount = summary?.count || reviews.length;
  const avgRating = summary?.average ? Number(summary.average).toFixed(1) : null;

  return (
    <section className="card p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-orange-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-orange-100 text-futa">
              <Star size={18} fill="currentColor" />
            </span>
            <h2 className="text-xl font-bold text-ink">Student Reviews & Living Experience</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real feedback from students and tenants on water, electricity, security, and landlord responsiveness.
          </p>
        </div>

        {canReview && !hasReviewed && !formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="btn primary btn-sm text-xs"
          >
            <Sparkles size={15} /> Write a Review
          </button>
        )}
      </div>

      {/* Aggregate Score & Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-7 rounded-2xl bg-orange-50/50 border border-orange-100 p-4 sm:p-5">
        <div className="flex items-center gap-3 sm:border-r sm:border-orange-200/60 sm:pr-4">
          <div className="text-3xl font-black text-ink">{avgRating ? avgRating : '—'}</div>
          <div>
            <div className="flex text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  fill={avgRating && Number(avgRating) >= star ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-700">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
            <Droplet size={16} />
          </span>
          <div>
            <strong className="block font-bold text-ink">Borehole Water</strong>
            <span className="text-slate-500">
              {summary?.water_constant ? `${Math.round((summary.water_constant / (reviewCount || 1)) * 100)}% constant` : 'Reported by tenants'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-700">
          <span className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
            <Zap size={16} />
          </span>
          <div>
            <strong className="block font-bold text-ink">Power / NEPA</strong>
            <span className="text-slate-500">
              {summary?.power_stable ? `${Math.round((summary.power_stable / (reviewCount || 1)) * 100)}% prepaid/stable` : 'Prepaid & direct'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-700">
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
            <Shield size={16} />
          </span>
          <div>
            <strong className="block font-bold text-ink">Gated Compound</strong>
            <span className="text-slate-500">
              {summary?.security_safe ? `${Math.round((summary.security_safe / (reviewCount || 1)) * 100)}% secure` : 'Safe neighborhood'}
            </span>
          </div>
        </div>
      </div>

      {/* Review Submission Form Modal / Drawer */}
      {formOpen && (
        <form onSubmit={handleSubmitReview} className="mb-7 rounded-2xl border border-orange-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-orange-100 pb-3">
            <h3 className="text-base font-bold text-ink">Share your experience living here</h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-xs text-slate-400 hover:text-ink font-semibold"
            >
              Cancel
            </button>
          </div>

          {/* Star selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Overall Rating</label>
            <div className="flex items-center gap-1.5 text-amber-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    size={24}
                    fill={(hoverRating || rating) >= s ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-slate-600">
                {['', '1 - Poor', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Excellent'][hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* Practical Campus Experience Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Water Supply</label>
              <select
                value={water}
                onChange={(e) => setWater(e.target.value)}
                className="w-full rounded-xl border border-orange-200 bg-canvas/30 p-2.5 text-xs text-ink focus:border-futa focus:outline-none"
              >
                {WATER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Electricity / Light</label>
              <select
                value={power}
                onChange={(e) => setPower(e.target.value)}
                className="w-full rounded-xl border border-orange-200 bg-canvas/30 p-2.5 text-xs text-ink focus:border-futa focus:outline-none"
              >
                {POWER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Security / Gate</label>
              <select
                value={security}
                onChange={(e) => setSecurity(e.target.value)}
                className="w-full rounded-xl border border-orange-200 bg-canvas/30 p-2.5 text-xs text-ink focus:border-futa focus:outline-none"
              >
                {SECURITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed comment */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Review Details</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What was good or what should future students know before renting? Mention water, light, caretaker attitude, or proximity to campus gates."
              required
              minLength={5}
              maxLength={1500}
              className="w-full rounded-xl border border-orange-200 bg-canvas/30 p-3 text-xs text-ink placeholder:text-slate-400 focus:border-futa focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="btn outline btn-sm text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !comment.trim()}
              className="btn primary btn-sm text-xs"
            >
              {submitting ? <LoaderCircle size={15} className="animate-spin" /> : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {/* Guest Callout */}
      {!user && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-canvas/50 p-3.5 border border-orange-100 text-xs text-slate-600">
          <span>Are you a current or past tenant? Share your review to help fellow FUTA students.</span>
          <Link
            to="/auth-loginfutahomes?/user/login"
            className="font-bold text-futa hover:underline ml-3 shrink-0"
          >
            Sign in to review →
          </Link>
        </div>
      )}

      {/* Reviews Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin text-futa" />
            <span>Loading reviews…</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-orange-200/80 p-8 text-center text-slate-500">
            <Star size={32} className="mx-auto mb-2 text-orange-300" />
            <p className="font-semibold text-ink text-sm">No reviews yet for this home</p>
            <p className="text-xs mt-1 text-slate-400">Be the first tenant or visitor to share your experience!</p>
          </div>
        ) : (
          reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border border-warm-border bg-white p-4 sm:p-5 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ProfilePhoto name={r.user_name} photo={r.user_avatar} size="regular" />
                  <div>
                    <h4 className="text-sm font-bold text-ink">{r.user_name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex text-amber-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            fill={r.rating >= star ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">{r.rating}.0</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{prettyDate(r.created_at)}</span>
              </div>

              {/* Tag Badges */}
              {(r.category_water || r.category_power || r.category_security) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {r.category_water && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                      <Droplet size={11} /> Water: {r.category_water}
                    </span>
                  )}
                  {r.category_power && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                      <Zap size={11} /> Light: {r.category_power}
                    </span>
                  )}
                  {r.category_security && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                      <Shield size={11} /> Security: {r.category_security}
                    </span>
                  )}
                </div>
              )}

              <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{r.comment}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
