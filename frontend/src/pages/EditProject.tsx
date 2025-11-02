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
import { X, Loader2, ArrowLeft, Save } from 'lucide-react';
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
  const [projectStory, setProjectStory] = useState('');
  const [inspiration, setInspiration] = useState('');
  const [marketComparison, setMarketComparison] = useState('');
  const [noveltyFactor, setNoveltyFactor] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [pitchDeckUrl, setPitchDeckUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Hackathons state
  const [hackathons, setHackathons] = useState<{ name: string; date: string; prize?: string }[]>([]);
  const [hackathonName, setHackathonName] = useState('');
  const [hackathonDate, setHackathonDate] = useState('');
  const [hackathonPrize, setHackathonPrize] = useState('');

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
        toast.error('You can only edit your own projects');
        navigate(`/project/${id}`);
        return;
      }

      // Set form values
      setValue('title', project.title);
      setValue('tagline', project.tagline || '');
      setValue('description', project.description);
      setValue('demoUrl', project.demo_url || project.demoUrl || '');
      setValue('githubUrl', project.github_url || project.githubUrl || '');
      setValue('hackathonName', project.hackathon_name || project.hackathonName || '');
      setValue('hackathonDate', project.hackathon_date || project.hackathonDate || '');

      // Set state values
      setTechStack(project.tech_stack || project.techStack || []);
      setTeamMembers(project.team_members || project.teamMembers || []);
      setProjectStory(project.project_story || '');
      setInspiration(project.inspiration || '');
      setMarketComparison(project.market_comparison || '');
      setNoveltyFactor(project.novelty_factor || '');
      setCategories(project.categories || []);
      setPitchDeckUrl(project.pitch_deck_url || '');
      setHackathons(project.hackathons || []);
    }
  }, [projectData, user, id, navigate, setValue]);

  const handleAddTech = () => {
    if (techInput.trim() && !techStack.includes(techInput.trim())) {
      setTechStack([...techStack, techInput.trim()]);
      setTechInput('');
    }
  };

  const handleRemoveTech = (tech: string) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  const handleAddTeamMember = () => {
    if (memberName.trim()) {
      setTeamMembers([...teamMembers, { name: memberName.trim(), role: memberRole.trim() || 'Team Member' }]);
      setMemberName('');
      setMemberRole('');
    }
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const handleAddHackathon = () => {
    if (hackathonName.trim()) {
      setHackathons([...hackathons, {
        name: hackathonName.trim(),
        date: hackathonDate || '',
        prize: hackathonPrize.trim() || undefined
      }]);
      setHackathonName('');
      setHackathonDate('');
      setHackathonPrize('');
    }
  };

  const handleRemoveHackathon = (index: number) => {
    setHackathons(hackathons.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PublishProjectInput) => {
    if (!id) return;

    try {
      setIsSaving(true);

      const payload: any = {
        title: data.title,
        tagline: data.tagline,
        description: data.description,
        demo_url: data.demoUrl,
        github_url: data.githubUrl,
        hackathons: hackathons,
        tech_stack: techStack,
        team_members: teamMembers,
        project_story: projectStory,
        inspiration: inspiration,
        pitch_deck_url: pitchDeckUrl,
        market_comparison: marketComparison,
        novelty_factor: noveltyFactor,
        categories: categories,
      };

      await api.patch(`/projects/${id}`, payload);
      toast.success('Project updated successfully!');
      navigate(`/project/${id}`);
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update project');
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
            Back to Project
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-black">Edit Project</CardTitle>
              <CardDescription>Update your project information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Project Title *</Label>
                    <Input id="title" {...register('title')} className="mt-1" />
                    {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input id="tagline" {...register('tagline')} className="mt-1" placeholder="One-line description" />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea id="description" {...register('description')} className="mt-1 min-h-[120px]" />
                    {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <Label className="text-base font-bold">Project Categories (Select all that apply)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 p-4 border rounded-md">
                    {['AI/ML', 'Web3/Blockchain', 'FinTech', 'HealthTech', 'EdTech', 'E-Commerce', 'SaaS', 'DevTools', 'IoT', 'Gaming', 'Social', 'Other'].map((cat) => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer">
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
                        />
                        <span className="text-sm">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Extended Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="projectStory">Project Journey</Label>
                    <Textarea
                      id="projectStory"
                      value={projectStory}
                      onChange={(e) => setProjectStory(e.target.value)}
                      className="mt-1 min-h-[120px]"
                      placeholder="Tell the story of how your project came to be..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="inspiration">The Spark (Inspiration)</Label>
                    <Textarea
                      id="inspiration"
                      value={inspiration}
                      onChange={(e) => setInspiration(e.target.value)}
                      className="mt-1 min-h-[100px]"
                      placeholder="What inspired you to build this?"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pitchDeckUrl">Pitch Deck URL</Label>
                    <Input
                      id="pitchDeckUrl"
                      value={pitchDeckUrl}
                      onChange={(e) => setPitchDeckUrl(e.target.value)}
                      className="mt-1"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="marketComparison">Market Landscape</Label>
                    <Textarea
                      id="marketComparison"
                      value={marketComparison}
                      onChange={(e) => setMarketComparison(e.target.value)}
                      className="mt-1 min-h-[120px]"
                      placeholder="How does your project compare to existing solutions?"
                    />
                  </div>

                  <div>
                    <Label htmlFor="noveltyFactor">What Makes It Unique</Label>
                    <Textarea
                      id="noveltyFactor"
                      value={noveltyFactor}
                      onChange={(e) => setNoveltyFactor(e.target.value)}
                      className="mt-1 min-h-[120px]"
                      placeholder="What makes your project stand out?"
                    />
                  </div>
                </div>

                {/* URLs */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="demoUrl">Demo URL</Label>
                    <Input id="demoUrl" {...register('demoUrl')} className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="githubUrl">GitHub URL</Label>
                    <Input id="githubUrl" {...register('githubUrl')} className="mt-1" />
                  </div>
                </div>

                {/* Hackathons */}
                <div className="space-y-4">
                  <Label>Hackathons</Label>

                  {/* Display existing hackathons */}
                  {hackathons.length > 0 && (
                    <div className="space-y-2">
                      {hackathons.map((hackathon, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg border border-border">
                          <div className="flex-1">
                            <p className="font-bold text-foreground text-sm">{hackathon.name}</p>
                            {hackathon.date && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(hackathon.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            )}
                            {hackathon.prize && (
                              <p className="text-xs text-primary font-semibold">{hackathon.prize}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveHackathon(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new hackathon */}
                  <div className="space-y-3 p-3 bg-secondary/10 rounded-lg border border-border">
                    <div>
                      <Label htmlFor="newHackathonName" className="text-sm">Add Hackathon</Label>
                      <Input
                        id="newHackathonName"
                        placeholder="Hackathon name"
                        value={hackathonName}
                        onChange={(e) => setHackathonName(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="newHackathonDate" className="text-sm">Date</Label>
                      <Input
                        id="newHackathonDate"
                        type="date"
                        value={hackathonDate}
                        onChange={(e) => setHackathonDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="newHackathonPrize" className="text-sm">Prize (Optional)</Label>
                      <Input
                        id="newHackathonPrize"
                        placeholder="e.g., 1st Place - $10,000"
                        value={hackathonPrize}
                        onChange={(e) => setHackathonPrize(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddHackathon}
                      disabled={!hackathonName.trim()}
                      size="sm"
                      className="w-full"
                    >
                      + Add Hackathon
                    </Button>
                  </div>
                </div>

                {/* Tech Stack */}
                <div>
                  <Label>Tech Stack</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTech())}
                      placeholder="e.g., React, Python..."
                    />
                    <Button type="button" onClick={handleAddTech}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {techStack.map((tech) => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                        <X className="ml-2 h-3 w-3 cursor-pointer" onClick={() => handleRemoveTech(tech)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <Label>Team Members</Label>
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
                  <Button type="button" onClick={handleAddTeamMember} className="mt-2">Add Team Member</Button>
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
