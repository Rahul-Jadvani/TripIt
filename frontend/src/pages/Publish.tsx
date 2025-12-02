import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { publishProjectSchema, PublishProjectInput } from '@/lib/schemas';
import { useCreateItinerary } from '@/hooks/useItineraries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, Loader2, Users, Info, Check, FileText, Shield, CheckCircle, Rocket, Lightbulb, Target, BookOpen, Search, Sparkles, ChevronLeft, ChevronRight, Github } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PublishLoader, PublishSuccess } from '@/components/PublishLoader';
import { toast } from 'sonner';
import { UserSearchSelect } from '@/components/UserSearchSelect';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/api';

export default function Publish() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  // Multistep state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const stepDefs: { index: number; label: string; anchors: string[] }[] = [
    { index: 1, label: 'Basics', anchors: ['basicsSection', 'linksSection'] },
    { index: 2, label: 'Tech & Categories', anchors: ['categoriesSection', 'techStackSection'] },
    { index: 3, label: 'Team & Story', anchors: ['teamSection', 'storySection', 'marketSection'] },
    { index: 4, label: 'Assets & Submit', anchors: ['pitchDeckSection', 'screenshotsSection'] },
  ];
  const totalSteps = stepDefs.length;
  const scrollToSection = (id?: string) => {
    if (!id) return;
    const el = document.getElementById(id);
    if (el && 'scrollIntoView' in el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const scrollToStep = (step: number) => {
    const def = stepDefs.find(s => s.index === step);
    if (def) scrollToSection(def.anchors[0]);
  };
  const goToStep = (step: number) => {
    const bounded = Math.max(1, Math.min(totalSteps, step));
    setCurrentStep(bounded);
    scrollToStep(bounded);
  };
  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);
  const getStepForId = (id: string): number => {
    // Map direct input ids to their section containers first
    const idToSection: Record<string, string> = {
      title: 'basicsSection',
      tagline: 'basicsSection',
      description: 'basicsSection',
      demoUrl: 'linksSection',
      githubUrl: 'linksSection',
      // Section ids themselves map 1:1
      categoriesSection: 'categoriesSection',
      techStackSection: 'techStackSection',
      teamSection: 'teamSection',
      storySection: 'storySection',
      marketSection: 'marketSection',
      pitchDeckSection: 'pitchDeckSection',
      screenshotsSection: 'screenshotsSection',
    };
    const section = idToSection[id] || id;
    const def = stepDefs.find(s => s.anchors.includes(section));
    return def?.index || 1;
  };
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [githubUrlWarning, setGithubUrlWarning] = useState<string>('');
  const [githubActionLoading, setGithubActionLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ user_id?: string; name: string; role: string; username?: string; avatar_url?: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string; display_name: string; email: string; avatar_url?: string } | null>(null);
  const [memberRole, setMemberRole] = useState('');
  const [showUnregisteredForm, setShowUnregisteredForm] = useState(false);
  const [unregisteredName, setUnregisteredName] = useState('');
  const [unregisteredRole, setUnregisteredRole] = useState('');
  const [showProofScoreInfo, setShowProofScoreInfo] = useState(false);
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const [formErrorsList, setFormErrorsList] = useState<{ id: string; message: string }[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishState, setPublishState] = useState<'loading' | 'success'>('loading');
  const [publishedId, setPublishedId] = useState<string | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubSuccess = params.get('github_success');
    const githubUsername = params.get('github_username');
    const githubError = params.get('github_error');

    if (githubSuccess === 'true' && githubUsername) {
      toast.success(`GitHub connected! Welcome @${githubUsername}`);
      if (refreshUser) refreshUser();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (githubError) {
      toast.error(`GitHub connection failed: ${githubError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshUser]);

  // Hackathons state
  const [hackathons, setHackathons] = useState<{ name: string; date: string; prize?: string }[]>([]);
  const [destinationName, setdestinationName] = useState('');
  const [hackathonDate, setHackathonDate] = useState('');
  const [hackathonPrize, setHackathonPrize] = useState('');

  // NEW: Extended project information
  const [pitchDeckUrl, setPitchDeckUrl] = useState<string>('');
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
  const [uploadingPitchDeck, setUploadingPitchDeck] = useState(false);
  const [projectStory, setProjectStory] = useState('');
  const [inspiration, setInspiration] = useState('');
  const [marketComparison, setMarketComparison] = useState('');
  const [noveltyFactor, setNoveltyFactor] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedChainIds, setSelectedChainIds] = useState<string[]>([]);

  const createProjectMutation = useCreateItinerary();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    trigger,
  } = useForm<PublishProjectInput>({
    resolver: zodResolver(publishProjectSchema),
    defaultValues: {
      title: '',
      tagline: '',
      description: '',
      demoUrl: '',
      githubUrl: '',
      destinationName: '',
      hackathonDate: '',
      techStack: [],
    },
  });
  const descLength = watch('description', '').length;

  // Guarded next for per-step validation
  const handleNext = async () => {
    if (currentStep === 1) {
      const ok = await trigger(['title', 'description', 'githubUrl']);
      if (!ok) {
        setShowErrorSummary(true);
        const firstInvalid = ['title', 'description', 'githubUrl'].find((f) => (errors as any)?.[f]);
        if (firstInvalid) {
          document.getElementById(firstInvalid)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }
    if (currentStep === 2) {
      if (categories.length === 0) {
        setShowErrorSummary(true);
        toast.error('Please select at least one project category');
        scrollToSection('categoriesSection');
        return;
      }
      if (techStack.length === 0) {
        setShowErrorSummary(true);
        toast.error('Please add at least one technology');
        scrollToSection('techStackSection');
        return;
      }
    }
    goToStep(currentStep + 1);
  };

  const handleAddTech = () => {
    if (!techInput.trim()) return;

    const entries = techInput
      .split(',')
      .map((tech) => tech.trim())
      .filter((tech) => tech.length > 0);

    if (entries.length === 0) {
      setTechInput('');
      return;
    }

    setTechStack((prev) => {
      const updated = [...prev];
      entries.forEach((tech) => {
        if (!updated.includes(tech)) {
          updated.push(tech);
        }
      });
      return updated;
    });

    setTechInput('');
  };

  const handleRemoveTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  const handleAddTeamMember = () => {
    if (selectedUser) {
      // Check if user is already added
      if (teamMembers.some(m => m.user_id === selectedUser.id)) {
        toast.error('This user is already added to the team');
        return;
      }

      setTeamMembers([...teamMembers, {
        user_id: selectedUser.id,
        name: selectedUser.display_name || selectedUser.username,
        username: selectedUser.username,
        avatar_url: selectedUser.avatar_url,
        role: memberRole.trim() || 'Team Member'
      }]);
      setSelectedUser(null);
      setMemberRole('');
    }
  };

  const handleAddUnregisteredMember = () => {
    if (unregisteredName.trim()) {
      setTeamMembers([...teamMembers, {
        name: unregisteredName.trim(),
        role: unregisteredRole.trim() || 'Team Member'
      }]);
      setUnregisteredName('');
      setUnregisteredRole('');
      setShowUnregisteredForm(false);
    }
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const handleAddHackathon = () => {
    if (destinationName.trim()) {
      setHackathons([...hackathons, {
        name: destinationName.trim(),
        date: hackathonDate || '',
        prize: hackathonPrize.trim() || undefined
      }]);
      setdestinationName('');
      setHackathonDate('');
      setHackathonPrize('');
    }
  };

  const handleRemoveHackathon = (index: number) => {
    setHackathons(hackathons.filter((_, i) => i !== index));
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (screenshotUrls.length >= 5) {
      toast.error('Maximum 5 screenshots allowed');
      e.target.value = '';
      return;
    }

    const remainingSlots = 5 - screenshotUrls.length;
    if (files.length > remainingSlots) {
      toast.info(`You can add ${remainingSlots} more screenshot${remainingSlots === 1 ? '' : 's'}`);
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

    setUploadingScreenshot(true);
    const uploadedUrls: string[] = [];
    const uploadedFiles: File[] = [];

    try {
      for (const file of filesToProcess) {
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}: Unsupported file type`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: File size must be less than 10MB`);
          continue;
        }

        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const data = await response.json();
          uploadedUrls.push(data.data.url);
          uploadedFiles.push(file);
        } catch (uploadError) {
          if (import.meta.env.DEV) console.error('Screenshot upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (uploadedUrls.length > 0) {
        setScreenshotUrls((prev) => [...prev, ...uploadedUrls]);
        setScreenshotFiles((prev) => [...prev, ...uploadedFiles]);
        toast.success(`Uploaded ${uploadedUrls.length} screenshot${uploadedUrls.length === 1 ? '' : 's'}!`);
      }
    } finally {
      setUploadingScreenshot(false);
      e.target.value = '';
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshotUrls(screenshotUrls.filter((_, i) => i !== index));
    setScreenshotFiles(screenshotFiles.filter((_, i) => i !== index));
  };

  const handlePitchDeckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed for pitch decks');
      return;
    }

    // Validate file size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size must be less than 25MB');
      return;
    }

    setUploadingPitchDeck(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload/pitch-deck`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const ipfsUrl = data.data.url;

      setPitchDeckUrl(ipfsUrl);
      setPitchDeckFile(file);
      toast.success('Pitch deck uploaded successfully!');
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('Pitch deck upload error:', error);
      toast.error('Failed to upload pitch deck');
    } finally {
      setUploadingPitchDeck(false);
      e.target.value = '';
    }
  };

  const handleRemovePitchDeck = () => {
    setPitchDeckUrl('');
    setPitchDeckFile(null);
  };

  const validateGithubUrl = (url: string): boolean => {
    if (!url || !url.trim()) {
      setGithubUrlWarning('');
      return true; // Optional field
    }

    try {
      const urlObj = new URL(url);

      // Check if it's a GitHub URL
      if (!urlObj.hostname.includes('github.com')) {
        setGithubUrlWarning('⚠️ Must be a valid GitHub URL (e.g., https://github.com/username/repo)');
        return false;
      }

      // Check if URL has proper repo format
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      if (pathParts.length < 2) {
        setGithubUrlWarning('⚠️ GitHub URL should include username and repository (e.g., https://github.com/username/repo)');
        return false;
      }

      // If user has connected GitHub, validate username
      if (user?.github_connected && user?.github_username) {
        const username = user.github_username.toLowerCase();
        const urlUsername = pathParts[0].toLowerCase();

        if (urlUsername !== username) {
          setGithubUrlWarning(`⚠️ GitHub URL should belong to your account (@${user.github_username}). Current URL belongs to @${pathParts[0]}`);
          return false;
        }
      }

      setGithubUrlWarning('✓ Valid GitHub URL');
      return true;
    } catch {
      setGithubUrlWarning('⚠️ Invalid URL format. Please enter a complete URL starting with https://');
      return false;
    }
  };

  const handleGithubConnect = async () => {
    setGithubActionLoading(true);
    try {
      const response = await authService.githubConnect();
      const authUrl = response.data?.data?.auth_url;
      if (!authUrl) {
        toast.error('Failed to start GitHub connection');
        setGithubActionLoading(false);
        return;
      }
      window.location.href = authUrl;
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('GitHub connect error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to connect GitHub';
      toast.error(message);
      setGithubActionLoading(false);
    }
  };

  const handleGithubDisconnect = async () => {
    setGithubActionLoading(true);
    try {
      await authService.githubDisconnect();
      toast.success('GitHub account disconnected');
      if (refreshUser) await refreshUser();
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('GitHub disconnect error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to disconnect GitHub';
      toast.error(message);
    } finally {
      setGithubActionLoading(false);
    }
  };

  const onSubmit = async (data: PublishProjectInput) => {
    if (techStack.length === 0) {
      goToStep(getStepForId('techStackSection'));
      scrollToSection('techStackSection');
      toast.error('Please add at least one technology');
      return;
    }

    if (categories.length === 0) {
      goToStep(getStepForId('categoriesSection'));
      scrollToSection('categoriesSection');
      toast.error('Please select at least one project category');
      return;
    }

    // Validate GitHub URL if provided
    if (data.githubUrl && !validateGithubUrl(data.githubUrl)) {
      toast.error('Please fix the GitHub URL before publishing');
      return;
    }

    try {
      // Convert camelCase to snake_case for backend
      const payload: any = {
        title: data.title,
        description: data.description,
        tech_stack: techStack,
      };

      // Add optional fields only if they have values
      if (data.tagline && data.tagline.trim()) {
        payload.tagline = data.tagline;
      }
      if (data.demoUrl && data.demoUrl.trim()) {
        payload.demo_url = data.demoUrl;
      }
      if (data.githubUrl && data.githubUrl.trim()) {
        payload.github_url = data.githubUrl;
      }
      // Send hackathons array if any exist
      if (hackathons.length > 0) {
        payload.hackathons = hackathons;
      }
      if (screenshotUrls.length > 0) {
        payload.screenshot_urls = screenshotUrls;
      }
      if (teamMembers.length > 0) {
        payload.team_members = teamMembers.map((m) => {
          const t: any = {};
          if (m.user_id) t.user_id = m.user_id;
          if (m.name) t.name = m.name;
          if (m.role) t.role = m.role;
          if (m.username) t.username = m.username;
          if (m.avatar_url) t.avatar_url = m.avatar_url; // omit null/undefined to avoid backend null errors
          return t;
        });
      }
      // NEW: Add extended project information
      if (projectStory && projectStory.trim()) {
        payload.project_story = projectStory;
      }
      if (inspiration && inspiration.trim()) {
        payload.inspiration = inspiration;
      }
      if (pitchDeckUrl && pitchDeckUrl.trim()) {
        payload.pitch_deck_url = pitchDeckUrl;
      }
      if (marketComparison && marketComparison.trim()) {
        payload.market_comparison = marketComparison;
      }
      if (noveltyFactor && noveltyFactor.trim()) {
        payload.novelty_factor = noveltyFactor;
      }
      if (categories && categories.length > 0) {
        payload.categories = categories;
      }
      if (selectedChainIds && selectedChainIds.length > 0) {
        payload.chain_ids = selectedChainIds;
      }

      if (import.meta.env.DEV) {
        console.log('=== SUBMITTING PROJECT ===');
        console.log('GitHub URL from form:', data.githubUrl);
        console.log('Full payload being sent:', JSON.stringify(payload, null, 2));
        console.log('========================');
      }

      setShowPublishModal(true);
      setPublishState('loading');
      const res: any = await createProjectMutation.mutateAsync(payload);
      const newId = res?.data?.data?.id || res?.data?.data?.project_id || res?.data?.id;
      toast.success('Project published successfully!');
      setPublishedId(newId);
      setPublishState('success');
      reset();
      setTechStack([]);
      setScreenshotUrls([]);
      setTeamMembers([]);
      // NEW: Reset extended fields
      setProjectStory('');
      setInspiration('');
      setPitchDeckUrl('');
      setPitchDeckFile(null);
      setMarketComparison('');
      setNoveltyFactor('');
      setCategories([]);
      setSelectedChainIds([]);
      // Navigation handled by success modal action
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('Error publishing project:', error);
      // Friendly fallback
      toast.error('Please fix the highlighted fields and try again.');

      // Try to surface actionable errors without dumping backend JSON
      const apiErr = error?.response?.data;
      const list: { id: string; message: string }[] = [];
      if (apiErr && typeof apiErr === 'object') {
        // Common shape: { team_members: { 0: { avatar_url: ['Field may not be null.'] } } }
        if (apiErr.team_members) {
          list.push({ id: 'teamSection', message: 'Team: Remove empty avatar values or add member details' });
        }
        if (apiErr.title) list.push({ id: 'title', message: 'Title: ' + (apiErr.title?.[0] || 'Invalid') });
        if (apiErr.description) list.push({ id: 'description', message: 'Description: ' + (apiErr.description?.[0] || 'Invalid') });
      }
      if (list.length) {
        setFormErrorsList(list);
        setShowErrorSummary(true);
        const firstId = list[0]?.id;
        if (firstId) {
          goToStep(getStepForId(firstId));
          document.getElementById(firstId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  // When validation fails, show a structured error summary and scroll to first error
  const onInvalid = (formErrors: any) => {
    const list: { id: string; message: string }[] = [];
    if (formErrors?.title?.message) list.push({ id: 'title', message: `Title: ${formErrors.title.message}` });
    if (formErrors?.description?.message) list.push({ id: 'description', message: `Description: ${formErrors.description.message}` });
    if (formErrors?.demoUrl?.message) list.push({ id: 'demoUrl', message: `Demo URL: ${formErrors.demoUrl.message}` });
    if (formErrors?.githubUrl?.message) list.push({ id: 'githubUrl', message: `GitHub URL: ${formErrors.githubUrl.message}` });
    // Business rules
    if (techStack.length === 0) list.push({ id: 'techStackSection', message: 'Travel Style & Activities: Add at least one technology' });
    if (categories.length === 0) list.push({ id: 'categoriesSection', message: 'Categories: Select at least one category' });

    setFormErrorsList(list);
    setShowErrorSummary(true);
    // Scroll to the first error block/field
    const firstId = list[0]?.id;
    if (firstId) {
      goToStep(getStepForId(firstId));
      const el = document.getElementById(firstId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    toast.error('Please fix the highlighted fields');
  };

  return (
    <div className="bg-background min-h-screen publish-compact">
      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
            <DialogContent className="sm:max-w-md bg-card border-4 border-black rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black">{publishState === 'loading' ? 'Publishing…' : 'All set!'}</DialogTitle>
              </DialogHeader>
              {publishState === 'loading' ? (
                <PublishLoader message="Sending your project to camp…" />
              ) : (
                <PublishSuccess
                  projectId={publishedId}
                  onGo={() => {
                    setShowPublishModal(false);
                    if (publishedId) navigate(`/project/${publishedId}`); else navigate('/my-projects');
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
          {/* Header section */}
          <div className="mb-10 card-elevated p-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="mb-2 text-4xl font-black text-foreground">Publish Your Itinerary</h1>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Share your incredible travel itinerary with our community. Get discovered, receive feedback, and connect with fellow travelers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProofScoreInfo(!showProofScoreInfo)}
                className="ml-4 p-3 rounded-full bg-primary/20 hover:bg-primary/30 transition-smooth border-2 border-primary flex-shrink-0"
                title="Learn about Proof Score"
              >
                <Info className="h-6 w-6 text-primary" />
              </button>
            </div>

            {/* Multistep Progress */}
            <div className="relative mb-4">
              <div className="relative h-2 bg-secondary/30 rounded-full overflow-hidden border-2 border-black">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {stepDefs.map((s) => {
                  const isActive = currentStep === s.index;
                  const isCompleted = currentStep > s.index;
                  return (
                    <button
                      key={s.index}
                      type="button"
                      className={`flex items-center gap-3 p-3 rounded-[12px] border-2 ${
                        isActive ? 'bg-primary text-black border-black' : isCompleted ? 'bg-success text-black border-black' : 'bg-secondary/20 text-foreground border-black'
                      }`}
                      onClick={() => goToStep(s.index)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black border-2 border-black ${
                        isCompleted ? 'bg-success' : isActive ? 'bg-primary' : 'bg-background'
                      }`}>
                        {isCompleted ? '✓' : s.index}
                      </div>
                      <span className="font-bold text-sm truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* Navigation buttons moved to bottom */}
            </div>

            {/* Quick section navigation */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { id: 'basicsSection', label: 'Basics' },
                { id: 'categoriesSection', label: 'Categories & layerz' },
                { id: 'linksSection', label: 'Links' },
                { id: 'techStackSection', label: 'Travel Style & Activities' },
                { id: 'teamSection', label: 'Team' },
                { id: 'storySection', label: 'Story' },
                { id: 'marketSection', label: 'Market' },
                { id: 'pitchDeckSection', label: 'Pitch Deck' },
                { id: 'screenshotsSection', label: 'Screenshots' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    goToStep(getStepForId(s.id));
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="badge badge-dash badge-secondary hover:opacity-90"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* GitHub Connection - Outside Form */}
            <div className="mt-6 p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">GitHub Connection</p>
                  <p className="text-xs text-muted-foreground">Connect your GitHub to enable AI analysis of your code and team credentials</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {user?.github_connected ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGithubDisconnect}
                        disabled={githubActionLoading}
                      >
                        <X className="h-3.5 w-3.5" />
                        {githubActionLoading ? 'Working...' : 'Disconnect'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleGithubConnect}
                        disabled={githubActionLoading}
                      >
                        <Github className="h-3.5 w-3.5" />
                        Reconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGithubConnect}
                      disabled={githubActionLoading}
                    >
                      <Github className="h-3.5 w-3.5" />
                      {githubActionLoading ? 'Opening...' : 'Connect GitHub'}
                    </Button>
                  )}
                </div>
                {user?.github_connected && (
                  <span className="text-xs text-primary font-medium inline-flex items-center gap-1">
                    <Github className="h-3 w-3" />
                    @{user.github_username}
                  </span>
                )}
              </div>
            </div>

            {/* Proof Score Info - Collapsible */}
            {showProofScoreInfo && (
              <div className="bg-primary/10 border-4 border-primary rounded-[15px] p-6 mt-6 animate-in slide-in-from-top-2">
                <h2 className="text-lg font-black text-foreground mb-4">AI-Powered Proof Score (0-100)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2">Code Quality (Max 20 points)</h3>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>🤖 AI analyzes your GitHub repo</li>
                      <li>✓ Repository structure & organization</li>
                      <li>✓ README quality & documentation</li>
                      <li>✓ File organization & patterns</li>
                      <li>✓ Code quality indicators</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2">Team Verification (Max 20 points)</h3>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>🤖 AI analyzes your team's GitHub</li>
                      <li>✓ Past project experience</li>
                      <li>✓ Contribution history</li>
                      <li>✓ Profile strength & activity</li>
                      <li>✓ Technical credibility</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2">Community Score (Max 10 points)</h3>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>✓ Upvote ratio: up to 6 points</li>
                      <li>✓ Comment engagement: up to 4 points</li>
                      <li>💡 Encourage community feedback!</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2">On-Chain Score (Max 20 points)</h3>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>?o" Reserved for future on-chain verification signals</li>
                      <li>dY'? Currently defaults to 0 until the feature launches</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2">AI Validation (Max 30 points)</h3>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>🤖 GPT-4 analyzes your project</li>
                      <li>✓ Competitive positioning analysis</li>
                      <li>✓ Market fit & TAM evaluation</li>
                      <li>✓ Success criteria assessment</li>
                      <li>✓ Innovation & impact potential</li>
                    </ul>
                  </div>
                </div>
                <p className="mt-4 text-xs text-foreground font-bold bg-primary/20 p-3 rounded-lg border-2 border-primary">
                  <span className="inline-flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Tip: Connect your GitHub and provide a quality README for best AI analysis results. Scoring is automatic and takes ~30-60 seconds!</span>
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
            <div className="space-y-8">
              {/* Error Summary */}
              {showErrorSummary && formErrorsList.length > 0 && (
                <div id="errorSummary" className="card-elevated p-5 border-4 border-destructive bg-destructive/10">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <h3 className="text-lg font-black text-foreground">Please resolve these issues</h3>
                  </div>
                  <ul className="list-disc ml-6 space-y-1">
                    {formErrorsList.map((e, idx) => (
                      <li key={idx}>
                        <button
                          type="button"
                          className="underline text-destructive hover:opacity-80"
                          onClick={() => {
                            const el = document.getElementById(e.id);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                        >
                          {e.message}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="card-elevated p-8" id="basicsSection">
                {currentStep === 1 && (
                  <>
                    <h2 className="text-2xl font-black mb-6 text-foreground border-b-4 border-primary pb-3">
                      Basic Information
                    </h2>
                    <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-base font-bold">Destination Name *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Tokyo Winter Adventure, Southeast Asia Backpacking"
                      aria-invalid={!!errors.title}
                      className={`text-base ${errors.title ? 'border-destructive ring-2 ring-destructive/30' : ''}`}
                      {...register('title')}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="tagline" className="text-base font-bold">Tagline (Optional)</Label>
                    <Input
                      id="tagline"
                      placeholder="A brief one-liner description"
                      maxLength={300}
                      className="text-base"
                      {...register('tagline')}
                    />
                    {errors.tagline && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.tagline.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-base font-bold">
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your itinerary in detail (minimum 50 characters, 200+ recommended) - include places, activities, best time to visit, safety tips, etc."
                      rows={8}
                      aria-invalid={!!errors.description}
                      className={`text-base ${errors.description ? 'border-destructive ring-2 ring-destructive/30' : ''}`}
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.description.message}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Minimum 50 characters (200+ recommended for best scoring)</p>
                      <span className={`badge ${descLength >= 50 ? 'badge-success' : 'badge-warning'}`}>
                        {descLength} / 50 min
                      </span>
                    </div>
                  </div>
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <h2 className="text-2xl font-black mb-6 text-foreground border-b-4 border-primary pb-3">
                      Travel Style & Categories
                    </h2>
                  <div className="space-y-3" id="categoriesSection">
                    <Label className="text-base font-bold">
                      Travel Types * (Select all that apply)
                      <span className="ml-2 text-xs badge-info">Helps travelers discover your itinerary</span>
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border rounded-md">
                      {[
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
                      ].map((cat) => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded">
                          <input
                            type="checkbox"
                            checked={categories.includes(cat)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCategories([...categories, cat]);
                              } else {
                                setCategories(categories.filter(c => c !== cat));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{cat}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Selected: {categories.length > 0 ? categories.join(', ') : 'None'}
                      </p>
                      {showErrorSummary && categories.length === 0 && (
                        <span className="text-xs text-destructive font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chains Selector */}
                  <div className="space-y-3 mt-6">
                    <ChainSelector
                      selectedChainIds={selectedChainIds}
                      onSelectionChange={setSelectedChainIds}
                      maxSelections={5}
                      projectCategories={categories}
                    />
                  </div>
                  </>
                )}
                
              </div>

              {/* NEW: Project Story & Vision Section */}
              {currentStep === 3 && (
              <div className="card-elevated p-8 bg-gradient-to-br from-card to-primary/5" id="storySection">
                <h2 className="text-2xl font-black mb-2 text-foreground border-b-4 border-primary pb-3">
                  <span className="inline-flex items-center gap-2"><BookOpen className="h-6 w-6" /> Trip Journey & Experience</span>
                </h2>
                <p className="text-sm text-muted-foreground mb-6">Share the journey behind this itinerary - what inspired you and what made it special</p>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="projectStory" className="text-base font-bold flex items-center gap-2">
                      <span className="inline-flex items-center gap-2"><Rocket className="h-4 w-4" /> Trip Highlights</span>
                      <span className="text-xs badge-secondary">Optional</span>
                    </Label>
                    <Textarea
                      id="projectStory"
                      placeholder="Tell us about your trip experience... What were the highlights? What memorable moments did you have? What would you do differently next time?"
                      rows={5}
                      className="text-base resize-none"
                      value={projectStory}
                      onChange={(e) => setProjectStory(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Help other travelers understand what makes this itinerary special</p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="inspiration" className="text-base font-bold flex items-center gap-2">
                      <span className="inline-flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Travel Inspiration</span>
                      <span className="text-xs badge-secondary">Optional</span>
                    </Label>
                    <Textarea
                      id="inspiration"
                      placeholder="What inspired you to take this trip? Was it a lifelong dream, bucket list item, or spontaneous adventure? What drew you to these destinations?"
                      rows={4}
                      className="text-base resize-none"
                      value={inspiration}
                      onChange={(e) => setInspiration(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Share the 'why' behind your travel journey</p>
                  </div>
                </div>
              </div>
              )}

              {/* NEW: Market & Innovation Section */}
              {currentStep === 3 && (
              <div className="card-elevated p-8 bg-gradient-to-br from-card to-accent/5" id="marketSection">
                <h2 className="text-2xl font-black mb-2 text-foreground border-b-4 border-primary pb-3">
                  <span className="inline-flex items-center gap-2"><Target className="h-6 w-6" /> Travel Details & Insights</span>
                </h2>
                <p className="text-sm text-muted-foreground mb-6">Share what makes your itinerary unique and helpful for other travelers</p>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="marketComparison" className="text-base font-bold flex items-center gap-2">
                      <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Unique Highlights</span>
                      <span className="text-xs badge-secondary">Optional</span>
                    </Label>
                    <Textarea
                      id="marketComparison"
                      placeholder="What makes this itinerary different? Are there hidden gems or less-known places? Any special experiences or unique angles other travelers might miss?"
                      rows={5}
                      className="text-base resize-none"
                      value={marketComparison}
                      onChange={(e) => setMarketComparison(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Help other travelers discover what's truly special about this journey</p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="noveltyFactor" className="text-base font-bold flex items-center gap-2">
                      <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" /> Safety & Travel Tips</span>
                      <span className="text-xs badge-secondary">Optional</span>
                    </Label>
                    <Textarea
                      id="noveltyFactor"
                      placeholder="Include important travel safety tips, local customs to respect, best times to visit, things to avoid, or any warnings other travelers should know about."
                      rows={4}
                      className="text-base resize-none"
                      value={noveltyFactor}
                      onChange={(e) => setNoveltyFactor(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Help travelers prepare better and stay safe on similar journeys</p>
                  </div>
                </div>
              </div>
              )}

              {/* NEW: Pitch Deck Section */}
              {currentStep === 4 && (
              <div className="card-elevated p-8 bg-gradient-to-br from-card to-secondary/10" id="pitchDeckSection">
                <h2 className="text-2xl font-black mb-2 text-foreground border-b-4 border-primary pb-3">
                  <span className="inline-flex items-center gap-2"><FileText className="h-6 w-6" /> Pitch Deck</span>
                </h2>
                <p className="text-sm text-muted-foreground mb-6">Upload your pitch deck to give investors and collaborators a complete view</p>

                <div className="space-y-4">
                  {!pitchDeckUrl ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-secondary/20 hover:bg-secondary/30 transition-smooth">
                      <input
                        type="file"
                        id="pitchDeck"
                        accept=".pdf"
                        onChange={handlePitchDeckUpload}
                        className="hidden"
                        disabled={uploadingPitchDeck}
                      />
                      <label
                        htmlFor="pitchDeck"
                        className="cursor-pointer flex flex-col items-center gap-3"
                      >
                        {uploadingPitchDeck ? (
                          <>
                            <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            <p className="text-sm font-bold text-foreground">Uploading to IPFS...</p>
                          </>
                        ) : (
                          <>
                            <div className="p-4 bg-primary/20 rounded-full">
                              <FileText className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                              <p className="text-base font-bold text-foreground mb-1">Upload Pitch Deck (PDF)</p>
                              <p className="text-xs text-muted-foreground">Max 25MB • Stored on IPFS</p>
                            </div>
                          </>
                        )}
                      </label>
                    </div>
                  ) : (
                    <div className="border-2 border-primary rounded-lg p-6 bg-primary/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary rounded-lg">
                            <FileText className="h-6 w-6 text-black" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{pitchDeckFile?.name || 'Pitch Deck'}</p>
                            <p className="text-xs text-muted-foreground">
                              {pitchDeckFile ? `${(pitchDeckFile.size / 1024 / 1024).toFixed(2)} MB` : 'Uploaded'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePitchDeck}
                          className="p-2 hover:bg-destructive/20 rounded-lg transition-smooth"
                          title="Remove pitch deck"
                        >
                          <X className="h-5 w-5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" /> A good pitch deck can significantly increase investor interest and collaboration opportunities
                  </p>
                </div>
              </div>
              )}

              {currentStep === 3 && (
              <div className="card-elevated p-8">
                <h2 className="text-2xl font-black mb-6 text-foreground border-b-4 border-primary pb-3">
                  Travel Companions (Optional)
                </h2>
                <div className="space-y-6">
                  {/* Display existing hackathons */}
                  {hackathons.length > 0 && (
                    <div className="space-y-3">
                      <Label>Added Hackathons</Label>
                      {hackathons.map((hackathon, index) => (
                        <div key={index} className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg border border-border">
                          <div className="flex-1">
                            <p className="font-bold text-foreground">{hackathon.name}</p>
                            {hackathon.date && (
                              <p className="text-sm text-muted-foreground">
                                {new Date(hackathon.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            )}
                            {hackathon.prize && (
                              <p className="text-sm text-primary font-semibold">{hackathon.prize}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveHackathon(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new hackathon */}
                  <div className="space-y-4 p-4 bg-secondary/10 rounded-lg border border-border">
                    <div className="space-y-2">
                      <Label htmlFor="destinationName">Destination Name *</Label>
                      <Input
                        id="destinationName"
                        placeholder="e.g., ETH Global London"
                        value={destinationName}
                        onChange={(e) => setdestinationName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hackathonDate">Date</Label>
                      <Input
                        id="hackathonDate"
                        type="date"
                        value={hackathonDate}
                        onChange={(e) => setHackathonDate(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                        className="[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-100 [&::-webkit-calendar-picker-indicator]:opacity-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hackathonPrize">Prize/Award (Optional)</Label>
                      <Input
                        id="hackathonPrize"
                        placeholder="e.g., 1st Place - $10,000"
                        value={hackathonPrize}
                        onChange={(e) => setHackathonPrize(e.target.value)}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddHackathon}
                      disabled={!destinationName.trim()}
                      className="w-full"
                    >
                      + Add Hackathon
                    </Button>
                  </div>
                </div>
              </div>
              )}

              {currentStep === 1 && (
              <div className="card-elevated p-8" id="linksSection">
                <h2 className="text-2xl font-black mb-6 text-foreground border-b-4 border-primary pb-3">
                  Links & Resources
                </h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="demoUrl">
                      Demo URL
                    </Label>
                    <Input
                      id="demoUrl"
                      type="url"
                      placeholder="https://demo.example.com"
                      aria-invalid={!!errors.demoUrl}
                      className={`${errors.demoUrl ? 'border-destructive ring-2 ring-destructive/30' : ''}`}
                      {...register('demoUrl')}
                    />
                    {errors.demoUrl && (
                      <p className="text-sm text-destructive">{errors.demoUrl.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">A working demo helps showcase your project's functionality</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="githubUrl">
                      GitHub URL <span className="text-xs text-muted-foreground">(Required for AI analysis)</span>
                    </Label>
                    <Input
                      id="githubUrl"
                      type="url"
                      placeholder="https://github.com/username/repo"
                      aria-invalid={!!errors.githubUrl}
                      disabled={!user?.github_connected}
                      className={`${errors.githubUrl ? 'border-destructive ring-2 ring-destructive/30' : ''}`}
                      {...register('githubUrl', {
                        onChange: (e) => validateGithubUrl(e.target.value),
                        onBlur: (e) => validateGithubUrl(e.target.value)
                      })}
                    />
                    {!user?.github_connected && (
                      <p className="text-xs text-muted-foreground">
                        Connect GitHub to enable this field so we can analyze your repository.
                      </p>
                    )}
                    {errors.githubUrl && (
                      <p className="text-sm text-destructive">{errors.githubUrl.message}</p>
                    )}
                    {githubUrlWarning && (
                      <div className={`flex items-start gap-2 p-2 rounded-md transition-all duration-200 ${
                        githubUrlWarning.startsWith('✓')
                          ? 'bg-primary border border-primary/80 hover:bg-primary/90 hover:border-primary'
                          : 'bg-primary border border-primary/80 hover:bg-primary/90'
                      }`}>
                        {githubUrlWarning.startsWith('✓') ? (
                          <Check className="h-4 w-4 text-black mt-0.5 flex-shrink-0 font-bold stroke-2" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-black mt-0.5 flex-shrink-0 font-bold stroke-2" />
                        )}
                        <p className={`text-xs font-semibold text-black`}>{githubUrlWarning}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">GitHub repo required for AI to analyze code quality and team credentials.</p>
                  </div>
                </div>
              </div>
              )}

              {currentStep === 2 && (
              <div className="card-elevated p-8" id="techStackSection">
                <h2 className="text-2xl font-black mb-6 text-foreground border-b-4 border-primary pb-3">
                  Travel Activities & Interests *
                </h2>
                <div className="space-y-5">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Add activity (e.g., Hiking, Cultural Sites, Beach, Food Tour, Adventure Sports)"
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTech())}
                      className="text-base"
                    />
                    <button type="button" onClick={handleAddTech} className="btn-secondary px-6 py-2 font-bold">
                      Add
                    </button>
                  </div>

                  {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {techStack.map((tech) => (
                        <span key={tech} className="badge-primary gap-2 flex items-center text-sm px-4 py-2">
                          {tech}
                          <button
                            type="button"
                            onClick={() => handleRemoveTech(tech)}
                            className="rounded-full hover:opacity-80 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {techStack.length === 0 && showErrorSummary && (
                    <p className="text-sm font-bold text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Add at least one technology
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Team Members Section */}
              {currentStep === 3 && (
              <div className="card-elevated p-8" id="teamSection">
                <h2 className="text-2xl font-black mb-6 text-foreground border-b-4 border-primary pb-3 flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Travel Companions
                </h2>
                <div className="space-y-5">
                  {/* Toggle between registered and unregistered */}
                  <div className="flex gap-2 p-1 bg-secondary/30 rounded-lg border-2 border-border">
                    <button
                      type="button"
                      onClick={() => setShowUnregisteredForm(false)}
                      className={`flex-1 px-4 py-2 rounded-md font-bold transition-all ${
                        !showUnregisteredForm
                          ? 'bg-primary text-white shadow-brutal'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Travelers on Platform
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUnregisteredForm(true)}
                      className={`flex-1 px-4 py-2 rounded-md font-bold transition-all ${
                        showUnregisteredForm
                          ? 'bg-primary text-white shadow-brutal'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Other Companions
                    </button>
                  </div>

                  {/* Registered User Search */}
                  {!showUnregisteredForm && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Search and select travelers already on our platform. Their profiles will be linked and discoverable.
                      </p>

                      {!selectedUser && (
                        <div className="space-y-2">
                          <Label className="font-bold">Search for Travel Companion</Label>
                          <UserSearchSelect
                            onSelect={(user) => setSelectedUser(user)}
                            placeholder="Search users by name, username, or email..."
                          />
                        </div>
                      )}

                      {/* Show selected user */}
                      {selectedUser && (
                        <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-10 w-10 border-2 border-black">
                              <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.username} />
                              <AvatarFallback className="bg-primary text-white font-bold">
                                {selectedUser.display_name?.[0] || selectedUser.username?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-bold text-foreground">{selectedUser.display_name || selectedUser.username}</p>
                              <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="font-bold">Role</Label>
                            <Input
                              placeholder="e.g., Frontend Dev, Designer, PM"
                              value={memberRole}
                              onChange={(e) => setMemberRole(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTeamMember())}
                              className="text-base"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleAddTeamMember}
                            className="btn-primary px-6 py-2 font-bold mt-3 w-full"
                          >
                            Add Team Member
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unregistered User Form */}
                  {showUnregisteredForm && (
                    <div className="space-y-4">
                      {/* Warning message */}
                      <div className="p-4 bg-orange-500/10 border-2 border-orange-500 rounded-lg">
                        <div className="flex gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                          <div className="space-y-2">
                            <p className="font-bold text-foreground">Caution: Lower Visibility</p>
                            <p className="text-sm text-muted-foreground">
                              Unregistered team members won't have linked profiles and will have limited discoverability.
                              We <span className="font-bold text-foreground">strongly recommend</span> asking them to create an account first,
                              then adding them as registered users for better visibility and credibility.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-bold">Name</Label>
                          <Input
                            placeholder="Team member name"
                            value={unregisteredName}
                            onChange={(e) => setUnregisteredName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUnregisteredMember())}
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold">Role</Label>
                          <Input
                            placeholder="e.g., Frontend Dev, Designer"
                            value={unregisteredRole}
                            onChange={(e) => setUnregisteredRole(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUnregisteredMember())}
                            className="text-base"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddUnregisteredMember}
                        className="btn-secondary px-6 py-2 font-bold w-full"
                        disabled={!unregisteredName.trim()}
                      >
                        Add Unregistered Member
                      </button>
                    </div>
                  )}

                  {/* List of added team members */}
                  {teamMembers.length > 0 && (
                    <div className="space-y-3">
                      <Label className="font-bold">Team Members ({teamMembers.length})</Label>
                      {teamMembers.map((member, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-smooth ${
                            member.user_id
                              ? 'bg-green-500/5 border-green-500/30 hover:border-green-500/50'
                              : 'bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-10 w-10 border-2 border-black flex-shrink-0">
                              <AvatarImage src={member.avatar_url} alt={member.name} />
                              <AvatarFallback className="bg-primary text-white font-bold">
                                {member.name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-foreground text-base">{member.name}</p>
                                {member.user_id ? (
                                  <Badge className="bg-green-500/20 text-green-700 border-green-500 text-xs">
                                    Registered
                                  </Badge>
                                ) : (
                                  <Badge className="bg-orange-500/20 text-orange-700 border-orange-500 text-xs">
                                    Unregistered
                                  </Badge>
                                )}
                              </div>
                              {member.username && (
                                <p className="text-xs text-muted-foreground">@{member.username}</p>
                              )}
                              <p className="text-sm text-muted-foreground">{member.role}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTeamMember(index)}
                            className="p-2 hover:bg-destructive/20 rounded-full transition-smooth flex-shrink-0"
                          >
                            <X className="h-5 w-5 text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              )}

              {currentStep === 4 && (
              <div className="card-elevated p-8" id="screenshotsSection">
                <h2 className="text-2xl font-black mb-6 text-foreground border-b-4 border-primary pb-3">
                  Screenshots <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </h2>
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Upload screenshots to showcase your project's UI and features. Images are stored on IPFS via Pinata.
                  </p>

                  {/* File Upload Button */}
                  <div>
                    <label
                      htmlFor="screenshot-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 ${
                        uploadingScreenshot || screenshotUrls.length >= 5
                          ? 'btn-secondary opacity-50 cursor-not-allowed'
                          : 'btn-primary cursor-pointer'
                      }`}
                    >
                      {uploadingScreenshot ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : screenshotUrls.length >= 5 ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Limit Reached (5/5)
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload Screenshots ({screenshotUrls.length}/5)
                        </>
                      )}
                    </label>
                    <input
                      id="screenshot-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      multiple
                      onChange={handleScreenshotUpload}
                      disabled={uploadingScreenshot || screenshotUrls.length >= 5}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Supported: PNG, JPG, GIF, WebP • Max size: 10MB • Max 5 screenshots total. You can select multiple files at once.
                    </p>
                  </div>

                  {/* Uploaded Screenshots */}
                  {screenshotUrls.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {screenshotUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-56 object-cover rounded-lg border-4 border-border group-hover:border-primary/50 transition-smooth"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveScreenshot(index)}
                            className="absolute top-3 right-3 bg-destructive text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-smooth hover:scale-110"
                          >
                            <X className="h-5 w-5" />
                          </button>
                          <span className="absolute bottom-3 left-3 bg-black/80 text-white text-sm font-bold px-3 py-1.5 rounded-md">
                            Screenshot {index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {screenshotUrls.length === 0 && (
                    <div className="flex flex-col h-32 items-center justify-center rounded-lg border-4 border-black border-dashed bg-secondary/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm font-bold text-muted-foreground">No screenshots uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>
              )}

              {currentStep === 4 && (
              <div className="card-elevated p-8 mt-8">
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1 py-4 text-lg font-black"
                    disabled={isSubmitting || createProjectMutation.isPending}
                  >
                    {isSubmitting || createProjectMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Publishing...
                      </span>
                    ) : (
                      'Publish Project'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary flex-1 py-4 text-lg font-bold"
                    onClick={() => navigate(-1)}
                    disabled={isSubmitting || createProjectMutation.isPending}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              )}
            </div>
          </form>
          {/* Bottom navigation for steps 1-3 */}
          {currentStep < totalSteps && (
            <div className="card-elevated p-8 mt-8">
              <div className="flex gap-4 items-center">
                <button
                  type="button"
                  className="btn-secondary flex-1 inline-flex items-center justify-center gap-2 py-4 text-lg font-bold rounded-[15px]"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1 inline-flex items-center justify-center gap-2 py-4 text-lg font-black rounded-[15px]"
                  onClick={handleNext}
                >
                  <span>Next</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


