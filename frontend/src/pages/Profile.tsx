import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api, { usersService, uploadService } from '@/services/api';
import { Loader2, Upload, X, Award, MapPin, Briefcase, TrendingUp, Globe, Link as LinkIcon } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    display_name: user?.displayName || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar || '',
  });

  // Fetch investor profile if user is an investor
  const { data: investorProfile, isLoading: investorLoading } = useQuery({
    queryKey: ['investorProfile', user?.id],
    queryFn: async () => {
      const response = await api.getMyInvestorProfile();
      return response.data.data;
    },
    enabled: !!user?.isInvestor,
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => usersService.update(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      await refreshUser();
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
      toast.error(errorMessage);
    },
  });

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }

      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(user?.avatar || '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      let avatarUrl = formData.avatar_url;

      // Upload avatar to IPFS if a new file is selected
      if (avatarFile) {
        setUploadingAvatar(true);
        try {
          const uploadResponse = await uploadService.upload(avatarFile);
          avatarUrl = uploadResponse.data.data.url;
          toast.success('Avatar uploaded to IPFS!');
        } catch (uploadError: any) {
          console.error('Avatar upload error:', uploadError);
          toast.error(uploadError.response?.data?.message || 'Failed to upload avatar');
          setUploadingAvatar(false);
          return;
        }
        setUploadingAvatar(false);
      }

      // Update profile with new data
      const updateData = {
        display_name: formData.display_name,
        bio: formData.bio,
        avatar_url: avatarUrl,
      };

      updateProfileMutation.mutate(updateData);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save profile');
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 card-elevated p-8">
            <h1 className="text-4xl font-black text-foreground mb-2">Edit Profile</h1>
            <p className="text-base text-muted-foreground">
              Update your profile information and customize your public profile
            </p>
          </div>

          {/* Investor Profile Section */}
          {user?.isInvestor && investorProfile && investorProfile.status === 'approved' && (
            <div className="mb-8 card-elevated p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-black text-foreground">Investor Profile</h2>
                    <Badge className="bg-primary text-black">
                      <Award className="h-3 w-3 mr-1" />
                      Verified Investor
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your public investor profile information
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {investorProfile.name && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Name</div>
                      <div className="text-sm font-medium">{investorProfile.name}</div>
                    </div>
                  )}
                  {investorProfile.investor_type && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Investor Type</div>
                      <div className="text-sm font-medium capitalize">{investorProfile.investor_type}</div>
                    </div>
                  )}
                  {investorProfile.location && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                        <MapPin className="h-3 w-3" />
                        Location
                      </div>
                      <div className="text-sm font-medium">{investorProfile.location}</div>
                    </div>
                  )}
                  {investorProfile.company_name && (
                    <div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                        <Briefcase className="h-3 w-3" />
                        Company
                      </div>
                      <div className="text-sm font-medium">{investorProfile.company_name}</div>
                    </div>
                  )}
                </div>

                {/* Investment Focus */}
                {(investorProfile.investment_stages?.length > 0 || investorProfile.industries?.length > 0) && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                      <TrendingUp className="h-3 w-3" />
                      Investment Focus
                    </div>
                    <div className="space-y-2">
                      {investorProfile.investment_stages?.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Stages</div>
                          <div className="flex flex-wrap gap-1">
                            {investorProfile.investment_stages.map((stage: string) => (
                              <Badge key={stage} variant="secondary" className="text-xs">
                                {stage}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {investorProfile.industries?.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Industries</div>
                          <div className="flex flex-wrap gap-1">
                            {investorProfile.industries.map((industry: string) => (
                              <Badge key={industry} variant="secondary" className="text-xs">
                                {industry}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {investorProfile.geographic_focus?.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Geographic Focus</div>
                          <div className="flex flex-wrap gap-1">
                            {investorProfile.geographic_focus.map((region: string) => (
                              <Badge key={region} variant="secondary" className="text-xs">
                                {region}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {investorProfile.bio && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Bio</div>
                    <p className="text-sm text-foreground/90">{investorProfile.bio}</p>
                  </div>
                )}

                {/* Investment Thesis */}
                {investorProfile.investment_thesis && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Investment Thesis</div>
                    <p className="text-sm text-foreground/90">{investorProfile.investment_thesis}</p>
                  </div>
                )}

                {/* Links */}
                {(investorProfile.linkedin_url || investorProfile.website_url || investorProfile.twitter_url) && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                      <LinkIcon className="h-3 w-3" />
                      Links
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {investorProfile.linkedin_url && (
                        <a
                          href={investorProfile.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          LinkedIn
                          <Globe className="h-3 w-3" />
                        </a>
                      )}
                      {investorProfile.website_url && (
                        <a
                          href={investorProfile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          Website
                          <Globe className="h-3 w-3" />
                        </a>
                      )}
                      {investorProfile.twitter_url && (
                        <a
                          href={investorProfile.twitter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          Twitter
                          <Globe className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Visibility Settings */}
                <div className="pt-4 border-t border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Visibility</div>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${investorProfile.is_public ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span>{investorProfile.is_public ? 'Public Profile' : 'Private Profile'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${investorProfile.open_to_requests ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span>{investorProfile.open_to_requests ? 'Accepting Requests' : 'Not Accepting Requests'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Form */}
          <div className="card-elevated p-8">
            <h2 className="text-2xl font-black mb-6 text-foreground border-b-4 border-primary pb-3">
              Profile Information
            </h2>

            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-4 border-primary">
                    <AvatarImage src={avatarPreview} alt={user?.username} />
                    <AvatarFallback className="text-2xl font-black bg-primary text-black">
                      {user?.username?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary inline-flex items-center gap-2 px-4 py-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Image
                      </button>
                      {avatarFile && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-destructive"
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload an image (PNG, JPG, GIF, WebP). Max 10MB. Will be stored on IPFS.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={user?.username} disabled className="bg-secondary/50" />
                <p className="text-xs text-muted-foreground">Username cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email} disabled className="bg-secondary/50" />
                <p className="text-xs text-muted-foreground">Email cannot be changed from profile</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Your full name"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself... what are you passionate about?"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={5}
                  className="resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.bio.length}/500 characters
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending || uploadingAvatar}
                className="btn-primary w-full py-3 inline-flex items-center justify-center gap-2"
              >
                {(updateProfileMutation.isPending || uploadingAvatar) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadingAvatar ? 'Uploading avatar...' : 'Saving...'}
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
