import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { publishProjectSchema, PublishProjectInput } from '@/lib/schemas';
import { useProjectById } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function EditProject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: projectData, isLoading } = useProjectById(id || '');

  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ name: string; role: string }[]>([]);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [safetyTips, setSafetyTips] = useState('');
  const [tripHighlights, setTripHighlights] = useState('');
  const [tripJourney, setTripJourney] = useState('');
  const [dayByDayPlan, setDayByDayPlan] = useState('');
  const [hiddenGems, setHiddenGems] = useState('');
  const [uniqueHighlights, setUniqueHighlights] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PublishProjectInput>({
    resolver: zodResolver(publishProjectSchema),
  });

  // Load project data when available
  useEffect(() => {
    if (projectData?.data) {
      const project = projectData.data;

      // Check if user is the author
      if (user?.id !== project.user_id && user?.id !== project.authorId) {
        toast.error('You can only edit your own itineraries');
        navigate(`/project/${id}`);
        return;
      }

      // Set form values
      setValue('title', project.title);
      setValue('tagline', project.tagline || '');
      setValue('description', project.description);
      setValue('destination', project.destination || '');
      setValue('duration_days', project.duration_days || undefined);
      setValue('estimated_budget', project.budget_amount || undefined);
      setValue('demoUrl', project.demo_url || project.demoUrl || '');
      setValue('githubUrl', project.route_map_url || project.github_url || project.githubUrl || '');
      setValue('hackathonName', project.day_by_day_plan || '');

      // Set state values
      setTechStack(project.activity_tags || project.tech_stack || project.techStack || []);
      setTeamMembers(project.travel_companions || project.team_members || project.teamMembers || []);
      setTripHighlights(project.trip_highlights || project.project_story || '');
      setTripJourney(project.trip_journey || project.inspiration || '');
      setHiddenGems(project.hidden_gems || project.market_comparison || '');
      setUniqueHighlights(project.unique_highlights || project.novelty_factor || '');
      setSafetyTips(project.safety_tips || '');
      setDayByDayPlan(project.day_by_day_plan || '');
      setCategories(project.categories || []);
    }
  }, [projectData, user, id, navigate, setValue]);

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
    if (memberName.trim()) {
      setTeamMembers([...teamMembers, { name: memberName.trim(), role: memberRole.trim() || 'Travel Companion' }]);
      setMemberName('');
      setMemberRole('');
    }
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PublishProjectInput) => {
    if (!id) return;

    try {
      setIsSaving(true);

      // Map frontend fields to backend ItineraryUpdateSchema
      const payload: any = {
        title: data.title,
        tagline: data.tagline || '',
        description: data.description,
        destination: data.destination,
        activity_tags: techStack,  // Safety & Gear Tags
        travel_style: data.travel_type || '',
      };

      // Extended trip details
      if (tripHighlights && tripHighlights.trim()) {
        payload.trip_highlights = tripHighlights;
      }
      if (tripJourney && tripJourney.trim()) {
        payload.trip_journey = tripJourney;
      }
      if (data.hackathonName && data.hackathonName.trim()) {
        payload.day_by_day_plan = data.hackathonName;
      }
      if (hiddenGems && hiddenGems.trim()) {
        payload.hidden_gems = hiddenGems;
      }
      if (uniqueHighlights && uniqueHighlights.trim()) {
        payload.unique_highlights = uniqueHighlights;
      }
      if (safetyTips && safetyTips.trim()) {
        payload.safety_tips = safetyTips;
      }

      // Optional fields
      if (data.githubUrl && data.githubUrl.trim()) {
        payload.route_map_url = data.githubUrl;
      }
      if (data.demoUrl && data.demoUrl.trim()) {
        payload.demo_url = data.demoUrl;
      }
      if (data.duration_days) {
        payload.duration_days = data.duration_days;
      }
      if (data.estimated_budget) {
        payload.budget_amount = data.estimated_budget;
        payload.budget_currency = 'INR';
      }
      if (teamMembers.length > 0) {
        payload.travel_companions = teamMembers;
      }

      // Always send categories (even if empty) to ensure proper updates
      payload.categories = categories;

      console.log('[EditProject] Submitting payload:', payload);
      console.log('[EditProject] Categories being sent:', categories);

      await api.patch(`/itineraries/${id}`, payload);
      toast.success('Itinerary updated successfully!');
      navigate(`/project/${id}`);
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update itinerary');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate(`/project/${id}`)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Itinerary
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-black">Edit Itinerary</CardTitle>
              <CardDescription>Update your travel itinerary information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Itinerary Title *</Label>
                    <Input
                      id="title"
                      {...register('title')}
                      className="mt-1"
                      placeholder="E.g., Spiti Valley Winter Expedition, Himalayan Trek Adventure"
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="tagline">Teaser / Hook (Optional)</Label>
                    <Input
                      id="tagline"
                      {...register('tagline')}
                      className="mt-1"
                      placeholder="Short 1-liner summary of your trip"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Trip Overview *</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      className="mt-1 min-h-[120px]"
                      placeholder="Describe the vibe, experience, and what makes this trip special..."
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="destination">Primary Destination *</Label>
                    <Input
                      id="destination"
                      {...register('destination')}
                      className="mt-1"
                      placeholder="E.g., Himalayas, Spiti Valley, Ladakh, Kerala Backwaters"
                    />
                    {errors.destination && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.destination.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duration_days">Duration (Days)</Label>
                      <Input
                        id="duration_days"
                        type="number"
                        min="1"
                        max="365"
                        placeholder="E.g., 7"
                        className="mt-1"
                        {...register('duration_days', { valueAsNumber: true })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="estimated_budget">Approx. Budget Per Person (₹)</Label>
                      <Input
                        id="estimated_budget"
                        type="number"
                        min="0"
                        placeholder="E.g., 20000"
                        className="mt-1"
                        {...register('estimated_budget', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <Label className="text-base font-bold">Travel Types * (Select all that apply)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 p-4 border rounded-md">
                    {[
                      'Solo Travel',
                      'Women-Only',
                      'Family',
                      'Road Trip',
                      'Trekking',
                      'Cultural',
                      'Spiritual',
                      'Food & Culinary',
                      'Adventure',
                      'Wildlife',
                      'Photography',
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
                </div>

                {/* Links & Resources */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="demoUrl">Booking / Reference Link</Label>
                    <Input
                      id="demoUrl"
                      {...register('demoUrl')}
                      className="mt-1"
                      placeholder="https://yourblog.com/trip-guide or booking page link"
                    />
                  </div>

                  <div>
                    <Label htmlFor="githubUrl">Map Link (GPX / KML / Google Maps)</Label>
                    <Input
                      id="githubUrl"
                      {...register('githubUrl')}
                      className="mt-1"
                      placeholder="https://maps.google.com/... or GPX/KML file link"
                    />
                  </div>
                </div>

                {/* Safety & Gear Tags */}
                <div>
                  <Label className="text-base font-bold">Safety & Gear Tags *</Label>
                  <p className="text-sm text-muted-foreground mb-2">Add tags for safety information, required gear, and logistics</p>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTech())}
                      placeholder="Type and press enter (e.g., 'First Aid Required', '4G Network', 'Permit Needed')"
                    />
                    <Button type="button" onClick={handleAddTech}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {techStack.map((tech) => (
                      <Badge key={tech} variant="secondary" className="px-3 py-1">
                        {tech}
                        <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => handleRemoveTech(tech)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Travel Companions */}
                <div>
                  <Label className="text-base font-bold">Travel Companions</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="Name"
                    />
                    <Input
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      placeholder="Role"
                    />
                  </div>
                  <Button type="button" onClick={handleAddTeamMember} className="mt-2">Add Companion</Button>
                  <div className="space-y-2 mt-3">
                    {teamMembers.map((member, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTeamMember(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extended Trip Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tripHighlights">Trip Highlights</Label>
                    <Textarea
                      id="tripHighlights"
                      value={tripHighlights}
                      onChange={(e) => setTripHighlights(e.target.value)}
                      className="mt-1 min-h-[100px]"
                      placeholder="What were the highlights? What memorable moments did you have?"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hackathonName">Day-by-Day Itinerary</Label>
                    <Textarea
                      id="hackathonName"
                      {...register('hackathonName')}
                      className="mt-1 min-h-[150px]"
                      placeholder="Day 1: Arrival in Manali...&#10;Day 2: Trek to Chandratal Lake..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="safetyTips">Safety Intelligence & Travel Tips</Label>
                    <Textarea
                      id="safetyTips"
                      value={safetyTips}
                      onChange={(e) => setSafetyTips(e.target.value)}
                      className="mt-1 min-h-[120px]"
                      placeholder="Share comprehensive safety information: risks, medical facilities, permits, weather, packing essentials..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="tripJourney">Trip Journey & Experience</Label>
                    <Textarea
                      id="tripJourney"
                      value={tripJourney}
                      onChange={(e) => setTripJourney(e.target.value)}
                      className="mt-1 min-h-[100px]"
                      placeholder="Mention verified homestays, local guides, authentic restaurants, unique spots..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="hiddenGems">Hidden Gems & Local Businesses</Label>
                    <Textarea
                      id="hiddenGems"
                      value={hiddenGems}
                      onChange={(e) => setHiddenGems(e.target.value)}
                      className="mt-1 min-h-[100px]"
                      placeholder="What makes this itinerary different? Hidden gems or less-known places?"
                    />
                  </div>

                  <div>
                    <Label htmlFor="uniqueHighlights">Unique Highlights</Label>
                    <Textarea
                      id="uniqueHighlights"
                      value={uniqueHighlights}
                      onChange={(e) => setUniqueHighlights(e.target.value)}
                      className="mt-1 min-h-[100px]"
                      placeholder="What makes this itinerary truly unique? Special experiences or cultural moments?"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/project/${id}`)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
