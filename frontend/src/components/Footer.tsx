import { Link, useLocation } from 'react-router-dom';
import { Twitter, Mail, ExternalLink, MessageSquare, Lightbulb, HelpCircle, Flag, Instagram, Linkedin } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FeedbackModal } from './modals/FeedbackModal';
import { useUserByUsername } from '../hooks/useUser';

type FeedbackType = 'suggestion' | 'improvement' | 'contact' | 'report';

export const Footer = memo(function Footer() {
  const location = useLocation();
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('contact');
  const [reporteditineraryId, setReporteditineraryId] = useState<string | undefined>(undefined);
  const [reportedUserId, setReportedUserId] = useState<string | undefined>(undefined);
  const [detectedUsername, setDetectedUsername] = useState<string | undefined>(undefined);

  // Fetch user data if on a user profile page
  const { data: profileUser } = useUserByUsername(detectedUsername || '', {
    enabled: !!detectedUsername,
  });

  // Update reported user ID when profile user data is fetched
  useEffect(() => {
    if (profileUser?.id && detectedUsername) {
      setReportedUserId(profileUser.id);
    }
  }, [profileUser, detectedUsername]);

  const openFeedbackModal = useCallback((type: FeedbackType) => {
    setFeedbackType(type);

    // Auto-detect itinerary or user ID from current page URL
    if (type === 'report') {
      const pathname = location.pathname;

      // Check if on itinerary detail page: /itinerary/:id
      const itineraryMatch = pathname.match(/^\/itinerary\/([^\/]+)$/);
      if (itineraryMatch) {
        setReporteditineraryId(itineraryMatch[1]);
        setReportedUserId(undefined);
        setDetectedUsername(undefined);
      }
      // Check if on user profile page: /u/:username
      else {
        const userMatch = pathname.match(/^\/u\/([^\/]+)$/);
        if (userMatch) {
          const username = userMatch[1];
          setDetectedUsername(username);
          setReporteditineraryId(undefined);
          // User ID will be set automatically by useEffect when profileUser data is fetched
        } else {
          // General report
          setReporteditineraryId(undefined);
          setReportedUserId(undefined);
          setDetectedUsername(undefined);
        }
      }
    } else {
      setReporteditineraryId(undefined);
      setReportedUserId(undefined);
      setDetectedUsername(undefined);
    }

    setFeedbackModalOpen(true);
  }, [location.pathname, profileUser?.id, detectedUsername]);

  return (
    <>
      <footer className="bg-black border-t border-gray-900">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.svg" alt="TripIt logo" className="h-16 w-16" />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Social platform for discovering verified travel itineraries. Connect with travelers, share adventures, and explore the world together.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-6" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>Platform</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Feed</span>
                </Link>
              </li>
              <li>
                <Link to="/travel-groups" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Travel Groups</span>
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Search</span>
                </Link>
              </li>
              <li>
                <Link to="/women-guides" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Women's Guides</span>
                </Link>
              </li>
              <li>
                <Link to="/publish" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Publish</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-6" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>Resources</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>About</span>
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Documentation</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>FAQ</span>
                </a>
              </li>
              <li>
                <Link to="/investor-plans" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Investor Plans</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-6" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>Community</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://x.com/Z_0_io" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>X (Twitter)</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/z_0.io/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Instagram</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="https://farcaster.xyz/z-0-io" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Farcaster</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Feedback & Support */}
          <div>
            <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-6" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>Support</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <button onClick={() => openFeedbackModal('contact')} className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Reach Out</span>
                  <MessageSquare className="h-3 w-3" />
                </button>
              </li>
              <li>
                <button onClick={() => openFeedbackModal('suggestion')} className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Suggestions</span>
                  <Lightbulb className="h-3 w-3" />
                </button>
              </li>
              <li>
                <button onClick={() => openFeedbackModal('improvement')} className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Help Us Improve</span>
                  <HelpCircle className="h-3 w-3" />
                </button>
              </li>
              <li>
                <button onClick={() => openFeedbackModal('report')} className="text-gray-400 hover:text-orange-500 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Report</span>
                  <Flag className="h-3 w-3" />
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-6" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>Legal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-orange-500 transition-colors duration-200">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-8 border-gray-900" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} <span className="text-orange-500 font-semibold">ZERO</span>. All rights reserved.
          </p>

          {/* Social Icons */}
          <div className="flex gap-4 flex-wrap">
            {/* X (Twitter) */}
            <a
              href="https://x.com/Z_0_io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-orange-500 transition-colors duration-200 group"
              aria-label="X (Twitter)"
              title="X"
            >
              <Twitter className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/z_0.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-orange-500 transition-colors duration-200 group"
              aria-label="Instagram"
              title="Instagram"
            >
              <Instagram className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/company/zer0th-protocol/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-orange-500 transition-colors duration-200 group"
              aria-label="LinkedIn"
              title="LinkedIn"
            >
              <Linkedin className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            </a>

            {/* Email */}
            <a
              href="mailto:zer0@z-0.io"
              className="text-gray-400 hover:text-orange-500 transition-colors duration-200 group"
              aria-label="Email"
              title="Email: zer0@z-0.io"
            >
              <Mail className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            </a>
          </div>
        </div>
      </div>
    </footer>

      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        initialType={feedbackType}
        reporteditineraryId={reporteditineraryId}
        reportedUserId={reportedUserId}
      />
    </>
  );
});


