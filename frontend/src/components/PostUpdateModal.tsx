import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { toast } from 'sonner';

interface PostUpdateModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UPDATE_TYPES = [
  { value: 'milestone', label: 'Milestone', color: 'yellow' },
  { value: 'hackathon_win', label: 'Hackathon Win', color: 'purple' },
  { value: 'investment', label: 'Investment', color: 'green' },
  { value: 'feature', label: 'Feature Launch', color: 'blue' },
  { value: 'partnership', label: 'Partnership', color: 'green' },
  { value: 'announcement', label: 'Announcement', color: 'pink' },
];

export function PostUpdateModal({ projectId, isOpen, onClose, onSuccess }: PostUpdateModalProps) {
  const [formData, setFormData] = useState({
    update_type: 'milestone',
    title: '',
    content: '',
    color: 'yellow',
    metadata: {} as any
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Prevent double submissions
    if (loading) return;

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/api/projects/${projectId}/updates`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Update posted!');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        update_type: 'milestone',
        title: '',
        content: '',
        color: 'yellow',
        metadata: {}
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to post update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post Project Update</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Update Type */}
          <div>
            <Label>Update Type</Label>
            <Select
              value={formData.update_type}
              onValueChange={(value) => {
                const type = UPDATE_TYPES.find(t => t.value === value);
                setFormData({
                  ...formData,
                  update_type: value,
                  color: type?.color || 'yellow'
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UPDATE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Won 1st place at ETHGlobal!"
              maxLength={200}
            />
          </div>

          {/* Content */}
          <div>
            <Label>Details (Optional)</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="Add more details about this update..."
              rows={3}
            />
          </div>

          {/* Conditional metadata fields based on type */}
          {formData.update_type === 'hackathon_win' && (
            <div className="space-y-2">
              <div>
                <Label>Hackathon Name</Label>
                <Input
                  value={formData.metadata.hackathon_name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    metadata: {...formData.metadata, hackathon_name: e.target.value}
                  })}
                  placeholder="ETHGlobal Paris"
                />
              </div>
              <div>
                <Label>Prize/Award</Label>
                <Input
                  value={formData.metadata.prize || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    metadata: {...formData.metadata, prize: e.target.value}
                  })}
                  placeholder="1st Place - $10,000"
                />
              </div>
            </div>
          )}

          {formData.update_type === 'investment' && (
            <div className="space-y-2">
              <div>
                <Label>Amount</Label>
                <Input
                  value={formData.metadata.amount || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    metadata: {...formData.metadata, amount: e.target.value}
                  })}
                  placeholder="$100,000"
                />
              </div>
              <div>
                <Label>Investor Name</Label>
                <Input
                  value={formData.metadata.investor_name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    metadata: {...formData.metadata, investor_name: e.target.value}
                  })}
                  placeholder="Acme Ventures"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Posting...' : 'Post Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
