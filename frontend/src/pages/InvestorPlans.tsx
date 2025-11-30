import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ArrowRight, Building2, Sparkles, Zap, ChevronRight, ChevronLeft, User, Target, Trophy, Gift, Eye, HelpCircle, FileText, AlertCircle, Clock, Edit2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Helper function to get the backend URL
const getBackendUrl = (): string => {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDev = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
  return isDev ? 'http://localhost:5000' : 'https://backend.zer0.pro';
};

const PLANS = [
  {
    id: 'free',
    name: 'Free Tier',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Browse all itinerarys',
      'Request intros to builders',
      'Direct messaging',
      'Basic analytics',
      'Unlimited access (limited time only!)',
    ],
    limitations: [],
    available: true,
    popular: true,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$99',
    period: 'per month',
    description: 'For active investors',
    features: [
      'Everything in Free',
      'Advanced itinerary filters',
      'Priority intro requests',
      'Monthly builder insights report',
      'Early access to featured itinerarys',
      'Verified investor badge',
    ],
    limitations: [],
    available: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For investment firms',
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Custom deal flow pipeline',
      'Team collaboration tools',
      'White-label options',
      'API access',
      'Custom integrations',
    ],
    limitations: [],
    available: false,
  },
];

const INDUSTRIES = [
  'AI/ML',
  'Web3/Blockchain',
  'FinTech',
  'HealthTech',
  'EdTech',
  'E-Commerce',
  'SaaS',
  'DevTools',
  'IoT',
  'Gaming',
  'Social',
  'Other'
];

const INVESTMENT_STAGES = [
  'Pre-seed',
  'Seed',
  'Series A',
  'Series B',
  'Series B+',
  'Growth'
];

const GEOGRAPHIC_FOCUS = [
  'North America',
  'Europe',
  'Asia',
  'Latin America',
  'Middle East',
  'Africa',
  'Global'
];

const VALUE_ADDS = [
  'Mentorship',
  'Network/Intros',
  'Go-to-Market',
  'Recruiting',
  'Fundraising',
  'Product Strategy',
  'Technical Guidance',
  'Marketing/PR'
];

const YEARS_EXPERIENCE_OPTIONS = ['0-2', '3-5', '6-10', '10+'];
const NUM_INVESTMENTS_OPTIONS = ['0-5', '6-15', '16-30', '30+'];
const FUND_SIZE_OPTIONS = ['Under $10M', '$10M-$50M', '$50M-$100M', '$100M-$250M', '$250M-$500M', '$500M+'];

const INVESTOR_FORM_STEPS = [
  {
    id: 1,
    label: 'Basics',
    title: 'Basic Information',
    description: 'Tell us who you are',
  },
  {
    id: 2,
    label: 'Focus',
    title: 'Investment Focus',
    description: 'Share your thesis & stages',
  },
  {
    id: 3,
    label: 'About You',
    title: 'About You',
    description: 'Help founders get to know you',
  },
  {
    id: 4,
    label: 'Track Record',
    title: 'Track Record (Optional)',
    description: 'Highlight any wins',
  },
  {
    id: 5,
    label: 'Value Add',
    title: 'Value Add & Visibility',
    description: 'Show how you support builders',
  },
  {
    id: 6,
    label: 'Review',
    title: 'Review & Submit',
    description: 'Double-check before sending',
  },
];

const TOTAL_INVESTOR_STEPS = INVESTOR_FORM_STEPS.length;

interface NotableInvestment {
  company: string;
  stage: string;
  year: string;
}

