import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TravelGroup } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { travelGroupsService } from '@/services/api';

interface TravelGroupFormProps {
  group?: TravelGroup;
  mode?: 'create' | 'edit';
}

const ACTIVITY_TAGS = [
  'Trekking',
  'Photography',
  'Food',
  'Culture',
  'Adventure',
  'Wildlife',
  'Beach',
  'Mountains',
  'Backpacking',
  'Luxury',
  'History',
  'Nightlife',
  'Wellness',
  'Volunteering',
  'Road Trip',
];

const GROUP_TYPES = [
  { value: 'interest_based', label: 'Interest Based', description: 'Connect with travelers who share your interests' },
  { value: 'safety_focused', label: 'Safety Focused', description: 'Priority on safety and security during travel' },
  { value: 'women_only', label: 'Women Only', description: 'Exclusive group for women travelers' },
  { value: 'location_based', label: 'Location Based', description: 'Based on specific locations or regions' },
];

export function TravelGroupForm({ group, mode = 'create' }: TravelGroupFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    destination: group?.destination || '',
    start_date: group?.start_date ? new Date(group.start_date).toISOString().split('T')[0] : '',
    end_date: group?.end_date ? new Date(group.end_date).toISOString().split('T')[0] : '',
    max_members: group?.max_members || 10,
    group_type: group?.group_type || 'interest_based',
    activity_tags: group?.activity_tags || [],
    is_women_only: group?.is_women_only || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: any) => travelGroupsService.createGroup(data),
    onSuccess: (response) => {
      toast.success('Travel group created successfully!');
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
      navigate(`/groups/${response.data.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create group');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => travelGroupsService.updateGroup(group!.id, data),
    onSuccess: () => {
      toast.success('Travel group updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['travel-groups'] });
      queryClient.invalidateQueries({ queryKey: ['travel-group', group!.id] });
      navigate(`/groups/${group!.id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update group');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    }
    if (!formData.destination.trim()) {
      newErrors.destination = 'Destination is required';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      newErrors.end_date = 'End date must be after start date';
    }
    if (formData.max_members < 2) {
      newErrors.max_members = 'Group must allow at least 2 members';
    }
    if (formData.max_members > 50) {
      newErrors.max_members = 'Group cannot exceed 50 members';
    }
    if (formData.activity_tags.length === 0) {
      newErrors.activity_tags = 'Select at least one activity';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    const submitData = {
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
    };

    if (mode === 'create') {
      createMutation.mutate(submitData);
    } else {
      updateMutation.mutate(submitData);
    }
  };

  const handleCancel = () => {
    if (group) {
      navigate(`/groups/${group.id}`);
    } else {
      navigate('/groups');
    }
  };

  const toggleActivityTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      activity_tags: prev.activity_tags.includes(tag)
        ? prev.activity_tags.filter((t) => t !== tag)
        : [...prev.activity_tags, tag],
    }));
    // Clear error when user makes selection
    if (errors.activity_tags) {
      setErrors((prev) => ({ ...prev, activity_tags: '' }));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      <Card className="p-6 space-y-6">
        {/* Group Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold">
            Group Name *
          </Label>
          <Input
            id="name"
            placeholder="Enter group name (e.g., Himalayan Trekkers)"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-semibold">
            Description
          </Label>
          <Textarea
            id="description"
            placeholder="Describe your travel group, what makes it special, and what travelers can expect..."
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Optional but recommended - help travelers understand your group better
          </p>
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <Label htmlFor="destination" className="text-sm font-semibold">
            Destination *
          </Label>
          <Input
            id="destination"
            placeholder="e.g., Manali, Himachal Pradesh, India"
            value={formData.destination}
            onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
            className={errors.destination ? 'border-destructive' : ''}
          />
          {errors.destination && (
            <p className="text-sm text-destructive">{errors.destination}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date" className="text-sm font-semibold flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Start Date *
            </Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
              className={errors.start_date ? 'border-destructive' : ''}
            />
            {errors.start_date && (
              <p className="text-sm text-destructive">{errors.start_date}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date" className="text-sm font-semibold flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              End Date *
            </Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
              className={errors.end_date ? 'border-destructive' : ''}
            />
            {errors.end_date && (
              <p className="text-sm text-destructive">{errors.end_date}</p>
            )}
          </div>
        </div>

        {/* Max Members */}
        <div className="space-y-2">
          <Label htmlFor="max_members" className="text-sm font-semibold">
            Maximum Members * (2-50)
          </Label>
          <Input
            id="max_members"
            type="number"
            min="2"
            max="50"
            value={formData.max_members}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, max_members: parseInt(e.target.value) || 2 }))
            }
            className={errors.max_members ? 'border-destructive' : ''}
          />
          {errors.max_members && (
            <p className="text-sm text-destructive">{errors.max_members}</p>
          )}
        </div>

        {/* Group Type */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Group Type *</Label>
          <RadioGroup
            value={formData.group_type}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, group_type: value }))}
          >
            {GROUP_TYPES.map((type) => (
              <div key={type.value} className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={type.value} className="font-medium cursor-pointer">
                    {type.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Activity Tags */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">
            Activity Tags * (Select at least one)
          </Label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={formData.activity_tags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => toggleActivityTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
          {errors.activity_tags && (
            <p className="text-sm text-destructive">{errors.activity_tags}</p>
          )}
        </div>

        {/* Women Only Checkbox */}
        <div className="flex items-center space-x-2 p-4 bg-secondary/30 rounded-lg border border-border">
          <Checkbox
            id="is_women_only"
            checked={formData.is_women_only}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, is_women_only: checked === true }))
            }
          />
          <div className="flex-1">
            <Label htmlFor="is_women_only" className="font-medium cursor-pointer">
              Women Only Group
            </Label>
            <p className="text-sm text-muted-foreground">
              Restrict group membership to women travelers only for enhanced safety
            </p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            'Saving...'
          ) : mode === 'create' ? (
            'Create Group'
          ) : (
            'Update Group'
          )}
        </Button>
      </div>
    </form>
  );
}
