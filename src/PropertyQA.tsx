import { useEffect, useState, type FormEvent } from 'react';
import { Check, HelpCircle, LoaderCircle, MessageCircleQuestion, Send, ShieldCheck, Sparkles, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, prettyDate } from './api';
import type { Account, Property, PropertyQuestion } from './types';
import { notifyToast } from './toast';
import ProfilePhoto from './ProfilePhoto';

const TOPIC_CHIPS = [
  { label: '💧 Water supply', text: 'How constant is the borehole or tap water supply here?' },
  { label: '⚡ Light / Prepaid', text: 'Is electricity on a prepaid meter or direct NEPA? How stable is it?' },
  { label: '🛡️ Security & Gate', text: 'Is there a security guard and what is the gate curfew at night?' },
  { label: '💰 Extra Fees', text: 'Are agreement, agency or caution fees included in the total package?' },
];

export default function PropertyQA({
  property,
  user,
}: {
  property: Property;
  user: Account | null;
}) {
  const [questions, setQuestions] = useState<PropertyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionInput, setQuestionInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [answering, setAnswering] = useState(false);

  const isOwnerAgent = user && user.role === 'agent' && user.id === property.agent_id;
  const isAdmin = user && user.role === 'admin';
  const canAnswer = isOwnerAgent || isAdmin;

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<{ questions: PropertyQuestion[] }>('properties/qa/list', {
      params: { property_id: property.id },
    })
      .then((res) => {
        if (active) setQuestions(res.questions);
      })
      .catch((cause) => {
        if (active) {
          notifyToast(cause instanceof Error ? cause.message : 'Could not load community Q&A.', 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [property.id]);

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    const q = questionInput.trim();
    if (!q || asking) return;
    if (!user) {
      notifyToast('Please sign in to ask a question.', 'error');
      return;
    }

    setAsking(true);
    try {
      await api('properties/qa/ask', {
        data: {
          property_id: property.id,
          question: q,
        },
      });
      notifyToast('Your question has been posted!');
      setQuestionInput('');
      // Reload questions
      const res = await api<{ questions: PropertyQuestion[] }>('properties/qa/list', {
        params: { property_id: property.id },
      });
      setQuestions(res.questions);
    } catch (cause) {
      notifyToast(cause instanceof Error ? cause.message : 'Could not post question.', 'error');
    } finally {
      setAsking(false);
    }
  }

  async function handleAnswer(questionId: number) {
    const ans = replyInput.trim();
    if (!ans || answering) return;

    setAnswering(true);
    try {
      await api('properties/qa/answer', {
        data: {
          question_id: questionId,
          answer: ans,
        },
      });
      notifyToast('Your answer has been submitted.');
      setActiveReplyId(null);
      setReplyInput('');
      const res = await api<{ questions: PropertyQuestion[] }>('properties/qa/list', {
        params: { property_id: property.id },
      });
      setQuestions(res.questions);
    } catch (cause) {
      notifyToast(cause instanceof Error ? cause.message : 'Could not submit answer.', 'error');
    } finally {
      setAnswering(false);
    }
  }

  return (
    <section className="card p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-orange-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-orange-100 text-futa">
              <MessageCircleQuestion size={18} />
            </span>
            <h2 className="text-xl font-bold text-ink">Student Community Q&A</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Questions and answers from students, tenants, and the listing agent about this accommodation.
          </p>
        </div>
        <span className="rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-futa">
          {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
        </span>
      </div>

      {/* Ask Question Box */}
      <div className="mb-7 rounded-2xl bg-canvas/40 border border-warm-border p-4 sm:p-5">
        <h3 className="text-sm font-bold text-ink mb-1.5 flex items-center gap-1.5">
          <HelpCircle size={16} className="text-futa" /> Have a question about this home?
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Ask anything about power stability, borehole pumping, security, road condition, or fees.
        </p>

        {/* Quick topic suggestion pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {TOPIC_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setQuestionInput(chip.text)}
              className="rounded-full bg-white border border-orange-200/90 px-3 py-1 text-xs font-medium text-slate-700 hover:border-futa hover:bg-orange-50 hover:text-futa transition-colors shadow-2xs"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {user ? (
          <form onSubmit={handleAsk} className="space-y-3">
            <textarea
              rows={2}
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="e.g. Is borehole water regular? Does the compound lock gates by 10pm?"
              maxLength={1000}
              required
              className="w-full rounded-xl border border-orange-200 bg-white p-3 text-sm text-ink placeholder:text-slate-400 focus:border-futa focus:outline-none focus:ring-2 focus:ring-orange-200/50"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{questionInput.length}/1000</span>
              <button
                type="submit"
                disabled={asking || !questionInput.trim()}
                className="btn primary btn-sm text-xs"
              >
                {asking ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin" /> Posting…
                  </>
                ) : (
                  <>
                    <Send size={15} /> Ask Question
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-orange-200 text-xs text-slate-600">
            <span>Sign in to ask a question to the listing agent and current students.</span>
            <Link
              to="/auth-loginfutahomes?/user/login"
              className="font-bold text-futa hover:underline ml-3 shrink-0"
            >
              Sign in to ask →
            </Link>
          </div>
        )}
      </div>

      {/* Questions & Answers List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin text-futa" />
            <span>Loading community questions…</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-orange-200/80 p-8 text-center text-slate-500">
            <MessageCircleQuestion size={32} className="mx-auto mb-2 text-orange-300" />
            <p className="font-semibold text-ink text-sm">No questions asked yet</p>
            <p className="text-xs mt-1 text-slate-400">Be the first to ask about water, electricity, or tenancy terms!</p>
          </div>
        ) : (
          questions.map((q) => (
            <article key={q.id} className="rounded-2xl border border-warm-border bg-white p-4 sm:p-5 shadow-2xs">
              {/* Question Row */}
              <div className="flex items-start gap-3">
                <ProfilePhoto name={q.user_name} photo={q.user_avatar} size="regular" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-ink">{q.user_name}</span>
                    <span className="text-xs text-slate-400">{prettyDate(q.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-800 mt-1 font-medium">{q.question}</p>
                </div>
              </div>

              {/* Answer Box if answered */}
              {q.answer ? (
                <div className="mt-3.5 ml-3 sm:ml-7 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                        <ShieldCheck size={13} /> {q.business_name || q.answered_by_name || 'Agent'} (Answer)
                      </span>
                    </div>
                    {q.answered_at && <span className="text-[11px] text-slate-400">{prettyDate(q.answered_at)}</span>}
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{q.answer}</p>
                </div>
              ) : (
                <div className="mt-3 ml-3 sm:ml-7 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 rounded-full px-2.5 py-0.5">
                    <span className="size-1.5 rounded-full bg-amber-500 animate-ping" /> Awaiting agent reply
                  </span>

                  {/* If user is the agent or admin, allow answering */}
                  {canAnswer && activeReplyId !== q.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReplyId(q.id);
                        setReplyInput('');
                      }}
                      className="text-xs font-bold text-futa hover:underline"
                    >
                      Answer this question as agent →
                    </button>
                  )}
                </div>
              )}

              {/* Inline Reply Form for Agent */}
              {canAnswer && activeReplyId === q.id && (
                <div className="mt-3 ml-3 sm:ml-7 rounded-xl border border-orange-200 bg-orange-50/50 p-3.5 space-y-2">
                  <p className="text-xs font-bold text-futa">Reply as {property.business_name || property.agent_name}:</p>
                  <textarea
                    rows={2}
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder="Provide accurate information to the student..."
                    className="w-full rounded-lg border border-orange-200 bg-white p-2.5 text-xs text-ink placeholder:text-slate-400 focus:border-futa focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveReplyId(null)}
                      className="btn outline btn-sm text-xs py-1 px-3"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAnswer(q.id)}
                      disabled={answering || !replyInput.trim()}
                      className="btn primary btn-sm text-xs py-1 px-3"
                    >
                      {answering ? <LoaderCircle size={14} className="animate-spin" /> : 'Post Answer'}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
