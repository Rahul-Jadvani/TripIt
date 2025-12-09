import { useState, useEffect } from 'react';
import { X, Lightbulb, HelpCircle, MessageSquare, Flag, Send, CheckCircle, AlertCircle, LogIn } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { feedbackService } from '../../services/api';
import { Link } from 'react-router-dom';

type FeedbackType = 'suggestion' | 'improvement' | 'contact' | 'report';
type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'false_info' | 'other';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: FeedbackType;
  reportedProjectId?: string;
  reportedUserId?: string;
}

const feedbackConfig = {
  suggestion: {
    icon: Lightbulb,
    title: 'Share a Suggestion',
    description: 'Have an idea to make ZERO better? We\'d love to hear it!',
    placeholder: 'Tell us your suggestion...',
    color: 'yellow',
  },
  improvement: {
    icon: HelpCircle,
    title: 'Help Us Improve',
    description: 'Found something that could be better? Let us know!',
    placeholder: 'What can we improve?',
    color: 'blue',
  },
  contact: {
    icon: MessageSquare,
    title: 'Reach Out',
    description: 'Want to get in touch? Send us a message!',
    placeholder: 'Your message...',
    color: 'green',
  },
  report: {
    icon: Flag,
    title: 'Report Content',
    description: 'Help us keep ZERO safe and respectful.',
    placeholder: 'Please describe the issue...',
    color: 'red',
  },
};

const accentThemes = {
  yellow: {
    headerBg: 'bg-orange-500/10',
    badge: 'text-orange-300 bg-orange-500/15 border border-orange-500/30',
    focusRing: 'focus:ring-orange-500/30',
    button: 'bg-orange-500 hover:bg-orange-500 text-black',
    subtle: 'text-orange-300',
  },
  blue: {
    headerBg: 'bg-sky-500/10',
    badge: 'text-sky-200 bg-sky-500/15 border border-sky-500/30',
    focusRing: 'focus:ring-sky-500/30',
    button: 'bg-sky-500 hover:bg-sky-400 text-black',
    subtle: 'text-sky-200',
  },
  green: {
    headerBg: 'bg-emerald-500/10',
    badge: 'text-emerald-200 bg-emerald-500/15 border border-emerald-500/30',
    focusRing: 'focus:ring-emerald-500/30',
    button: 'bg-emerald-500 hover:bg-emerald-400 text-black',
    subtle: 'text-emerald-200',
  },
  red: {
    headerBg: 'bg-rose-500/10',
    badge: 'text-rose-200 bg-rose-500/15 border border-rose-500/30',
    focusRing: 'focus:ring-rose-500/30',
    button: 'bg-rose-500 hover:bg-rose-400 text-black',
    subtle: 'text-rose-200',
  },
};

