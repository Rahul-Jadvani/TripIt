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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-lg rounded-lg bg-gray-900 border border-gray-800 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 bg-gray-800/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-500/20 p-2">
                <Icon className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{config.title}</h2>
                <p className="text-sm text-gray-400">{config.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Login Required Notice */}
            {!isLoggedIn && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-400">
                <LogIn className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Login Required</p>
                  <p className="text-xs text-yellow-400/80 mt-1">
                    You need to be logged in to submit feedback.{' '}
                    <Link to="/login" className="underline hover:text-yellow-300" onClick={onClose}>
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
                <div className="grid grid-cols-2 gap-2">
                  {(['suggestion', 'improvement', 'contact', 'report'] as FeedbackType[]).map((type) => {
                    const typeConfig = feedbackConfig[type];
                    const TypeIcon = typeConfig.icon;
                    const isSelected = feedbackType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFeedbackType(type)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                            : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <TypeIcon className="h-4 w-4" />
                        <span className="text-sm font-medium capitalize">{type}</span>
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400 text-sm">
                    <p className="font-medium mb-1">✓ Auto-detected from current page:</p>
                    {reportedProjectId && (
                      <p className="ml-2">→ Project ID: <span className="font-mono">{reportedProjectId}</span></p>
                    )}
                    {reportedUserId && (
                      <p className="ml-2">→ User ID: <span className="font-mono">{reportedUserId}</span></p>
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
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
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
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {/* Success/Error Messages */}
            {submitMutation.isSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Thank you for your feedback!</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={submitMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isLoggedIn || submitMutation.isPending || submitMutation.isSuccess || message.trim().length < 10}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-500 hover:bg-yellow-600 text-white"
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
