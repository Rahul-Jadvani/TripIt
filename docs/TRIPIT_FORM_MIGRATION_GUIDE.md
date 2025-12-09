# TripIt Form Migration Guide

## Overview
This document outlines the complete transformation from Project Submission to Travel Itinerary Publishing flow.

## Field Mapping Strategy

### ✅ COMPLETED Updates

#### 1. Schema Updates (`frontend/src/lib/schemas.ts`)
- ✅ Updated validation rules for travel context
- ✅ Renamed field descriptions in comments
- ✅ Added new required fields: `destination`, `start_date`, `end_date`
- ✅ Made `githubUrl` optional (now used for map links)
- ✅ Increased character limits for travel content

#### 2. Categories Update (`frontend/src/pages/Publish.tsx`)
- ✅ Changed from tech categories to travel types:
  - Old: AI/ML, Web3/Blockchain, FinTech, etc.
  - New: Solo Travel, Women-Only, Family, Road Trip, Trekking, Cultural, Spiritual, Food & Culinary, Adventure, Wildlife, Photography

###  🔄 PENDING Frontend Updates

#### Field Label & Placeholder Updates Needed:

**Step 1: Basics**
```tsx
// Title Field (Line ~870)
<Label>Itinerary Title *</Label>
<Input placeholder="E.g., Spiti Valley Winter Expedition" />

// Tagline Field
<Label>Teaser / Hook</Label>
<Input placeholder="Short 1-liner summary of your trip" />

// Description Field
<Label>Trip Overview *</Label>
<Textarea placeholder="Describe the vibe, experience, and what makes this trip special..." />
```

**New Fields to Add:**
```tsx
// Primary Destination * (Required)
<Label>Primary Destination *</Label>
<Input name="destination" placeholder="E.g., Himalayas, Spiti Valley" />

// Dates (Required)
<Label>Start Date *</Label>
<Input type="date" name="start_date" />

<Label>End Date *</Label>
<Input type="date" name="end_date" />

// Duration (Auto-calculated or manual)
<Label>Duration (Days)</Label>
<Input type="number" name="duration_days" placeholder="7" />

// Difficulty Level
<Label>Difficulty Level</Label>
<Select name="difficulty_level">
  <option value="easy">Easy</option>
  <option value="moderate">Moderate</option>
  <option value="hard">Hard</option>
  <option value="extreme">Extreme</option>
</Select>

// Budget Range
<Label>Budget Per Person (Optional)</Label>
<Input type="number" name="estimated_budget_min" placeholder="Min (₹ or $)" />
<Input type="number" name="estimated_budget_max" placeholder="Max (₹ or $)" />
```

**Step 1: Links Section**
```tsx
// GitHub URL → Map Link (Line ~1273)
<Label>Map Link (GPX/KML/Google Maps)</Label>
<Input
  name="githubUrl"
  placeholder="https://maps.google.com/... or GPX file link"
/>
<p className="text-xs">Essential for route verification</p>

// Demo URL → Booking/Reference Link
<Label>Booking/Reference Link (Optional)</Label>
<Input
  name="demoUrl"
  placeholder="Link to blog, booking page, or travel guide"
/>
```

**Step 2: Tech Stack → Safety & Gear Tags**
```tsx
// Update section header (Line ~980)
<h2>Safety & Gear Tags</h2>
<p>Add tags like: First Aid, 4G Network, Permit Required, etc.</p>

// Keep the same tagging interface, just update:
- Placeholder: "Type and press enter (e.g., 'Low Connectivity', 'Safe for Solo')"
- Label: "Safety & Logistics Tags *"
```

**Step 3: Story Sections**
```tsx
// The Journey → Day-by-Day Plan (hackathonName field)
<Label>Day-by-Day Itinerary *</Label>
<Textarea
  name="hackathonName"
  placeholder="Day 1: Arrival in Manali...
Day 2: Trek to Chandratal...
Day 3: ..."
  rows={15}
/>

// The Spark → Safety Intelligence (hackathonDate field)
<Label>Safety Intelligence & Risks</Label>
<Textarea
  name="hackathonDate"
  placeholder="List specific risks (landslides, wildlife), nearest hospital contacts, connectivity info, emergency numbers..."
  rows={10}
/>

// Market/Innovation → Hidden Gems (inspiration field)
<Label>Hidden Gems & Local Businesses</Label>
<Textarea
  name="inspiration"
  placeholder="Mention verified homestays, local guides, restaurants, unique spots..."
/>
```

