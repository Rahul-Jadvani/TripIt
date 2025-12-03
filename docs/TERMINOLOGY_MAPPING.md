# TripIt Terminology Mapping - Zer0 to TripIt Migration

## Core Concept Mapping

| Old Zer0 Concept | New TripIt Concept | Description |
|------------------|-------------------|-------------|
| **Project** | **Itinerary** | A travel plan/experience, replaces project concept |
| **Hackathon** | **Travel Destination/Trip** | Specific destination or trip experience |
| **Project Creator** | **Itinerary Organizer** | Person who created/planned the itinerary |
| **Vote (upvote/downvote)** | **Safety Rating (1-5 stars)** | Rating system based on safety experience |
| **Comment** | **Travel Intel** | Typed intelligence (Q&A, warnings, updates) |
| **Proof Score** | **Travel Credibility Score** | Reputation score for travel experience |
| **GitHub Link** | **Trip Maps/GPS Routes** | Location-based data instead of code repos |
| **Demo URL** | **Route Overview** | Visual representation of the journey |
| **Tech Stack** | **Travel Style & Activities** | Type of travel experience (solo, group, adventure) |
| **Hackathon Name** | **Destination Name** | Geographic location |
| **Team Members** | **Travel Companions** | People involved in the trip |
| **Validator** | **Travel Expert** | Verified person who validates experiences |
| **Badge/Certification** | **Travel Certification** | Verification of expertise (women guide, safety expert) |

## Backend Route Mapping

| Old Route | New Route | Purpose |
|-----------|-----------|---------|
| `/api/projects` | `/api/itineraries` | CRUD for travel itineraries |
| `/api/projects/:id` | `/api/itineraries/:id` | Single itinerary detail |
| `/api/projects/:id/votes` | `/api/itineraries/:id/safety-ratings` | Safety ratings |
| `/api/projects/:id/comments` | `/api/itineraries/:id/intel` | Travel intelligence |
| `/api/projects/search` | `/api/itineraries/search` | Search itineraries |
| `/api/projects/leaderboard` | `/api/itineraries/leaderboard` | Top travel experiences |
| `/api/saved-projects` | `/api/saved-itineraries` | User's saved trips |

## Database Model Mapping

| Old Model | New Model | Status |
|-----------|-----------|--------|
| `Project` | `Itinerary` | New model created ✅ |
| `Vote` | `SafetyRating` | New model created ✅ |
| `Comment` | `TravelIntel` | New model created ✅ |
| `User` | `Traveler` | New model created ✅ |
| `ProjectUpdate` | `ItineraryUpdate` | To be created |
| `SavedProject` | `SavedItinerary` | To be created |

## Field Mapping Examples

### Project → Itinerary
```
Project.title → Itinerary.title
Project.description → Itinerary.description
Project.github_url → Itinerary.route_gpx / route_waypoints
Project.demo_url → Itinerary.route_map_url
Project.hackathon_name → Itinerary.destination
Project.tech_stack → Itinerary.travel_style / activity_tags
Project.team_members → Itinerary.travel_companions
Project.proof_score → Itinerary.travel_credibility_score
Project.upvotes → (deprecated, use SafetyRating avg)
Project.downvotes → (deprecated, use SafetyRating avg)
```

### Vote → SafetyRating
```
Vote.vote_type (up/down) → SafetyRating.overall_safety_score (1-5)
Vote.project_id → SafetyRating.itinerary_id
Vote.user_id → SafetyRating.traveler_sbt_id
```

### Comment → TravelIntel
```
Comment.content → TravelIntel.content
Comment.project_id → TravelIntel.itinerary_id
Comment.author_id → TravelIntel.traveler_sbt_id
(new) TravelIntel.intel_type (question/update/warning/recommendation)
(new) TravelIntel.location_gps (new travel-specific field)
```

## Frontend Component Mapping

| Old Component | New Component | Purpose |
|---------------|---------------|---------|
| `ProjectCard` | `ItineraryCard` | Display itinerary summary |
| `ProjectDetail` | `ItineraryDetail` | Full itinerary view |
| `VoteButton` | `SafetyRatingWidget` | Rate safety experience |
| `CommentThread` | `TravelIntelThread` | Q&A and updates |
| `ProjectList` | `ItineraryList` | Browse itineraries |
| `ProjectLeaderboard` | `ExperienceLeaderboard` | Top travel experiences |