export function FeedbackModal({
  isOpen,
  onClose,
  initialType = 'contact',
  reportedProjectId,
  reportedUserId
}: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(initialType);
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [reportReason, setReportReason] = useState<ReportReason>('spam');
  const [reportProjectId, setReportProjectId] = useState('');
  const [reportUserId, setReportUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    if (isOpen) {
      setFeedbackType(initialType);
      setMessage('');
      setContactEmail('');
      setReportReason('spam');
      setReportProjectId(reportedProjectId || '');
      setReportUserId(reportedUserId || '');
      setError(null);
    }
  }, [isOpen, initialType, reportedProjectId, reportedUserId]);

  const submitMutation = useMutation({
    mutationFn: (data: any) => feedbackService.submitFeedback(data),
    onSuccess: () => {
      // Show success for 1.5s then close
      setTimeout(() => onClose(), 1500);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to submit feedback');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (message.trim().length < 10) {
      setError('Message must be at least 10 characters');
      return;
    }

    const data: any = {
      feedback_type: feedbackType,
      message: message.trim(),
    };

    if (contactEmail) {
      data.contact_email = contactEmail;
    }

    if (feedbackType === 'report') {
      data.report_reason = reportReason;
      // Include project/user IDs if provided (optional for general reports)
      if (reportProjectId.trim()) data.reported_project_id = reportProjectId.trim();
      if (reportUserId.trim()) data.reported_user_id = reportUserId.trim();
    }

    submitMutation.mutate(data);
  };

  if (!isOpen) return null;

  const config = feedbackConfig[feedbackType];
  const Icon = config.icon;
  const accent = accentThemes[config.color] || accentThemes.yellow;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl rounded-2xl border border-white/5 bg-[#050505] shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.01] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl px-3 py-2 ${accent.headerBg}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{config.title}</h2>
                <p className="text-sm text-gray-400">{config.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors rounded-lg p-2 hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Login Required Notice */}
            {!isLoggedIn && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02] text-gray-200">
                <LogIn className="h-5 w-5 flex-shrink-0 text-orange-300" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Login Required</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You need to be logged in to submit feedback.{' '}
                    <Link to="/login" className="underline text-orange-300 hover:text-orange-300" onClick={onClose}>
                      Log in here
                    </Link>
                  </p>
                </div>
              </div>
            )}
            {/* Type selector (hidden for reports with context) */}
            {!reportedProjectId && !reportedUserId && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What would you like to do?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['suggestion', 'improvement', 'contact', 'report'] as FeedbackType[]).map((type) => {
                    const typeConfig = feedbackConfig[type];
                    const TypeIcon = typeConfig.icon;
                    const isSelected = feedbackType === type;
                    const typeAccent = accentThemes[typeConfig.color as keyof typeof accentThemes] || accentThemes.yellow;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFeedbackType(type)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left ${
                          isSelected
                            ? `${typeAccent.badge} shadow-inner`
                            : 'border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold capitalize block">{type}</span>
                          <span className="text-xs text-gray-500">
                            {type === 'report' ? 'Flag a user or project' : 'Share your thoughts'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Report reason */}
            {feedbackType === 'report' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reason for report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as ReportReason)}
                    className="w-full px-3 py-2 bg-[#0c0c0c] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  >
                    <option value="spam">Spam</option>
                    <option value="inappropriate">Inappropriate Content</option>
                    <option value="harassment">Harassment</option>
                    <option value="false_info">False Information</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Optional: Specific project/user IDs */}
                {(reportedProjectId || reportedUserId) && (
                  <div className="p-4 rounded-xl border border-white/10 bg-white/[0.015] text-sm text-gray-300 space-y-1">
                    <p className="font-semibold text-white">Context detected from this page:</p>
                    {reportedProjectId && (
                      <p className="ml-2">
                        Project ID: <span className="font-mono text-white">{reportedProjectId}</span>
                      </p>
                    )}
                    {reportedUserId && (
                      <p className="ml-2">
                        User ID: <span className="font-mono text-white">{reportedUserId}</span>
                      </p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project ID (optional)
                    </label>
                    <input
                      type="text"
                      value={reportProjectId}
                      onChange={(e) => setReportProjectId(e.target.value)}
                      placeholder="e.g., proj-123"
                      className="w-full px-3 py-2 bg-[#0c0c0c] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      User ID (optional)
                    </label>
                    <input
                      type="text"
                      value={reportUserId}
                      onChange={(e) => setReportUserId(e.target.value)}
                      placeholder="e.g., user-456"
                      className="w-full px-3 py-2 bg-[#0c0c0c] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={config.placeholder}
                rows={6}
                maxLength={2000}
                required
                className={`w-full px-3 py-3 bg-[#0c0c0c] border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 resize-none ${accent.focusRing}`}
              />
              <p className="mt-1 text-xs text-gray-500">
                {message.length}/2000 characters (minimum 10)
              </p>
            </div>

            {/* Optional email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email (optional - if you'd like a response)
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your@email.com"
                className={`w-full px-3 py-2 bg-[#0c0c0c] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${accent.focusRing}`}
              />
            </div>

            {/* Success/Error Messages */}
            {submitMutation.isSuccess && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-100">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Thank you for your feedback!</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-100">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                disabled={submitMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isLoggedIn || submitMutation.isPending || submitMutation.isSuccess || message.trim().length < 10}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${accent.button}`}
              >
                <Send className="h-4 w-4" />
                {!isLoggedIn ? 'Login Required' : submitMutation.isPending ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