export default function InvestorPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEditingPending, setIsEditingPending] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    plan_type: 'free',
    // Basic Info
    investor_type: 'individual',
    name: '',
    company_name: '',
    position_title: '',
    linkedin_url: '',
    website_url: '',
    location: '',
    years_experience: '',
    // Investment Focus
    investment_stages: [] as string[],
    industries: [] as string[],
    ticket_size_min: '',
    ticket_size_max: '',
    geographic_focus: [] as string[],
    // About
    bio: '',
    investment_thesis: '',
    reason: '', // Keep for backward compatibility
    // Track Record
    num_investments: '',
    notable_investments: [] as NotableInvestment[],
    portfolio_highlights: '',
    // Value Add
    value_adds: [] as string[],
    expertise_areas: '',
    // Visibility & Contact
    is_public: false,
    open_to_requests: false,
    twitter_url: '',
    calendar_link: '',
    // Organization
    fund_size: '',
  });

  const [newInvestment, setNewInvestment] = useState<NotableInvestment>({
    company: '',
    stage: '',
    year: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check for pending request on mount
  useEffect(() => {
    const checkPendingRequest = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/investor-requests/my-request`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();

        if (data.status === 'success' && data.data) {
          if (data.data.status === 'pending') {
            setHasPendingRequest(true);
          } else if (data.data.status === 'approved') {
            // Allow approved investors to edit their profile
            setIsEditingPending(true);
            // Auto-select their current plan to skip plan selection screen
            setSelectedPlan(data.data.plan_type || 'free');
            // Pre-fill form with existing data
            setFormData((prev) => ({
              ...prev,
              plan_type: data.data.plan_type || prev.plan_type,
              investor_type: data.data.investor_type || prev.investor_type,
              name: data.data.name || '',
              location: data.data.location || '',
              linkedin_url: data.data.linkedin_url || '',
              company_name: data.data.company_name || '',
              website_url: data.data.website_url || '',
              twitter_url: data.data.twitter_url || '',
              bio: data.data.bio || '',
              investment_stages: data.data.investment_stages || [],
              industries: data.data.industries || [],
              geographic_focus: data.data.geographic_focus || [],
              num_investments: data.data.num_investments || '',
              reason: data.data.reason || '',
              is_public: data.data.is_public !== undefined ? data.data.is_public : prev.is_public,
              value_adds: data.data.value_adds || [],
              expertise_areas: data.data.expertise_areas || '',
              notable_investments: data.data.notable_investments || [],
              portfolio_highlights: data.data.portfolio_highlights || '',
              investment_thesis: data.data.investment_thesis || '',
              ticket_size_min: data.data.ticket_size_min?.toString() || '',
              ticket_size_max: data.data.ticket_size_max?.toString() || '',
              years_experience: data.data.years_experience || '',
              open_to_requests: data.data.open_to_requests ?? prev.open_to_requests,
              calendar_link: data.data.calendar_link || '',
            }));
            return;
          }
        }
      } catch (error) {
        console.error('Error checking request status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkPendingRequest();
  }, [user, navigate]);

  // Validation functions
  const validateLinkedInURL = (url: string): boolean => {
    if (!url) return false;
    const linkedInPattern = /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9-]+\/?$/;
    return linkedInPattern.test(url);
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.linkedin_url.trim()) {
      newErrors.linkedin_url = 'LinkedIn URL is required';
    } else if (!validateLinkedInURL(formData.linkedin_url)) {
      newErrors.linkedin_url = 'Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/yourprofile)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.investment_stages.length === 0) {
      newErrors.investment_stages = 'Please select at least one investment stage';
    }
    if (formData.industries.length === 0) {
      newErrors.industries = 'Please select at least one industry';
    }
    if (formData.geographic_focus.length === 0) {
      newErrors.geographic_focus = 'Please select at least one geographic region';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.bio.trim()) {
      newErrors.bio = 'Bio is required';
    } else if (formData.bio.trim().length < 50) {
      newErrors.bio = 'Bio should be at least 50 characters';
    }
    if (!formData.reason.trim()) {
      newErrors.reason = 'Please tell us why you want to be an investor';
    } else if (formData.reason.trim().length < 30) {
      newErrors.reason = 'Please provide a more detailed explanation (at least 30 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.num_investments) {
      newErrors.num_investments = 'Please select number of investments';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep5 = (): boolean => {
    // Visibility settings are optional, but we should ensure user has made a conscious choice
    // No strict validation here, just clear errors
    setErrors({});
    return true;
  };

  const handleApply = async (planId: string) => {
    if (!user) {
      toast.info('Please login or signup to apply for investor access');
      navigate('/login', { state: { from: '/investor-plans' } });
      return;
    }

    // Check if user already has a pending or approved request
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/investor-requests/my-request`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();

      if (data.status === 'success' && data.data) {
        if (data.data.status === 'pending') {
          // Allow editing of pending request
          // Pre-fill form with existing data
          setFormData((prev) => ({
            ...prev,
            investor_type: data.data.investor_type || 'individual',
            name: data.data.name || '',
            company_name: data.data.company_name || '',
            position_title: data.data.position_title || '',
            linkedin_url: data.data.linkedin_url || '',
            website_url: data.data.website_url || '',
            location: data.data.location || '',
            years_experience: data.data.years_experience || '',
            investment_stages: data.data.investment_stages || [],
            industries: data.data.industries || [],
            ticket_size_min: data.data.ticket_size_min?.toString() || '',
            ticket_size_max: data.data.ticket_size_max?.toString() || '',
            geographic_focus: data.data.geographic_focus || [],
            bio: data.data.bio || '',
            reason: data.data.reason || '',
            investment_thesis: data.data.investment_thesis || '',
            num_investments: data.data.num_investments || '',
            notable_investments: data.data.notable_investments || [],
            portfolio_highlights: data.data.portfolio_highlights || '',
            value_adds: data.data.value_adds || [],
            expertise_areas: data.data.expertise_areas || '',
            is_public: data.data.is_public ?? prev.is_public,
            open_to_requests: data.data.open_to_requests ?? prev.open_to_requests,
            twitter_url: data.data.twitter_url || '',
            calendar_link: data.data.calendar_link || '',
            fund_size: data.data.fund_size || '',
          }));
          setSelectedPlan(data.data.plan_type || planId);
          setIsEditingPending(true);
          return;
        } else if (data.data.status === 'approved') {
          // Allow approved investors to edit their profile
          toast.success('You are already an approved investor! You can update your profile here.');
          setFormData((prev) => ({
            ...prev,
            plan_type: data.data.plan_type || planId,
            investor_type: data.data.investor_type || '',
            name: data.data.name || '',
            company_name: data.data.company_name || '',
            linkedin_url: data.data.linkedin_url || '',
            website_url: data.data.website_url || '',
            location: data.data.location || '',
            years_experience: data.data.years_experience || '',
            investment_stages: data.data.investment_stages || [],
            industries: data.data.industries || [],
            ticket_size_min: data.data.ticket_size_min?.toString() || '',
            ticket_size_max: data.data.ticket_size_max?.toString() || '',
            geographic_focus: data.data.geographic_focus || [],
            bio: data.data.bio || '',
            reason: data.data.reason || '',
            investment_thesis: data.data.investment_thesis || '',
            num_investments: data.data.num_investments || '',
            notable_investments: data.data.notable_investments || [],
            portfolio_highlights: data.data.portfolio_highlights || '',
            value_adds: data.data.value_adds || [],
            expertise_areas: data.data.expertise_areas || '',
            is_public: data.data.is_public !== undefined ? data.data.is_public : prev.is_public,
            open_to_requests: data.data.open_to_requests ?? prev.open_to_requests,
            twitter_url: data.data.twitter_url || '',
            calendar_link: data.data.calendar_link || '',
            fund_size: data.data.fund_size || '',
          }));
          setSelectedPlan(data.data.plan_type || planId);
          setIsEditingPending(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking request status:', error);
    }

    setSelectedPlan(planId);
    setIsEditingPending(false);
  };

  const handleNext = () => {
    // Validate current step before proceeding
    let isValid = true;

    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      case 4:
        isValid = validateStep4();
        break;
      case 5:
        isValid = validateStep5();
        break;
      default:
        isValid = true;
    }

    if (!isValid) {
      toast.error('Please fix the errors before continuing');
      return;
    }

    // Clear errors when moving forward
    setErrors({});

    if (currentStep < TOTAL_INVESTOR_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  const addNotableInvestment = () => {
    if (!newInvestment.company || !newInvestment.stage || !newInvestment.year) {
      toast.error('Please fill all investment details');
      return;
    }
    setFormData({
      ...formData,
      notable_investments: [...formData.notable_investments, newInvestment]
    });
    setNewInvestment({ company: '', stage: '', year: '' });
  };

  const removeNotableInvestment = (index: number) => {
    setFormData({
      ...formData,
      notable_investments: formData.notable_investments.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const backendUrl = getBackendUrl();

      // Convert string numbers to integers for ticket size
      const payload = {
        ...formData,
        plan_type: selectedPlan,
        ticket_size_min: formData.ticket_size_min ? parseInt(formData.ticket_size_min) : undefined,
        ticket_size_max: formData.ticket_size_max ? parseInt(formData.ticket_size_max) : undefined,
      };

      const response = await fetch(`${backendUrl}/api/investor-requests/apply`, {
        method: isEditingPending ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === 'success') {
        if (isEditingPending) {
          toast.success('Investor profile updated successfully!');
          navigate('/investor-dashboard');
        } else {
          toast.success('Application submitted successfully! Your request is under review. Once approved, you will have access to request intros from itinerary builders.');
          navigate('/');
        }
      } else {
        toast.error(data.message || `Failed to ${isEditingPending ? 'update' : 'submit'} application`);
      }
    } catch (error) {
      toast.error(`Failed to ${isEditingPending ? 'update' : 'submit'} application`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedPlan) {
    const plan = PLANS.find((p) => p.id === selectedPlan);
    const totalSteps = TOTAL_INVESTOR_STEPS;
    const currentStepMeta = INVESTOR_FORM_STEPS.find((step) => step.id === currentStep);
    const progress = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 100;

    return (
      <div className="min-h-screen bg-background pt-20 px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="card-elevated p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="h-12 w-12 rounded-[15px] bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border-2 border-primary/50 flex-shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-black mb-2">Apply for {plan?.name}</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Step {currentStep} of {totalSteps}: {currentStepMeta?.title}
                </p>
              </div>
            </div>

            {/* Editing Approved Profile Banner */}
            {isEditingPending && (
              <div className="mb-6 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/12 via-card to-card p-5 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-black shadow-[0_8px_18px_rgba(254,192,23,0.35)]">
                    <Edit2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Profile edit mode</p>
                    <h3 className="text-lg font-black text-foreground">Edit Investor Profile</h3>
                    <p className="text-sm text-muted-foreground">
                      You are editing your approved investor profile. Changes save immediately and update how you appear in the investor directory.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mb-8 space-y-4">
              {/* Compact progress for mobile */}
              <div className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-inner md:hidden">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>
                    Step {currentStep} of {totalSteps}
                  </span>
                  <span>{Math.round(progress)}% complete</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Detailed desktop progress */}
              <div className="hidden md:block">
                <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="text-foreground">Application progress</span>
                    <span className="text-muted-foreground/80">{currentStepMeta?.title}</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/70">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-5 grid grid-cols-6 gap-3">
                    {INVESTOR_FORM_STEPS.map((step) => {
                      const isCurrent = step.id === currentStep;
                      const isCompleted = step.id < currentStep;
                      const canNavigate = step.id <= currentStep;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => canNavigate && setCurrentStep(step.id)}
                          disabled={!canNavigate}
                          className={`flex flex-col gap-2 rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                            canNavigate ? 'cursor-pointer' : 'cursor-default opacity-60'
                          } ${
                            isCurrent
                              ? 'border-primary bg-primary/10'
                              : isCompleted
                                ? 'border-primary/70 bg-primary/5'
                                : 'border-border bg-card/60'
                          }`}
                          aria-current={isCurrent ? 'step' : undefined}
                        >
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                                isCompleted
                                  ? 'border-primary bg-primary text-black'
                                  : isCurrent
                                    ? 'border-primary bg-background text-primary'
                                    : 'border-border/70 bg-card text-muted-foreground'
                              }`}
                            >
                              {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                            </span>
                            <span>{step.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Basic Information</h2>
                </div>

                <div>
                  <Label className="text-sm font-bold mb-2 block">Investor Type *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, investor_type: 'individual' })}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formData.investor_type === 'individual'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-bold">Individual</div>
                      <div className="text-xs text-muted-foreground">Investing individually</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, investor_type: 'organization' })}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formData.investor_type === 'organization'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-bold">Organization</div>
                      <div className="text-xs text-muted-foreground">VC firm / Fund</div>
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold mb-2 block">Full Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name (optional)"
                  />
                </div>

                {formData.investor_type === 'organization' && (
                  <div>
                    <Label className="text-sm font-bold mb-2 block">Company/Fund Name</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="e.g., Acme Ventures"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-sm font-bold mb-2 block">Position/Title</Label>
                  <Input
                    value={formData.position_title}
                    onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                    placeholder="e.g., Partner, Principal, Angel Investor"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-bold mb-2 block">Location *</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, Country"
                      required
                      className={errors.location ? 'border-destructive' : ''}
                    />
                    {errors.location && (
                      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.location}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-bold mb-2 block">Years of Experience</Label>
                    <select
                      value={formData.years_experience}
                      onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">Select...</option>
                      {YEARS_EXPERIENCE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option} years</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold mb-2 block">LinkedIn URL *</Label>
                  <Input
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    required
                    className={errors.linkedin_url ? 'border-destructive' : ''}
                  />
                  {errors.linkedin_url && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.linkedin_url}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-bold mb-2 block">Website</Label>
                  <Input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://... (optional)"
                  />
                </div>

                {formData.investor_type === 'organization' && (
                  <div>
                    <Label className="text-sm font-bold mb-2 block">Fund Size</Label>
                    <select
                      value={formData.fund_size}
                      onChange={(e) => setFormData({ ...formData, fund_size: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">Select...</option>
                      {FUND_SIZE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Investment Focus */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Investment Focus</h2>
                </div>

                <div>
                  <Label className="text-sm font-bold mb-3 block">Investment Stages * (Select all that apply)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {INVESTMENT_STAGES.map(stage => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          investment_stages: toggleArrayItem(formData.investment_stages, stage)
                        })}
                        className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                          formData.investment_stages.includes(stage)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                  {errors.investment_stages && (
                    <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.investment_stages}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-bold mb-3 block">Industries * (Select all that apply)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {INDUSTRIES.map(industry => (
                      <button
                        key={industry}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          industries: toggleArrayItem(formData.industries, industry)
                        })}
                        className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                          formData.industries.includes(industry)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                  {errors.industries && (
                    <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.industries}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-bold">Ticket Size (USD)</Label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover border rounded-md shadow-lg text-xs z-10">
                        The typical investment amount range you're comfortable with. This helps builders understand if their funding needs match your investment capacity.
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Minimum</label>
                      <Input
                        type="number"
                        value={formData.ticket_size_min}
                        onChange={(e) => setFormData({ ...formData, ticket_size_min: e.target.value })}
                        placeholder="e.g., 25000"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Maximum</label>
                      <Input
                        type="number"
                        value={formData.ticket_size_max}
                        onChange={(e) => setFormData({ ...formData, ticket_size_max: e.target.value })}
                        placeholder="e.g., 100000"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold mb-3 block">Geographic Focus * (Select all that apply)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {GEOGRAPHIC_FOCUS.map(geo => (
                      <button
                        key={geo}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          geographic_focus: toggleArrayItem(formData.geographic_focus, geo)
                        })}
                        className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                          formData.geographic_focus.includes(geo)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {geo}
                      </button>
                    ))}
                  </div>
                  {errors.geographic_focus && (
                    <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.geographic_focus}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: About */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">About You</h2>
                </div>

                <div>
                  <Label className="text-sm font-bold mb-2 block">Bio *</Label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className={`w-full min-h-[100px] p-3 rounded-md border bg-background ${errors.bio ? 'border-destructive' : 'border-input'}`}
                    placeholder="Tell us about your background, experience, and what makes you a great investor..."
                    required
                  />
                  {errors.bio ? (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">This will be visible on your public profile</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-bold">Investment Thesis</Label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover border rounded-md shadow-lg text-xs z-10">
                        Describe your investment philosophy, what types of companies/founders you're looking to back, and what excites you about early-stage investing.
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={formData.investment_thesis}
                    onChange={(e) => setFormData({ ...formData, investment_thesis: e.target.value })}
                    className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background"
                    placeholder="What types of companies/founders are you looking to back? What excites you about early-stage investing? (optional)"
                  />
                </div>

                <div>
                  <Label className="text-sm font-bold mb-2 block">Why do you want to be an investor? *</Label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className={`w-full min-h-[100px] p-3 rounded-md border bg-background ${errors.reason ? 'border-destructive' : 'border-input'}`}
                    placeholder="Tell us what you're looking for on Zer0..."
                    required
                  />
                  {errors.reason && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.reason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Track Record */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Track Record</h2>
                </div>

                <div>
                  <Label className="text-sm font-bold mb-2 block">Number of Investments *</Label>
                  <select
                    value={formData.num_investments}
                    onChange={(e) => setFormData({ ...formData, num_investments: e.target.value })}
                    className={`w-full h-10 px-3 rounded-md border bg-background ${errors.num_investments ? 'border-destructive' : 'border-input'}`}
                    required
                  >
                    <option value="">Select...</option>
                    {NUM_INVESTMENTS_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.num_investments && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.num_investments}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-bold">Notable Investments</Label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover border rounded-md shadow-lg text-xs z-10">
                        List companies you've invested in that demonstrate your track record. Include well-known companies, successful exits, or investments that showcase your expertise.
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {formData.notable_investments.map((inv, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{inv.company}</div>
                          <div className="text-xs text-muted-foreground">{inv.stage} • {inv.year}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNotableInvestment(idx)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-4 border-2 border-dashed rounded-lg space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Company"
                        value={newInvestment.company}
                        onChange={(e) => setNewInvestment({ ...newInvestment, company: e.target.value })}
                      />
                      <Input
                        placeholder="Stage"
                        value={newInvestment.stage}
                        onChange={(e) => setNewInvestment({ ...newInvestment, stage: e.target.value })}
                      />
                      <Input
                        placeholder="Year"
                        value={newInvestment.year}
                        onChange={(e) => setNewInvestment({ ...newInvestment, year: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addNotableInvestment}
                      className="w-full btn-secondary text-sm"
                    >
                      Add Investment
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-bold">Portfolio Highlights</Label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover border rounded-md shadow-lg text-xs z-10">
                        Highlight notable exits, unicorns, acquisitions, or other impressive outcomes from your portfolio that demonstrate your ability to identify and support successful companies.
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={formData.portfolio_highlights}
                    onChange={(e) => setFormData({ ...formData, portfolio_highlights: e.target.value })}
                    className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background"
                    placeholder="Any notable exits, unicorns, or portfolio companies you'd like to highlight?"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Value Add & Visibility */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Value Add & Visibility</h2>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Label className="text-sm font-bold">How Can You Help Builders?</Label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover border rounded-md shadow-lg text-xs z-10">
                        Select the ways you can provide value beyond capital. This helps builders understand what additional support you offer.
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {VALUE_ADDS.map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          value_adds: toggleArrayItem(formData.value_adds, value)
                        })}
                        className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                          formData.value_adds.includes(value)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm font-bold">Areas of Expertise</Label>
                    <div className="group relative">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover border rounded-md shadow-lg text-xs z-10">
                        Specific domains where you have deep expertise and can provide strategic guidance. This helps builders find investors with relevant industry knowledge.
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={formData.expertise_areas}
                    onChange={(e) => setFormData({ ...formData, expertise_areas: e.target.value })}
                    className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background"
                    placeholder="e.g., B2B SaaS GTM, marketplace growth, fintech regulations..."
                  />
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold">Visibility Settings *</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Please choose your visibility preferences (required)</p>

                  <div className="space-y-4">
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary/50 transition-all">
                      <input
                        type="checkbox"
                        checked={formData.is_public}
                        onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-sm">Make my profile public</div>
                        <div className="text-xs text-muted-foreground">Your profile will be visible in the public investors directory</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary/50 transition-all">
                      <input
                        type="checkbox"
                        checked={formData.open_to_requests}
                        onChange={(e) => setFormData({ ...formData, open_to_requests: e.target.checked })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-sm">Open to intro requests</div>
                        <div className="text-xs text-muted-foreground">Allow builders to request introductions from you</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold mb-4">Contact & Social</h3>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-bold mb-2 block">Twitter URL</Label>
                      <Input
                        type="url"
                        value={formData.twitter_url}
                        onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                        placeholder="https://twitter.com/..."
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-bold mb-2 block">Calendar Link (for scheduling calls)</Label>
                      <Input
                        type="url"
                        value={formData.calendar_link}
                        onChange={(e) => setFormData({ ...formData, calendar_link: e.target.value })}
                        placeholder="https://calendly.com/..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Review & Submit */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Review Your Application</h2>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                  Please review your information below. You can go back to edit any section.
                </p>

                {/* Basic Information */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm">Basic Information</h3>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{formData.investor_type === 'individual' ? 'Individual Investor' : 'Organization/Fund'}</span></div>
                    {formData.name && <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{formData.name}</span></div>}
                    {formData.company_name && <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{formData.company_name}</span></div>}
                    {formData.position_title && <div><span className="text-muted-foreground">Position:</span> <span className="font-medium">{formData.position_title}</span></div>}
                    <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{formData.location}</span></div>
                    {formData.years_experience && <div><span className="text-muted-foreground">Experience:</span> <span className="font-medium">{formData.years_experience} years</span></div>}
                    <div><span className="text-muted-foreground">LinkedIn:</span> <span className="font-medium text-primary hover:underline"><a href={formData.linkedin_url} target="_blank" rel="noopener noreferrer">{formData.linkedin_url}</a></span></div>
                    {formData.website_url && <div><span className="text-muted-foreground">Website:</span> <span className="font-medium text-primary hover:underline"><a href={formData.website_url} target="_blank" rel="noopener noreferrer">{formData.website_url}</a></span></div>}
                  </div>
                </div>

                {/* Investment Focus */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm">Investment Focus</h3>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Stages:</span> <span className="font-medium">{formData.investment_stages.join(', ')}</span></div>
                    <div><span className="text-muted-foreground">Industries:</span> <span className="font-medium">{formData.industries.join(', ')}</span></div>
                    {(formData.ticket_size_min || formData.ticket_size_max) && (
                      <div><span className="text-muted-foreground">Ticket Size:</span> <span className="font-medium">${formData.ticket_size_min || '0'} - ${formData.ticket_size_max || '∞'}</span></div>
                    )}
                    <div><span className="text-muted-foreground">Geographic Focus:</span> <span className="font-medium">{formData.geographic_focus.join(', ')}</span></div>
                  </div>
                </div>

                {/* About */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm">About You</h3>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Bio:</span> <p className="font-medium mt-1">{formData.bio}</p></div>
                    {formData.investment_thesis && <div><span className="text-muted-foreground">Investment Thesis:</span> <p className="font-medium mt-1">{formData.investment_thesis}</p></div>}
                    <div><span className="text-muted-foreground">Why Investor:</span> <p className="font-medium mt-1">{formData.reason}</p></div>
                  </div>
                </div>

                {/* Track Record */}
                {formData.num_investments && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm">Track Record</h3>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground">Number of Investments:</span> <span className="font-medium">{formData.num_investments}</span></div>
                      {formData.notable_investments.length > 0 && (
                        <div><span className="text-muted-foreground">Notable Investments:</span>
                          <div className="mt-1 space-y-1">
                            {formData.notable_investments.map((inv, idx) => (
                              <div key={idx} className="font-medium">{inv.company} ({inv.stage}, {inv.year})</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {formData.portfolio_highlights && <div><span className="text-muted-foreground">Portfolio Highlights:</span> <p className="font-medium mt-1">{formData.portfolio_highlights}</p></div>}
                    </div>
                  </div>
                )}

                {/* Value Add & Visibility */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm">Value Add & Visibility</h3>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(5)}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {formData.value_adds.length > 0 && <div><span className="text-muted-foreground">Value Adds:</span> <span className="font-medium">{formData.value_adds.join(', ')}</span></div>}
                    {formData.expertise_areas && <div><span className="text-muted-foreground">Expertise:</span> <span className="font-medium">{formData.expertise_areas}</span></div>}
                    <div><span className="text-muted-foreground">Public Profile:</span> <span className="font-medium">{formData.is_public ? 'Yes' : 'No'}</span></div>
                    <div><span className="text-muted-foreground">Open to Requests:</span> <span className="font-medium">{formData.open_to_requests ? 'Yes' : 'No'}</span></div>
                    {formData.twitter_url && <div><span className="text-muted-foreground">Twitter:</span> <span className="font-medium text-primary hover:underline"><a href={formData.twitter_url} target="_blank" rel="noopener noreferrer">{formData.twitter_url}</a></span></div>}
                    {formData.calendar_link && <div><span className="text-muted-foreground">Calendar:</span> <span className="font-medium text-primary hover:underline"><a href={formData.calendar_link} target="_blank" rel="noopener noreferrer">{formData.calendar_link}</a></span></div>}
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    By submitting this application, you confirm that all information provided is accurate. Your application will be reviewed by our team.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-6 border-t mt-8">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevious}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
              )}

              {currentStep === 1 && (
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Back to Plans
                </button>
              )}

              <button
                onClick={handleNext}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading
                  ? (isEditingPending ? 'Saving...' : 'Submitting...')
                  : currentStep === TOTAL_INVESTOR_STEPS
                    ? (isEditingPending ? 'Save Profile' : 'Submit Application')
                    : 'Next'}
                {currentStep < TOTAL_INVESTOR_STEPS && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="text-center mb-12 space-y-4 animate-pulse">
            <div className="h-10 w-48 bg-secondary rounded-full mx-auto"></div>
            <div className="h-12 w-64 bg-secondary rounded mx-auto"></div>
            <div className="h-6 w-96 bg-secondary rounded mx-auto"></div>
          </div>

          {/* Cards grid skeleton */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="relative animate-pulse">
                <div className="rounded-2xl bg-secondary p-6 border-[3px] border-black shadow-[8px_8px_0_0_#000]">
                  <div className="space-y-4">
                    <div className="h-6 w-32 bg-secondary-600 rounded"></div>
                    <div className="h-8 w-20 bg-secondary-600 rounded"></div>
                    <div className="h-4 w-40 bg-secondary-600 rounded"></div>
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-4 w-full bg-secondary-600 rounded"></div>
                      ))}
                    </div>
                    <div className="h-10 w-full bg-secondary-600 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show pending request UI
  if (hasPendingRequest) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="card-elevated p-8 md:p-10">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="h-12 w-12 rounded-[15px] bg-gradient-to-br from-orange-500/30 to-orange-600/30 flex items-center justify-center border-2 border-orange-500/50 flex-shrink-0">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-500" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-black mb-2">Application Under Review</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your investor application has been submitted and is currently being reviewed by our admin team.
                </p>
              </div>
            </div>

            {/* Status Banner */}
            <div className="mb-6 p-6 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-orange-900 dark:text-orange-100 mb-2">
                    Pending Approval
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-300 mb-4">
                    We're reviewing your application to ensure you meet our investor criteria. This typically takes 1-2 business days. You'll receive an email notification once your application has been reviewed.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-orange-900 dark:text-orange-100">
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                    <span className="font-medium">Status: Under Review</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div className="p-4 border-2 border-border rounded-lg bg-muted/30">
                <div className="flex items-start gap-3 mb-3">
                  <Edit2 className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-sm mb-1">Need to make changes?</h3>
                    <p className="text-xs text-muted-foreground">
                      You can edit your application while it's under review. Click the button below to update your information.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleApply('free')}
                  className="btn-primary w-full py-2.5 inline-flex items-center justify-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Application
                </button>
              </div>

              <div className="text-center pt-4">
                <button
                  onClick={() => navigate('/')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Return to Home
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="font-bold text-sm mb-3">What happens next?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground/90">Our team reviews your application and credentials</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground/90">You'll receive an email notification about your application status</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground/90">Once approved, you'll gain access to request intros from builders, investor dashboard, and much more</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 border-2 border-primary/50 rounded-full mb-4 shadow-lg">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-black text-primary tracking-wide">INVESTOR ACCESS</span>
          </div>
          <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Choose Your Plan
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Get access to vetted travel itinerarys, connect with talented builders, and discover the next big thing
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {PLANS.map((plan) => {
            const suffix = plan.id === 'professional' ? 'mo' : (plan.period === 'forever' ? 'forever' : plan.period);
            return (
              <div
                key={plan.id}
                className={`relative transition-all group hover:-translate-y-0.5 ${
                  plan.popular ? 'scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-5 py-2 bg-gradient-to-r from-primary to-accent text-foreground text-sm font-black rounded-full border-4 border-background shadow-lg flex items-center gap-1.5 z-10">
                    <Zap className="h-4 w-4" />
                    RECOMMENDED
                  </div>
                )}

                <div className="rounded-2xl bg-card text-foreground p-6 border-[3px] border-black shadow-[8px_8px_0_0_#000]">
                  <div className="pricing-block-content">
                    <p className="pricing-plan text-xl font-black tracking-tight">{plan.name}</p>
                    <div className="price-value flex items-center gap-2 mt-1">
                      <p className="price-number text-3xl font-black">
                        {plan.price}
                        {suffix && suffix !== 'forever' && (
                          <span className="text-sm font-bold align-top ml-1">/{suffix}</span>
                        )}
                      </p>
                      {suffix === 'forever' && (
                        <div className="text-xs font-bold ml-1 opacity-80">forever</div>
                      )}
                    </div>
                    {plan.id === 'free' && (
                      <div className="pricing-note text-xs text-muted-foreground">free forever</div>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{plan.description}</p>

                    <ul className="check-list mt-4 space-y-2" role="list">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="check-list-item flex items-center gap-2">
                          <svg
                            version={1.0}
                            preserveAspectRatio="xMidYMid meet"
                            height={16}
                            viewBox="0 0 30 30.000001"
                            zoomAndPan="magnify"
                            width={16}
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ color: 'hsl(var(--primary))' }}
                          >
                            <defs>
                              <clipPath id={`id1-${plan.id}-${idx}`}>
                                <path fill="currentColor" clipRule="nonzero" d="M 2.328125 4.222656 L 27.734375 4.222656 L 27.734375 24.542969 L 2.328125 24.542969 Z M 2.328125 4.222656" />
                              </clipPath>
                            </defs>
                            <g clipPath={`url(#id1-${plan.id}-${idx})`}>
                              <path fillRule="nonzero" fillOpacity={1} d="M 27.5 7.53125 L 24.464844 4.542969 C 24.15625 4.238281 23.65625 4.238281 23.347656 4.542969 L 11.035156 16.667969 L 6.824219 12.523438 C 6.527344 12.230469 6 12.230469 5.703125 12.523438 L 2.640625 15.539062 C 2.332031 15.84375 2.332031 16.335938 2.640625 16.640625 L 10.445312 24.324219 C 10.59375 24.472656 10.796875 24.554688 11.007812 24.554688 C 11.214844 24.554688 11.417969 24.472656 11.566406 24.324219 L 27.5 8.632812 C 27.648438 8.488281 27.734375 8.289062 27.734375 8.082031 C 27.734375 7.875 27.648438 7.679688 27.5 7.53125 Z M 27.5 7.53125" fill="currentColor" />
                            </g>
                          </svg>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6">
                      {plan.available ? (
                        <button
                          onClick={() => handleApply(plan.id)}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl border-[3px] border-black bg-primary text-black shadow-[0_-6px_0_0_#000] hover:shadow-[0_-8px_0_0_#000] hover:-translate-y-0.5 transition"
                        >
                          Get Started
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl border-[3px] border-black bg-muted text-muted-foreground shadow-[0_-6px_0_0_#000] opacity-60 cursor-not-allowed"
                        >
                          Coming Soon
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card-elevated p-8 text-center bg-gradient-to-r from-secondary/50 to-secondary/30 border-2 border-primary/20">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary" />
          <h2 className="text-2xl font-black mb-3">Not sure which plan is right for you?</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-2xl mx-auto">
            Start with the free tier and upgrade anytime as your needs grow
          </p>
          <button
            onClick={() => handleApply('free')}
            className="btn-primary gap-2 py-2 px-6 hover:scale-105 transition-transform group text-sm"
          >
            <Zap className="h-4 w-4 group-hover:rotate-12 transition-transform" />
            <span className="font-bold">Start with Free Tier</span>
          </button>
        </div>
      </div>
    </div>
  );
}


