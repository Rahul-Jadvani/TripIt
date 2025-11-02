# Project Updates & Multiple Hackathons - Implementation Guide

## ✅ COMPLETED

### Backend (100%)
1. **Database Model** (`backend/models/project_update.py`)
   - ProjectUpdate model with type, title, content, metadata, color
   - Relationship to Project and User models

2. **Migration** (`backend/migrations/add_project_updates_and_hackathons.py`)
   - Created `project_updates` table
   - Added `hackathons` JSON field to `projects` table
   - Migrated existing hackathon data

3. **API Routes** (`backend/routes/project_updates.py`)
   - POST `/api/projects/:id/updates` - Create update
   - GET `/api/projects/:id/updates` - Get all updates
   - PUT `/api/projects/:id/updates/:update_id` - Edit update
   - DELETE `/api/projects/:id/updates/:update_id` - Delete update

4. **App Integration** (`backend/app.py`)
   - Imported ProjectUpdate model
   - Registered project_updates blueprint

### Frontend (60%)
1. **Post-it Sticker Component** (`frontend/src/components/ProjectUpdateSticker.tsx`)
   - Interactive post-it notes with rotation effect
   - Color-coded by type (yellow, blue, green, pink, purple)
   - Click to expand with full details
   - Delete button for owners
   - Icons for different update types

## 📋 REMAINING TASKS

### Frontend Integration

#### 1. Post Update Modal Component
Create: `frontend/src/components/PostUpdateModal.tsx`

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { toast } from 'sonner';

interface PostUpdateModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PostUpdateModal({ projectId, isOpen, onClose, onSuccess }: PostUpdateModalProps) {
  const [formData, setFormData] = useState({
    update_type: 'milestone',
    title: '',
    content: '',
    color: 'yellow',
    metadata: {}
  });

  const handleSubmit = async () => {
    try {
      await axios.post(`/api/projects/${projectId}/updates`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Update posted!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to post update');
    }
  };

  // ... form fields and submit button
}
```

#### 2. ProjectDetail Page Integration
In `frontend/src/pages/ProjectDetail.tsx`:

**Add imports:**
```typescript
import { ProjectUpdateSticker } from '@/components/ProjectUpdateSticker';
import { PostUpdateModal } from '@/components/PostUpdateModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

**Fetch updates:**
```typescript
const { data: updates } = useQuery({
  queryKey: ['projectUpdates', projectId],
  queryFn: async () => {
    const response = await axios.get(`/api/projects/${projectId}/updates`);
    return response.data.data;
  }
});
```

**Display stickers (add to JSX, top-right corner):**
```typescript
{/* Project Updates - Post-it stickers */}
{updates && updates.length > 0 && (
  <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
    {updates.slice(0, 3).map((update, index) => (
      <ProjectUpdateSticker
        key={update.id}
        update={update}
        index={index}
        canDelete={user?.id === project.user_id}
        onDelete={handleDeleteUpdate}
      />
    ))}
  </div>
)}

{/* Post Update Button (for project owners) */}
{user?.id === project.user_id && (
  <Button onClick={() => setShowPostUpdate(true)}>
    Post Update
  </Button>
)}
```

#### 3. Multiple Hackathons in Forms
In `frontend/src/pages/Publish.tsx` and `frontend/src/pages/EditProject.tsx`:

**Add hackathons state:**
```typescript
const [hackathons, setHackathons] = useState<Array<{
  name: string;
  date: string;
  prize?: string;
}>>([]);

const addHackathon = () => {
  setHackathons([...hackathons, { name: '', date: '', prize: '' }]);
};

const removeHackathon = (index: number) => {
  setHackathons(hackathons.filter((_, i) => i !== index));
};
```

**Add UI:**
```typescript
<div>
  <Label>Hackathons</Label>
  {hackathons.map((hackathon, index) => (
    <div key={index} className="flex gap-2 mb-2">
      <Input
        value={hackathon.name}
        onChange={(e) => {
          const newHackathons = [...hackathons];
          newHackathons[index].name = e.target.value;
          setHackathons(newHackathons);
        }}
        placeholder="Hackathon name"
      />
      <Input
        type="date"
        value={hackathon.date}
        onChange={(e) => {
          const newHackathons = [...hackathons];
          newHackathons[index].date = e.target.value;
          setHackathons(newHackathons);
        }}
      />
      <Button onClick={() => removeHackathon(index)} variant="destructive">
        Remove
      </Button>
    </div>
  ))}
  <Button onClick={addHackathon} variant="outline">+ Add Hackathon</Button>
</div>
```

## 🎨 Styling Notes

### Post-it Effect CSS (already implemented in component):
- Rotation: `rotate-[-2deg]`, `rotate-[1deg]`, etc.
- Shadow: Colored shadows matching post-it color
- Pin effect: Red circular div at top
- Hover: Scale up and straighten (`hover:rotate-0`)
- Tape effect at top using `::before` pseudo-element

### Color Palette:
- Yellow: `#fef3c7` (default, milestones)
- Blue: `#dbeafe` (features, tech updates)
- Green: `#d1fae5` (growth, partnerships)
- Pink: `#fce7f3` (announcements)
- Purple: `#e9d5ff` (hackathon wins, achievements)

## 🚀 Testing

1. **Create Update**: POST to `/api/projects/:id/updates`
2. **View Updates**: Visit project page, stickers appear top-right
3. **Click Sticker**: Dialog opens with full details
4. **Delete Update**: Click X on sticker (owners only)
5. **Multiple Hackathons**: Add/remove in publish/edit forms

## 📝 Update Types

- `milestone` - General achievements
- `hackathon_win` - Hackathon wins/prizes
- `investment` - Funding announcements
- `feature` - New features launched
- `partnership` - Partnerships/collabs
- `announcement` - General announcements

## 🔄 Next Steps

1. Create PostUpdateModal component
2. Integrate stickers into ProjectDetail page
3. Add multiple hackathons support to forms
4. Test end-to-end workflow
5. Optional: Add animations/transitions

All backend infrastructure is complete and ready to use!