**Step 4: Evidence & Photos**
```tsx
// Pitch Deck → Permits/Docs
<Label>Permits & Documents (Optional)</Label>
<p>Upload permits, tickets, or ID proof for verification</p>

// Screenshots → Trip Photos
<Label>Trip Photos *</Label>
<p>Upload geotagged photos as visual proof</p>
```

### 🔧 Code Changes Required

#### Remove GitHub Validation (Lines 397-431)
```tsx
// DELETE or comment out the validateGithubUrl function
// This was checking for github.com domain which we don't need anymore

// Replace validation at line 484:
// OLD: if (data.githubUrl && !validateGithubUrl(data.githubUrl))
// NEW: // Map link is now optional, no special validation needed
```

#### Update Default Values (Line ~137)
```tsx
defaultValues: {
  title: '',
  tagline: '',
  description: '',
  destination: '', // NEW
  start_date: '', // NEW
  end_date: '', // NEW
  difficulty_level: undefined, // NEW
  estimated_budget_min: undefined, // NEW
  estimated_budget_max: undefined, // NEW
  demoUrl: '',
  githubUrl: '', // Now for map links
  hackathonName: '', // Day-by-day plan
  hackathonDate: '', // Safety intelligence
  techStack: [], // Safety tags
},
```

#### Update Submission Payload (Lines 490-553)
```tsx
const payload = {
  title: data.title,
  tagline: data.tagline,
  description: data.description,
  destination: data.destination, // NEW
  start_date: data.start_date, // NEW
  end_date: data.end_date, // NEW
  duration_days: data.duration_days, // NEW
  difficulty_level: data.difficulty_level, // NEW
  estimated_budget_min: data.estimated_budget_min, // NEW
  estimated_budget_max: data.estimated_budget_max, // NEW
  route_gpx: data.githubUrl || '', // Map link
  demo_url: data.demoUrl || '',
  tech_stack: techStack, // Safety tags
  categories: categories, // Travel types
  // ... rest of payload
};
```

### ✅ Backend Compatibility Check

The backend `Itinerary` model already has these fields:
- ✅ `title` - maps directly
- ✅ `tagline` - maps directly
- ✅ `description` - maps directly
- ✅ `destination` - NEW but already exists in model
- ✅ `start_date` - NEW but already exists in model
- ✅ `end_date` - NEW but already exists in model
- ✅ `duration_days` - NEW but already exists in model
- ✅ `difficulty_level` - NEW but already exists in model
- ✅ `estimated_budget_min` - NEW but already exists in model
- ✅ `estimated_budget_max` - NEW but already exists in model
- ✅ `route_gpx` - maps from githubUrl field
- ✅ `community_tags` - maps from techStack

**No backend model changes needed!** ✅

### 📋 Quick Reference: Old → New

| Old Field | New Purpose | Field Name | Backend Column |
|-----------|-------------|------------|----------------|
| Project Title | Itinerary Title | title | title |
| Tagline | Teaser/Hook | tagline | tagline |
| Description | Trip Overview | description | description |
| GitHub URL | Map Link | githubUrl | route_gpx |
| Demo URL | Booking Link | demoUrl | demo_url |
| Categories | Travel Types | categories | categories |
| Tech Stack | Safety Tags | techStack | community_tags |
| The Journey | Day-by-Day | hackathonName | hackathon_name |
| The Spark | Safety Intel | hackathonDate | hackathon_date |
| Market/Innovation | Hidden Gems | inspiration | inspiration |
| Team Members | Crew/Guides | teamMembers | team_members |
| Pitch Deck | Permits/Docs | pitchDeck | pitch_deck_url |
| Screenshots | Trip Photos | screenshots | screenshots |
| N/A (NEW) | Destination | destination | destination |
| N/A (NEW) | Start Date | start_date | start_date |
| N/A (NEW) | End Date | end_date | end_date |
| N/A (NEW) | Duration | duration_days | duration_days |
| N/A (NEW) | Difficulty | difficulty_level | difficulty_level |
| N/A (NEW) | Budget Min | estimated_budget_min | estimated_budget_min |
| N/A (NEW) | Budget Max | estimated_budget_max | estimated_budget_max |

## Implementation Checklist

- [x] Update validation schema
- [x] Update category options
- [ ] Add new form fields (destination, dates, difficulty, budget)
- [ ] Update all labels and placeholders
- [ ] Remove GitHub URL validation
- [ ] Update form submission payload mapping
- [ ] Update error messages
- [ ] Test form validation
- [ ] Test form submission
- [ ] Verify backend receives correct data

## Notes
- All changes maintain backward compatibility by reusing existing field names where possible
- No database migration needed
- Frontend-only changes for the most part
- AI/Blockchain features ignored as requested