## API Response Field Mapping

### Itinerary Response
```json
{
  "id": "...",
  "title": "...",
  "destination": "...",          // was: hackathon_name
  "regions": [...],              // new field
  "start_date": "...",           // new field
  "end_date": "...",             // new field
  "difficulty_level": "...",     // new field
  "travel_style": "...",         // was: implicit in tech_stack
  "activity_tags": [...],        // was: tech_stack
  "travel_companions": [...],    // was: team_members
  "route_gpx": "...",            // was: github_url
  "route_waypoints": [...],      // new field
  "safety_score": 4.5,           // new - avg of SafetyRatings
  "women_safe_certified": true,  // new field
  "travel_credibility_score": 85 // was: proof_score
}
```

### SafetyRating Response
```json
{
  "id": "...",
  "itinerary_id": "...",         // was: project_id
  "overall_safety_score": 5,     // 1-5 stars (was: vote_type up/down)
  "rating_type": "overall",      // new - can be: accommodation, route, community, women_safety
  "detailed_feedback": "...",    // new field
  "experience_date": "...",      // when they visited
  "verified_traveler": true      // checked against SBT
}
```

### TravelIntel Response
```json
{
  "id": "...",
  "itinerary_id": "...",         // was: project_id
  "intel_type": "question",      // new - can be: question, update, warning, recommendation, local_insight
  "title": "...",                // new field
  "content": "...",              // was: comment.content
  "location_gps": "lat,lon",     // new field
  "severity_level": "medium",    // new - for safety-related intel
  "status": "open"               // new - tracking resolution
}
```

## Scoring System Changes

### Old: Proof Score (for Projects)
- verification_score
- community_score
- onchain_score
- validation_score
- quality_score

### New: Travel Credibility Score (for Itineraries)
- identity_score (from SBT verification)
- travel_history_score (from creator's travel history)
- community_score (from ratings & intel)
- safety_score_component (safety metrics)
- quality_score (photos, description quality)

## UI/UX Terminology Changes

| Old | New |
|-----|-----|
| "Create Project" | "Create Itinerary" |
| "Project Details" | "Trip Details" |
| "Vote on project" | "Rate Safety" |
| "Comment" | "Add Travel Intel" |
| "Save Project" | "Save Itinerary" |
| "Leaderboard" (projects) | "Top Travel Experiences" |
| "Proof Score" | "Travel Credibility Score" |
| "Upvotes" | "Helpful Ratings" |
| "Downvotes" | "Unhelpful Ratings" |
| "Hackathon" | "Travel Destination" |

## Migration Strategy

### Phase 1: Database & Models ✅
- [x] Created Itinerary model
- [x] Created SafetyRating model
- [x] Created TravelIntel model
- [x] Created Traveler model

### Phase 2: Backend Routes (IN PROGRESS)
- [ ] Create `/api/itineraries` endpoints
- [ ] Create `/api/itineraries/:id/safety-ratings` endpoints
- [ ] Create `/api/itineraries/:id/intel` endpoints
- [ ] Deprecate old `/api/projects` endpoints
- [ ] Update search and leaderboard

### Phase 3: Frontend Components
- [ ] Create ItineraryCard component
- [ ] Create ItineraryDetail page
- [ ] Create SafetyRatingWidget component
- [ ] Create TravelIntelThread component
- [ ] Update type definitions

### Phase 4: Data Migration
- [ ] Write migration scripts
- [ ] Transform Projects → Itineraries
- [ ] Transform Votes → SafetyRatings
- [ ] Transform Comments → TravelIntel
- [ ] Update references throughout

## Notes for Developers

1. **Backward Compatibility**: Keep old endpoints working initially with deprecation warnings
2. **Type Safety**: Update TypeScript types to use new names
3. **API Documentation**: Update Swagger/OpenAPI specs
4. **Error Messages**: Update to use travel terminology
5. **Validation**: Update validation messages and constraints
6. **Localization**: If applicable, update i18n keys

---

**Status**: Mapping Complete - Ready for Implementation Phase 2
