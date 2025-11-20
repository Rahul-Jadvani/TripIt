import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { chainSchema, ChainFormInput } from '@/lib/schemas';
import { Chain } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Loader2, Upload, Image as ImageIcon, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChainFormProps {
  chain?: Chain;
  onSubmit: (data: ChainFormData) => void;
  isLoading?: boolean;
}

export interface ChainFormData {
  name: string;
  description: string;
  banner_url?: string;
  logo_url?: string;
  categories: string[];
  rules?: string;
  social_links: {
    website?: string;
    twitter?: string;
    discord?: string;
  };
  is_public: boolean;
  requires_approval: boolean;
}

const AVAILABLE_CATEGORIES = [
  'Hackathon',
  'DeFi',
  'NFT',
  'Gaming',
  'AI/ML',
  'Web3',
  'Social',
  'Tools',
  'Education',
  'Infrastructure',
];

export function ChainForm({ chain, onSubmit, isLoading = false }: ChainFormProps) {
  const [categories, setCategories] = useState<string[]>(chain?.categories || []);
  const [bannerUrl, setBannerUrl] = useState<string>(chain?.banner_url || '');
  const [logoUrl, setLogoUrl] = useState<string>(chain?.logo_url || '');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isPublic, setIsPublic] = useState<boolean>(chain?.is_public ?? true);
  const [requiresApproval, setRequiresApproval] = useState<boolean>(chain?.requires_approval ?? false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<ChainFormInput>({
    resolver: zodResolver(chainSchema),
    defaultValues: {
      name: chain?.name || '',
      description: chain?.description || '',
      rules: chain?.rules || '',
      website: chain?.social_links?.website || '',
      twitter: chain?.social_links?.twitter || '',
      discord: chain?.social_links?.discord || '',
    },
  });

  // Update form when chain data loads
  useEffect(() => {
    if (chain) {
      reset({
        name: chain.name || '',
        description: chain.description || '',
        rules: chain.rules || '',
        website: chain.social_links?.website || '',
        twitter: chain.social_links?.twitter || '',
        discord: chain.social_links?.discord || '',
      });
      setIsPublic(chain.is_public ?? true);
      setRequiresApproval(chain.requires_approval ?? false);
      if (chain.banner_url) setBannerPreview(chain.banner_url);
      if (chain.logo_url) setLogoPreview(chain.logo_url);
    }
  }, [chain, reset]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'banner' | 'logo'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (PNG, JPG, GIF, or WebP)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const setUploading = type === 'banner' ? setUploadingBanner : setUploadingLogo;
    const setUrl = type === 'banner' ? setBannerUrl : setLogoUrl;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const ipfsUrl = data.data.url;

      setUrl(ipfsUrl);
      toast.success(`${type === 'banner' ? 'Banner' : 'Logo'} uploaded successfully!`);
    } catch (error: any) {
      console.error(`${type} upload error:`, error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (type: 'banner' | 'logo') => {
    if (type === 'banner') {
      setBannerUrl('');
    } else {
      setLogoUrl('');
    }
  };

  const handleCategoryToggle = (category: string) => {
    if (categories.includes(category)) {
      setCategories(categories.filter((c) => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  const handleFormSubmit = (data: ChainFormInput) => {
    const formData: ChainFormData = {
      name: data.name,
      description: data.description,
      banner_url: bannerUrl || undefined,
      logo_url: logoUrl || undefined,
      categories,
      rules: data.rules || undefined,
      social_links: {
        website: data.website || undefined,
        twitter: data.twitter || undefined,
        discord: data.discord || undefined,
      },
      is_public: isPublic,
      requires_approval: requiresApproval,
    };

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Provide essential details about your chain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Layerz Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Web3 Builders"
              {...register('name')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe what your chain is about..."
              rows={4}
              {...register('description')}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Rules */}
          <div className="space-y-2">
            <Label htmlFor="rules">Rules & Guidelines (Optional)</Label>
            <Textarea
              id="rules"
              placeholder="Set community guidelines and rules for your chain..."
              rows={4}
              {...register('rules')}
              className={errors.rules ? 'border-destructive' : ''}
            />
            {errors.rules && (
              <p className="text-xs text-destructive">{errors.rules.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              These will be shown to users when they publish projects to this chain
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Visual Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Visual Assets</CardTitle>
          <CardDescription>
            Upload banner and logo images for your chain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Banner */}
          <div className="space-y-3">
            <Label>Banner Image (Optional)</Label>
            {bannerUrl ? (
              <div className="relative">
                <img
                  src={bannerUrl}
                  alt="Banner preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemoveImage('banner')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Recommended: 1200x300px
                </p>
                <label htmlFor="banner-upload">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingBanner}
                    onClick={() => document.getElementById('banner-upload')?.click()}
                  >
                    {uploadingBanner ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Banner
                      </>
                    )}
                  </Button>
                </label>
                <input
                  id="banner-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'banner')}
                  disabled={uploadingBanner}
                />
              </div>
            )}
          </div>

          {/* Logo */}
          <div className="space-y-3">
            <Label>Logo Image (Optional)</Label>
            {logoUrl ? (
              <div className="relative inline-block">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2"
                  onClick={() => handleRemoveImage('logo')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center max-w-xs">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Recommended: 400x400px
                </p>
                <label htmlFor="logo-upload">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingLogo}
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Logo
                      </>
                    )}
                  </Button>
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'logo')}
                  disabled={uploadingLogo}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Select categories that best describe your chain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_CATEGORIES.map((category) => (
              <Badge
                key={category}
                variant={categories.includes(category) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleCategoryToggle(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Add social media and external links for your chain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              {...register('website')}
              className={errors.website ? 'border-destructive' : ''}
            />
            {errors.website && (
              <p className="text-xs text-destructive">{errors.website.message}</p>
            )}
          </div>

          {/* Twitter */}
          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter</Label>
            <Input
              id="twitter"
              placeholder="https://twitter.com/yourchain or @yourchain"
              {...register('twitter')}
            />
          </div>

          {/* Discord */}
          <div className="space-y-2">
            <Label htmlFor="discord">Discord</Label>
            <Input
              id="discord"
              placeholder="https://discord.gg/invite-code"
              {...register('discord')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Layerz Settings</CardTitle>
          <CardDescription>
            Configure privacy and approval settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Public/Private */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="is_public">Public layerz</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Public layerz are visible to everyone. Private layerz are only
                        visible to followers and the owner.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Make this chain visible to everyone
              </p>
            </div>
            <Switch
              id="is_public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Requires Approval */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="requires_approval">Require Approval</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        When enabled, projects must be approved by you before they
                        appear in this chain. Otherwise, projects are added instantly.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">
                Manually approve projects before they appear in this chain
              </p>
            </div>
            <Switch
              id="requires_approval"
              checked={requiresApproval}
              onCheckedChange={setRequiresApproval}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {chain ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            <>{chain ? 'Save Changes' : 'Create layerz'}</>
          )}
        </Button>
      </div>
    </form>
  );
}
