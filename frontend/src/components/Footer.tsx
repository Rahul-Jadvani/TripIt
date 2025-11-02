import { Link, useLocation } from 'react-router-dom';
import { Github, Twitter, Mail, ExternalLink, MessageSquare, Lightbulb, HelpCircle, Flag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FeedbackModal } from './modals/FeedbackModal';
import { useUserByUsername } from '../hooks/useUser';

type FeedbackType = 'suggestion' | 'improvement' | 'contact' | 'report';

export function Footer() {
  const location = useLocation();
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('contact');
  const [reportedProjectId, setReportedProjectId] = useState<string | undefined>(undefined);
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

  const openFeedbackModal = (type: FeedbackType) => {
    setFeedbackType(type);

    // Auto-detect project or user ID from current page URL
    if (type === 'report') {
      const pathname = location.pathname;

      // Check if on project detail page: /project/:id
      const projectMatch = pathname.match(/^\/project\/([^\/]+)$/);
      if (projectMatch) {
        setReportedProjectId(projectMatch[1]);
        setReportedUserId(undefined);
        setDetectedUsername(undefined);
      }
      // Check if on user profile page: /u/:username
      else {
        const userMatch = pathname.match(/^\/u\/([^\/]+)$/);
        if (userMatch) {
          const username = userMatch[1];
          setDetectedUsername(username);
          setReportedProjectId(undefined);
          // User ID will be set automatically by useEffect when profileUser data is fetched
        } else {
          // General report
          setReportedProjectId(undefined);
          setReportedUserId(undefined);
          setDetectedUsername(undefined);
        }
      }
    } else {
      setReportedProjectId(undefined);
      setReportedUserId(undefined);
      setDetectedUsername(undefined);
    }

    setFeedbackModalOpen(true);
  };

  return (
    <>
      <footer className="bg-black border-t border-gray-900">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="ZERO logo" className="h-8 w-8" />
              <h2 className="text-2xl font-bold text-yellow-400" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>ZERO</h2>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Proof-weighted discovery platform for hackathon projects. Connect, build, and discover innovative solutions.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-6" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>Platform</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Feed</span>
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Leaderboard</span>
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Search</span>
                </Link>
              </li>
              <li>
                <Link to="/gallery/hackathon" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Gallery</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-6" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>Resources</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>About</span>
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Documentation</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>FAQ</span>
                </a>
              </li>
              <li>
                <Link to="/investor-plans" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Investor Plans</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Community & Feedback */}
          <div>
            <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-6" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>Community</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>GitHub</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Twitter</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <button onClick={() => openFeedbackModal('contact')} className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Reach Out</span>
                  <MessageSquare className="h-3 w-3" />
                </button>
              </li>
              <li>
                <button onClick={() => openFeedbackModal('suggestion')} className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Suggestions</span>
                  <Lightbulb className="h-3 w-3" />
                </button>
              </li>
              <li>
                <button onClick={() => openFeedbackModal('improvement')} className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Help Us Improve</span>
                  <HelpCircle className="h-3 w-3" />
                </button>
              </li>
              <li>
                <button onClick={() => openFeedbackModal('report')} className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 inline-flex items-center gap-1">
                  <span>Report</span>
                  <Flag className="h-3 w-3" />
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-6" style={{ fontFamily: '"Comic Relief", system-ui', fontWeight: 700 }}>Legal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors duration-200">
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
            &copy; {new Date().getFullYear()} <span className="text-yellow-400 font-semibold">ZERO</span>. All rights reserved.
          </p>

          {/* Social Icons */}
          <div className="flex gap-6">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 group"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 group"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            </a>
            <a
              href="mailto:support@0x.ship"
              className="text-gray-400 hover:text-yellow-400 transition-colors duration-200 group"
              aria-label="Email"
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
        reportedProjectId={reportedProjectId}
        reportedUserId={reportedUserId}
      />
    </>
  );
}
