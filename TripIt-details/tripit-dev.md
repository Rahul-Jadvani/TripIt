# TripIt Development Plan - Migration from Zer0 (0x.ship)

**Document Version:** 1.0
**Date:** November 30, 2025
**Project Status:** Migration Strategy

---

## Executive Summary

This document outlines the comprehensive migration strategy to transform the existing Zer0 (0x.ship) codebase into **TripIt** - India's first blockchain-verified social travel platform. The approach leverages the solid architecture of 0x.ship while fundamentally repurposing data models, APIs, and UI/UX to serve the travel ecosystem instead of hackathon project discovery.

**Key Migration Approach:**
- **Reuse Architecture:** Flask backend, React frontend, PostgreSQL/Redis infrastructure
- **Replace Domain Models:** Projects → Travel Itineraries, Votes → Safety Ratings, Comments → Travel Intel
- **Add New Modules:** Soul-Bound Travel Cards (SBTs), BitChat mesh networking, Women's safety layer, TRIP token economy
- **Preserve:** Authentication system, proof scoring logic (adapted), database patterns

---

## Part 1: Architecture Overview

### Current Stack (Zer0/0x.ship)

```
Frontend: React + Vite + TypeScript
Backend: Flask (Python 3.11+)
Database: PostgreSQL + Redis Cache
Blockchain: Kaia Testnet (Web3.py)
File Storage: IPFS (Pinata)
Deployment: Render.com + Docker
```

### Target Stack (TripIt) - ENHANCED

```
Frontend: React + Next.js (web) + React Native (mobile)
Backend: Flask + Node.js/Express (for real-time features) + FastAPI (ML services)
Database: PostgreSQL (primary) + MongoDB (user-generated content) + Redis (cache)
Blockchain: Base Sepolia (Ethereum L2) - CHANGED from Kaia
File Storage: IPFS (Pinata) - SAME
Messaging: WebSocket (real-time) + Bitchat (mesh) - NEW
AI/ML: TensorFlow + Scikit-learn (safety models) - NEW
Deployment: AWS/Azure + Docker - UPGRADED
```

### Migration Impact Level by Component

| Component | Current | Target | Effort | Priority |
|-----------|---------|--------|--------|----------|
| Auth System | JWT (Email/Password) | JWT + Phone OTP + Social | Medium | P0 |
| Core Models | Projects, Votes, Comments | Itineraries, SafetyRatings, TravelIntel | HIGH | P0 |
| Proof Scoring | 4-category (Verification, Community, Expert, Quality) | 5-category (Identity, Travel History, Community, Safety, Quality) | Medium | P0 |
| API Endpoints | 24 endpoints | 60+ endpoints (9 new modules) | HIGH | P0 |
| Blockchain | NFT Minting (0xCert) | SBT Issuance + Token Ops | High | P0 |
| Real-Time Features | None | WebSocket chat, live location, mesh alerts | HIGH | P1 |
| Mobile App | Not present | React Native required | HIGH | P1 |
| ML Models | None | Anomaly detection, route safety, companion matching | HIGH | P1 |

---

## Part 2: Data Model Transformation

### 2.1 Core Entity Mappings

#### **From: Projects → To: Itineraries + Travel Experiences**

**Current Project Model:**
```python
# Current (0x.ship)
class Project(db.Model):
    id, title, tagline, description, demo_link, github_link
    tech_stack, hackathon_name, created_by, proof_score
    upvotes, downvotes, comment_count, badges, featured
```

**Target Itinerary Model:**
```python
# Target (TripIt)
class Itinerary(db.Model):
    # Identity
    id, uuid, created_by_sbt_id

    # Content
    title, tagline, description
    start_date, end_date, difficulty_level
    destination, regions_covered, route_gpx

    # Community Intelligence
    day_by_day_plans (1..N)
    embedded_businesses (1..N)
    hidden_gems (1..N)
    safety_alerts (1..N)
    community_tags

    # Verification
    photo_evidence_ipfs_hashes
    gps_waypoints_verified
    safety_score (0-100)

    # Engagement
    safety_ratings, helpful_votes, shares
    comment_count, contributor_reputation
    women_safe_certified (boolean)

    # Metadata
    created_at, updated_at, last_verified_date
    is_published, is_featured
```

**Action Items:**
- [ ] Rename/refactor Project model → Itinerary
- [ ] Add date range, location, and difficulty fields
- [ ] Create DayPlan child model for day-by-day breakdown
- [ ] Create EmbeddedBusiness, HiddenGem, SafetyAlert models
- [ ] Add GPX route support and waypoint verification
- [ ] Migration script: Seed sample itineraries (50+ destinations)

---

#### **From: Users → To: Travelers + SBT Holders**

**Current User Model:**
```python
class User(db.Model):
    id, email, password_hash, profile_image
    username, bio, total_karma, created_projects_count
    badges_received, intro_requests_sent/received
```

**Target Traveler Model:**
```python
class Traveler(db.Model):
    # Identity
    id, email, phone, phone_verified
    full_name, date_of_birth, gender
    profile_image, bio, travel_style

    # SBT Integration
    sbt_id, sbt_contract_address  # Blockchain reference
    sbt_status (issued/verified/suspended)
    sbt_verified_date

    # Travel History
    destinations_visited (array)
    total_trips_count, total_km_traveled
    solo_travel_count, group_travel_count

    # Safety Profile
    safety_score (0-100)
    emergency_contacts (1..3)
    medical_conditions
    insurance_provider, insurance_id

    # Reputation
    traveler_reputation_score
    contributions_verified
    safety_reports_filed
    emergency_assistance_provided
    women_guide_certification (boolean)

    # Preferences
    travel_interests (array: trekking, photography, food, cultural, etc.)
    women_only_group_preference (boolean)
    location_sharing_enabled (boolean)

    # TRIP Token
    trip_token_balance
    trip_earnings_total
    trip_spent_total
```

**Action Items:**
- [ ] Extend User → Traveler with SBT fields
- [ ] Add phone number verification (OTP-based)
- [ ] Create SBTVerification model for blockchain sync
- [ ] Add travel history and preference fields
- [ ] Create TravelerReputation calculation logic
- [ ] Add emergency contact management

---

#### **From: Votes → To: Safety Ratings + Helpful Votes**

**Current Vote Model:**
```python
class Vote(db.Model):
    id, user_id, project_id, vote_type (upvote/downvote)
```

**Target SafetyRating Model:**
```python
class SafetyRating(db.Model):
    # Rating
    id, traveler_sbt_id, itinerary_id
    safety_score (1-5)
    experience_date, rating_date

    # Details
    rating_type (overall/accommodation/route/community/women_safety)
    detailed_feedback

    # Verification
    verified_traveler (boolean - checked against SBT)
    photo_evidence_ipfs_hashes

    # Metadata
    helpful_count, unhelpful_count
    safety_alert_filed (boolean)

# New Model: HelpfulVote (for itinerary usefulness)
class HelpfulVote(db.Model):
    id, traveler_id, itinerary_id
    is_helpful (boolean)
    helpful_for_context (solo/group/women/budget/luxury)
```

**Action Items:**
- [ ] Create SafetyRating model with detailed schema
- [ ] Create HelpfulVote model for content quality
- [ ] Add SBT verification check logic
- [ ] Add rating aggregation (average safety score per itinerary)

---

#### **From: Comments → To: Travel Intel + Q&A**

**Current Comment Model:**
```python
class Comment(db.Model):
    id, user_id, project_id, content, created_at
    # Nested threading not explicitly modeled
```

**Target TravelIntel Model:**
```python
class TravelIntel(db.Model):
    # Identity
    id, traveler_sbt_id, itinerary_id
    intel_type (question/update/warning/recommendation/local_insight)

    # Content
    title, content, location_gps

    # Evidence
    photo_ipfs_hashes
    timestamp_of_observation
    verified_at_location (boolean)

    # Threading
    parent_intel_id (for replies)
    thread_depth

    # Engagement
    helpful_count, urgent_flag

    # Community
    responder_sbt_id (who verified/responded)
    response_status (open/resolved/verified)

    # Safety Context
    safety_related (boolean)
    severity_level (low/medium/high/critical)
```

**Action Items:**
- [ ] Create TravelIntel model with hierarchical structure
- [ ] Add intel_type enum for categorization
- [ ] Add GPS and photo verification fields
- [ ] Create IntelResponse child model for Q&A threading
- [ ] Add timestamp verification for temporal safety alerts

---

#### **From: Badges → To: SBT Badges + Certifications**

**Current Badge Model:**
```python
class Badge(db.Model):
    id, name (Silver/Gold/Platinum), project_id
    awarded_by, awarded_at
```

**Target TravelerCertification Model:**
```python
class TravelerCertification(db.Model):
    # Certification
    id, traveler_sbt_id
    certification_type:
        - sbt_verified (issued by system)
        - women_guide_certified (by TripIt)
        - safety_guardian (verified emergency responder)
        - verified_contributor (500+ helpful contributions)
        - region_expert (10+ trips to specific region)

    # Details
    issued_date, expiry_date (1 year)
    issued_by_entity (government/tripit/expert)
    verification_level (bronze/silver/gold/platinum)

    # Proof
    verification_evidence_ipfs
    blockchain_hash
```

**Action Items:**
- [ ] Create TravelerCertification model
- [ ] Add certification types for different credibility levels
- [ ] Integrate with SBT blockchain verification
- [ ] Create women_guide_certification workflow

---

### 2.2 New Domain Models (TripIt-Specific)

#### **Module 1: Soul-Bound Travel Cards (SBTs)**

```python
class SoulBoundTravelCard(db.Model):
    # Identity
    id, uuid, traveler_id
    blockchain_contract_address
    sbt_token_id

    # Identity Data (Encrypted)
    passport_hash (encrypted)
    aadhaar_hash (encrypted)
    dob_hash (encrypted)

    # Journey Details
    entry_date, exit_date
    planned_itinerary_ids (array)

    # Emergency Contacts
    emergency_contact_1_name, emergency_contact_1_phone
    emergency_contact_2_name, emergency_contact_2_phone
    embassy_contact
    insurance_provider, insurance_id

    # Safety Profile
    location_sharing_enabled (boolean)
    medical_conditions_disclosed (encrypted)
    emergency_alert_permission (boolean)

    # Travel History
    check_ins (1..N) # Hotel, tourist sites
    routes_taken (1..N)
    incidents_reported (1..N)
    community_contributions_count

    # Status
    status (issued/active/expired/suspended/revoked)
    issued_date, expiry_date
    last_verified_date

    # Blockchain
    blockchain_verified (boolean)
    verification_tx_hash
    merkle_proof_ipfs
```

**Database Models Needed:**
- `SBTCheckIn` - Hotel/site check-ins
- `SBTRouteSegment` - GPS routes taken
- `SBTIncident` - Emergency events
- `SBTBlockchainVerification` - Blockchain sync state

**Action Items:**
- [ ] Create SoulBoundTravelCard model with encrypted fields
- [ ] Setup encryption/decryption utilities (AES-256)
- [ ] Create SBT issuance workflow
- [ ] Create blockchain sync service for Base Sepolia
- [ ] Add SBT verification API endpoint
- [ ] Create SBT revocation logic

---

#### **Module 2: Safe Group Formation & Matching**

```python
class TravelGroup(db.Model):
    # Group Identity
    id, uuid, created_by_traveler_id
    name, description
    group_type (interest_based/safety_focused/women_only/location_based)

    # Details
    destination, start_date, end_date
    max_members, current_members_count
    activity_tags (array: trekking, photography, food, cultural, etc.)

    # Safety & Verification
    is_women_only (boolean)
    min_sbt_reputation_score
    require_identity_verification (boolean)
    safety_guidelines_accepted (boolean)

    # Members
    members (1..N via TravelGroupMember)

    # Communication
    group_chat_room_id
    live_location_sharing_enabled (boolean)
    emergency_alert_enabled (boolean)

    # Status
    is_active, is_featured
    created_at, updated_at

class TravelGroupMember(db.Model):
    id, group_id, traveler_sbt_id
    joined_date, role (member/organizer/moderator)
    reputation_at_join_time
    has_shared_location (boolean)

class GroupChatMessage(db.Model):
    id, group_id, sender_sbt_id
    message_content
    timestamp, is_encrypted (boolean)
    read_by_ids (array)

class TravelGroupEmergencyAlert(db.Model):
    id, group_id, triggered_by_traveler_sbt_id
    alert_type (health/safety/lost/accident/missing)
    location_gps, timestamp
    status (open/resolved/escalated)
    responders (array of traveler_ids)
```

**Action Items:**
- [ ] Create TravelGroup model
- [ ] Create TravelGroupMember model with reputation snapshot
- [ ] Create GroupChatMessage model for real-time messaging
- [ ] Add WebSocket integration for live group chat
- [ ] Create group matching algorithm (interests + safety score)
- [ ] Add emergency alert propagation logic

---

#### **Module 3: BitChat - Offline Mesh Networking**

```python
class MeshNode(db.Model):
    # Node Identity
    id, device_uuid
    traveler_sbt_id
    device_type (android/ios/web)

    # Network Info
    bluetooth_mac, wifi_direct_mac
    last_beacon_timestamp
    current_location_gps
    battery_percentage

    # Connectivity Status
    is_online, mesh_mode_active (boolean)
    signal_strength
    connected_nodes (array of device_uuids)

    # Routing
    hop_count_to_gateway
    relay_capacity_available

class MeshMessage(db.Model):
    # Message Identity
    id, message_uuid, sender_sbt_id
    recipient_sbt_id (or broadcast_group_id)

    # Content
    message_content (encrypted with AES-256)
    message_type (text/emergency_alert/location_update/sos)

    # Routing
    route_path (array of node_ids)
    ttl (time-to-live)

    # Status
    status (pending/relay_queued/delivered/expired)
    delivery_timestamp

    # Storage
    stored_at_nodes (array) # For store-and-forward

class MeshEmergencyAlert(db.Model):
    # SOS Alert
    id, triggered_by_sbt_id
    alert_level (1-4: personal/community/emergency/critical)

    # Details
    location_gps, timestamp
    alert_message

    # Routing
    ttl_extended (for critical alerts)
    propagation_priority (high)

    # Response
    responders_nearby (array)
    ack_status (from responders)
```

**Distributed Components:**
- Local SQLite on-device (for offline mode)
- Sync service when connectivity restored
- MQTT broker for message queue (alternative to WebSocket)
- Mesh protocol simulator for testing

**Action Items:**
- [ ] Create MeshNode model
- [ ] Create MeshMessage model with encryption
- [ ] Create MeshEmergencyAlert model
- [ ] Design mesh protocol specification
- [ ] Build React Native module for BLE/WiFi Direct
- [ ] Create mesh message relay algorithm
- [ ] Build synchronization service (offline→online)

---

#### **Module 4: TRIP Token Economy**

```python
class TRIPTokenTransaction(db.Model):
    # Transaction
    id, uuid, blockchain_tx_hash
    from_traveler_sbt_id, to_traveler_sbt_id (or to_business_id)

    # Amount & Type
    token_amount, token_amount_in_usd
    transaction_type:
        - earning_safety_report
        - earning_itinerary_contribution
        - earning_emergency_help
        - earning_women_safety_contribution
        - earning_travel_companion_match
        - redemption_discount
        - redemption_guide_booking
        - redemption_escort_service
        - redemption_premium_feature

    # Details
    associated_itinerary_id (if applicable)
    associated_content_id

    # Status
    status (pending/confirmed/failed)
    created_at, confirmed_at

    # Blockchain
    blockchain_confirmed (boolean)
    contract_address
    chain_id (base_sepolia)

class TRIPTokenBalance(db.Model):
    # Balance
    id, traveler_sbt_id
    balance, last_updated_at

    # History
    total_earned, total_spent
    earnings_this_month, spendings_this_month

class TRIPTokenRedeemOffer(db.Model):
    # Offers
    id, business_id
    offer_type (discount/service/booking)

    # Details
    description, discount_percentage (or fixed_amount)
    tripled_points_required, discount_amount

    # Validity
    valid_from, valid_until
    max_redemptions

    # Terms
    terms_and_conditions
```

**Smart Contract (Base Sepolia):**
- TRIP token contract (ERC-20)
- Token minting for rewards
- Burn mechanism for redemptions
- Transaction tracking

**Action Items:**
- [ ] Create TRIP token smart contract (Solidity)
- [ ] Create TRIPTokenTransaction model
- [ ] Create TRIPTokenBalance model
- [ ] Create TRIPTokenRedeemOffer model
- [ ] Deploy to Base Sepolia testnet
- [ ] Create token transaction broadcast service
- [ ] Add token redemption API endpoints

---

#### **Module 5: AI Safety Intelligence**

```python
class SafetyIncident(db.Model):
    # Incident
    id, uuid, reported_by_sbt_id
    incident_type (theft/assault/accident/missing_person/medical/other)

    # Details
    location_gps, incident_date, report_date
    detailed_description, severity_level (low/medium/high/critical)

    # Victim & Responders
    victim_traveler_id (if different from reporter)
    victim_gender, victim_age_range

    # Response
    responding_authority_type (police/hospital/emergency_services)
    response_time_minutes
    case_number
    outcome (resolved/ongoing/unresolved)

    # Learning
    preventable (boolean), prevention_suggestions

class RouteAnomalyDetection(db.Model):
    # Detection Model Results
    id, itinerary_id, detection_timestamp

    # Anomalies Detected
    anomaly_type:
        - significant_delay_from_planned_route
        - prolonged_inactivity (>2 hours in one location)
        - route_deviation (>5km from planned)
        - unexpected_location_change (>100km/hour)
        - battery_status_critical
        - off_network_for_extended_period

    # Details
    traveler_sbt_id
    last_known_location_gps
    time_since_last_update
    confidence_score (0.5-1.0)

    # Action Taken
    alert_sent_to (traveler_id, emergency_contacts_ids, group_members_ids)
    status (detected/acknowledged/false_alarm/incident_filed)

class WomenSafetyAnalytics(db.Model):
    # Analysis
    id, uuid, analysis_date

    # Metrics
    total_women_travelers_tracked
    safety_incident_count_this_month
    incident_reduction_percentage_vs_last_month

    # Route Analytics
    safest_routes_for_women (ranked)
    most_reported_unsafe_areas (heatmap)
    lighting_quality_analysis (by location)
    population_density_analysis (populated vs isolated)

    # Insights
    peak_safe_hours (by region)
    recommended_group_size (by destination)
    top_safety_concerns_reported

class AIModelMetrics(db.Model):
    # Model Performance
    id, model_name (anomaly_detector/route_safety/companion_matcher)
    version, trained_date

    # Accuracy
    precision, recall, f1_score
    true_positive_rate, false_positive_rate

    # Deployment
    is_active, deployed_date
    inference_latency_ms
```

**ML Services:**
- Anomaly detection model (TensorFlow)
- Route safety scoring (Scikit-learn)
- Companion matching algorithm
- Women safety heatmap generation
- Pre-cached recommendations for offline mode

**Action Items:**
- [ ] Build anomaly detection model (movement patterns)
- [ ] Create route safety scoring algorithm
- [ ] Build companion matching ML model
- [ ] Create women safety heatmap generation
- [ ] Setup FastAPI service for ML inference
- [ ] Add pre-caching for offline recommendations
- [ ] Create model retraining pipeline

---

### 2.3 Database Migration Strategy

**Phase 1: Backup & Snapshot**
```sql
-- Backup existing 0x.ship data
CREATE BACKUP OF current database (keep for reference)

-- Create new TripIt schema alongside
CREATE SCHEMA tripit;
```

**Phase 2: Transform Data**
```python
# Seed Migration Scripts

# 1. Transform Projects → Itineraries (sample data)
# 2. Transform Users → Travelers
# 3. Transform Votes → SafetyRatings
# 4. Transform Comments → TravelIntel
# 5. Create initial SBT records
# 6. Initialize TRIP token balances
# 7. Seed sample travel groups
# 8. Populate safety incident database
```

**Phase 3: Validation**
- Data integrity checks
- Foreign key constraint validation
- Blockchain sync verification

---

## Part 3: API Endpoint Transformation

### 3.1 API Endpoint Mapping

#### **Current Endpoints (0x.ship): 24**

| Category | Endpoints | Count |
|----------|-----------|-------|
| Authentication | Register, Login, Refresh, Me, Logout | 5 |
| Projects | List, Get, Create, Update, Delete, Feature, Leaderboard | 7 |
| Voting | Vote/Unvote, Get Votes | 2 |
| Comments | List, Create, Update, Delete | 4 |
| Badges | Award, Get Badges | 2 |
| Intros | Request, Accept, Decline, Received, Sent | 5 |
| Users | Profile, Update, Stats | 3 |
| Blockchain | Verify, Info, Health | 3 |
| Uploads | Upload, Test | 2 |
| **TOTAL** | | **24** |

#### **Target Endpoints (TripIt): 60+**

**New Module: Authentication (7 endpoints)**
```
POST   /api/auth/register                    # Email/phone signup
POST   /api/auth/verify-phone-otp           # OTP verification
POST   /api/auth/login                       # Email/password login
POST   /api/auth/social-login               # Google/Apple sign-in
POST   /api/auth/refresh                    # Token refresh
POST   /api/auth/logout                     # Logout
POST   /api/auth/forgot-password            # Password reset
```

**New Module: Travelers (8 endpoints)**
```
GET    /api/travelers/profile               # Get profile
PUT    /api/travelers/profile               # Update profile
POST   /api/travelers/emergency-contacts    # Add emergency contact
GET    /api/travelers/travel-history        # Get travel records
GET    /api/travelers/:id/sbt-status        # Check SBT status
GET    /api/travelers/leaderboard          # Reputation leaderboard
POST   /api/travelers/preferences           # Update travel preferences
GET    /api/travelers/:id/certifications    # Get certifications
```

**New Module: Itineraries (12 endpoints)**
```
GET    /api/itineraries                     # List with filters (safety, difficulty, destination)
POST   /api/itineraries                     # Create new itinerary
GET    /api/itineraries/:id                 # Get itinerary details
PUT    /api/itineraries/:id                 # Update itinerary
DELETE /api/itineraries/:id                 # Delete itinerary
POST   /api/itineraries/:id/publish         # Publish itinerary
GET    /api/itineraries/:id/day-plans       # Get day-by-day breakdown
POST   /api/itineraries/:id/embed-business  # Add embedded business
GET    /api/itineraries/:id/safety-score    # Get safety metrics
GET    /api/itineraries/trending            # Trending itineraries (time-based)
POST   /api/itineraries/:id/feature         # Admin feature
GET    /api/itineraries/search              # Advanced search (destination, date, difficulty)
```

**New Module: Safety Ratings (6 endpoints)**
```
POST   /api/itineraries/:id/safety-ratings  # Submit safety rating
GET    /api/itineraries/:id/safety-ratings  # Get all ratings
GET    /api/itineraries/:id/safety-analysis # AI safety summary
POST   /api/routes/safety-score             # Rate specific route
GET    /api/locations/:id/safety-heatmap    # Safety heatmap by location
GET    /api/women-travelers/safety-insights # Women-specific safety data
```

**New Module: Travel Intel (8 endpoints)**
```
GET    /api/itineraries/:id/intel           # Get travel intelligence
POST   /api/itineraries/:id/intel           # Add intel (Q&A, updates, warnings)
GET    /api/itineraries/:id/intel/:intel-id # Get specific intel thread
POST   /api/itineraries/:id/intel/:intel-id/reply # Reply to intel
PUT    /api/itineraries/:id/intel/:intel-id # Update intel
DELETE /api/itineraries/:id/intel/:intel-id # Delete intel
POST   /api/itineraries/:id/intel/:intel-id/verify # Verify intel (traveler who visited)
GET    /api/itineraries/:id/updates         # Get recent updates (time-sorted)
```

**New Module: Travel Groups (10 endpoints)**
```
GET    /api/travel-groups                   # List groups with filters
POST   /api/travel-groups                   # Create group
GET    /api/travel-groups/:id               # Get group details
PUT    /api/travel-groups/:id               # Update group
DELETE /api/travel-groups/:id               # Delete group
POST   /api/travel-groups/:id/join          # Join group
POST   /api/travel-groups/:id/leave         # Leave group
GET    /api/travel-groups/:id/members       # Get members
POST   /api/travel-groups/:id/invite        # Invite traveler
GET    /api/travel-groups/matching          # Get matched groups for me
```

**New Module: Group Chat & Coordination (7 endpoints)**
```
GET    /api/groups/:id/chat                 # Get chat history
POST   /api/groups/:id/chat                 # Send message (WebSocket)
GET    /api/groups/:id/live-locations       # Get live location sharing
POST   /api/groups/:id/emergency-alert      # Trigger group emergency
GET    /api/groups/:id/emergency-alerts     # Get alert history
POST   /api/groups/:id/itinerary-sync       # Share itinerary with group
GET    /api/groups/:id/activity-feed        # Group activity timeline
```

**New Module: SBT & Blockchain (8 endpoints)**
```
POST   /api/sbt/issue                       # Issue SBT at entry point
GET    /api/sbt/status/:sbt-id              # Check SBT status
POST   /api/sbt/verify                      # Verify SBT with authority
GET    /api/sbt/blockchain-proof/:sbt-id    # Get blockchain verification
POST   /api/sbt/check-in                    # Record hotel/site check-in
GET    /api/sbt/travel-history              # Get verified travel history
POST   /api/sbt/emergency-update            # Update emergency contacts on-chain
GET    /api/blockchain/verify-identity      # Verify traveler identity (for authorities)
```

**New Module: TRIP Token Economy (9 endpoints)**
```
GET    /api/tokens/balance                  # Get TRIP token balance
POST   /api/tokens/earn                     # Trigger earning event
GET    /api/tokens/transactions             # Get transaction history
GET    /api/tokens/leaderboard              # Top token earners
POST   /api/tokens/redeem                   # Redeem tokens
GET    /api/tokens/offers                   # Get redemption offers
POST   /api/tokens/transfer                 # Transfer tokens to another traveler
GET    /api/tokens/stats                    # Token economy stats
POST   /api/tokens/sync-blockchain          # Force blockchain sync
```

**New Module: BitChat - Mesh Networking (6 endpoints)**
```
GET    /api/mesh/nodes                      # Get nearby mesh nodes
POST   /api/mesh/messages                   # Send mesh message
GET    /api/mesh/message-status/:msg-id     # Check message delivery status
POST   /api/mesh/emergency-sos              # Broadcast emergency SOS
GET    /api/mesh/network-status             # Get mesh network stats
POST   /api/mesh/sync                       # Sync offline data when online
```

**New Module: AI & Safety Analytics (7 endpoints)**
```
GET    /api/ai/route-safety/:itinerary-id   # Get route safety score
POST   /api/ai/anomaly-detection/:sbt-id    # Get anomalies for traveler
GET    /api/ai/women-safety-heatmap         # Women safety heatmap
GET    /api/ai/companion-recommendations    # Get companion match recommendations
POST   /api/ai/predict-safety               # Predict safety of new itinerary
GET    /api/ai/incidents-analysis           # Incident trend analysis
POST   /api/ai/pre-cache-recommendations    # Pre-download offline recommendations
```

**New Module: Women's Safety (5 endpoints)**
```
GET    /api/women-safety/verified-guides    # List verified female guides
POST   /api/women-safety/guide-booking      # Book female guide
GET    /api/women-safety/groups             # Women-only travel groups
POST   /api/women-safety/escort-request     # Request safety escort
GET    /api/women-safety/resources          # Safety resources & tips
```

**New Module: Government & Authorities (4 endpoints)**
```
POST   /api/government/emergency-report     # File emergency report (police)
GET    /api/government/tourist-analytics    # Tourism analytics (for government)
POST   /api/government/safety-advisory      # Post safety advisory
GET    /api/government/permits              # Get permits and regulations
```

**New Module: Uploads & Media (3 endpoints)**
```
POST   /api/uploads/ipfs                    # Upload to IPFS (Pinata)
POST   /api/uploads/image                   # Upload image for itinerary
GET    /api/uploads/verify/:hash            # Verify uploaded content
```

**TOTAL NEW ENDPOINTS: 60+** (Updated from 24 original)

---

### 3.2 Authentication System Changes

**Current (0x.ship):**
```
JWT-based with email/password only
Token expiry: 24 hours
```

**Target (TripIt):**
```
JWT + Phone OTP (primary for India market)
Social login (Google, Apple, Facebook)
Multi-device session management
Emergency hotline integration
SBT-based permission escalation

# Flows:
1. Email/Phone registration with OTP verification
2. Social login with Bharat Stack KYC compliance
3. Automatic SBT linking when issued
4. Emergency authority bypass (police/hospital can access with warrant)
```

**Action Items:**
- [ ] Add phone OTP verification service
- [ ] Integrate social login (Google OAuth, Apple Sign-in)
- [ ] Add Bharat Stack KYC integration
- [ ] Create multi-device session manager
- [ ] Add SBT permission escalation logic
- [ ] Create emergency authority login flow

---

## Part 4: Frontend Transformation

### 4.1 Current Frontend Structure (React)

```
frontend/src
├── pages/          (Projects, Project Detail, Leaderboard)
├── components/     (ProjectCard, VoteButton, CommentThread, etc.)
├── context/        (Auth, User, Project)
├── hooks/          (useProjects, useAuth, etc.)
├── services/       (API calls)
├── lib/            (Utilities)
└── types/          (TypeScript definitions)
```

### 4.2 Target Frontend - MULTI-PLATFORM

#### **Platform 1: Web (Next.js) - REPLACES current React**

```
frontend-web/
├── app/                      # Next.js 14+ app directory
│   ├── (auth)/
│   │   ├── login/           # Login page
│   │   ├── register/        # Registration
│   │   └── verify-otp/      # OTP verification
│   │
│   ├── (travel)/
│   │   ├── itineraries/     # Browse itineraries
│   │   ├── itineraries/[id]/ # Itinerary detail
│   │   ├── create-itinerary/ # Create itinerary
│   │   ├── my-trips/        # User's trips
│   │   ├── safety-intel/    # Safety ratings & intel
│   │   └── travel-guides/   # Women guides network
│   │
│   ├── (groups)/
│   │   ├── groups/          # Browse travel groups
│   │   ├── groups/[id]/     # Group detail + chat
│   │   ├── create-group/    # Create group
│   │   └── matching/        # Find travel companions
│   │
│   ├── (safety)/
│   │   ├── sbt-dashboard/   # SBT status
│   │   ├── emergency/       # Emergency tools
│   │   ├── safety-stats/    # Safety analytics
│   │   └── women-resources/ # Women safety hub
│   │
│   ├── (tokens)/
│   │   ├── tokens/          # Token balance & history
│   │   ├── redeem/          # Redeem offers
│   │   └── leaderboard/     # Token leaderboard
│   │
│   ├── (profile)/
│   │   ├── profile/         # User profile
│   │   ├── preferences/     # Travel preferences
│   │   ├── reputation/      # Reputation score
│   │   └── certifications/  # Badges & certs
│   │
│   └── admin/               # Admin dashboard
│
├── components/
│   ├── ItineraryCard/       # Display itinerary summary
│   ├── SafetyRating/        # Rating component
│   ├── TravelIntel/         # Q&A thread display
│   ├── GroupChat/           # Real-time group chat
│   ├── EmergencyAlert/      # SOS button & display
│   ├── LiveLocation/        # Live sharing map
│   ├── MeshStatus/          # Offline mesh status
│   └── WomenSafetyHub/      # Women-specific UI
│
├── lib/                      # Next.js utilities
├── hooks/                    # React hooks
├── services/                 # API integration
├── types/                    # TypeScript types
└── public/                   # Static assets
```

#### **Platform 2: Mobile (React Native)**

```
mobile/
├── src/
│   ├── screens/
│   │   ├── auth/            # Login, Register, OTP
│   │   ├── home/            # Discovery feed
│   │   ├── itinerary/       # Browse & create
│   │   ├── groups/          # Travel groups
│   │   ├── messages/        # Group chat
│   │   ├── maps/            # Maps & GPS tracking
│   │   ├── safety/          # Safety tools
│   │   ├── tokens/          # Token management
│   │   └── profile/         # User profile
│   │
│   ├── components/          # Reusable components
│   ├── hooks/               # Custom hooks
│   ├── services/            # API + Bluetooth/WiFi
│   ├── native/              # Native modules
│   │   ├── BitChat.ts       # BLE/WiFi Direct mesh
│   │   ├── GPS.ts           # Geolocation
│   │   ├── Camera.ts        # Photo capture
│   │   └── BatteryOptimizer.ts
│   │
│   ├── redux/               # State management
│   ├── utils/               # Utilities
│   └── types/               # TypeScript definitions
│
├── android/                 # Android native code
├── ios/                     # iOS native code
└── app.json                 # Expo configuration
```

### 4.3 UI/UX Changes - Key Screens

**Home Feed:**
```
Current: Projects grid (hackathon projects)
Target:
  ├─ Safety-Sorted Itineraries (recommended first)
  ├─ Travel companions nearby (if location enabled)
  ├─ Women-safe destinations (for women travelers)
  ├─ Emergency alerts (in area)
  ├─ TRIP token earning opportunities
  └─ Trending groups (by region)
```

**Itinerary Detail Page:**
```
Current: Project description + votes + comments
Target:
  ├─ Day-by-day breakdown (collapsible)
  ├─ Map with route (GPX visualization)
  ├─ Embedded businesses + phone/booking links
  ├─ Safety ratings (1-5 stars + detailed)
  ├─ Travel intel thread (Q&A + updates + warnings)
  ├─ Photo gallery (IPFS-hosted)
  ├─ "Join a group for this trip" CTA
  ├─ Women-safe certification badge
  ├─ Community tags (verified, helpful votes)
  └─ TRIP token earning info
```

**Safety Dashboard:**
```
Current: N/A (doesn't exist)
Target:
  ├─ SBT verification status
  ├─ Real-time location sharing controls
  ├─ Emergency contact quick-dial
  ├─ Anomaly detection alerts
  ├─ Safety heatmap for region
  ├─ Women-specific safety score
  ├─ Insurance & policy info
  └─ Emergency SOS button (prominent)
```

**Group Chat (New):**
```
Real-time messaging with:
  ├─ Encrypted messages
  ├─ Live location sharing (map view)
  ├─ File sharing (photos, docs)
  ├─ Emergency alert button
  ├─ Itinerary sync & updates
  ├─ Offline mode (Bitchat fallback)
  └─ Read receipts
```

### 4.4 Migration Actions

**Phase 1: Redesign UI/UX**
- [ ] Create Figma designs for all screens
- [ ] Design component library (Shadcn + Tailwind)
- [ ] Create mobile design system (React Native Paper or Tamagui)

**Phase 2: Migrate Frontend Components**
- [ ] Create itinerary-related components
- [ ] Create safety rating components
- [ ] Create travel intel thread component
- [ ] Create group chat component
- [ ] Create SBT dashboard component
- [ ] Create women's safety hub component
- [ ] Create emergency alert UI

**Phase 3: Add New Functionality**
- [ ] Implement real-time WebSocket for chat
- [ ] Add maps integration (Google Maps or Mapbox)
- [ ] Add live location sharing
- [ ] Add camera & photo upload
- [ ] Add Bluetooth/WiFi Direct integration (React Native only)

**Phase 4: Mobile App**
- [ ] Setup React Native/Expo project
- [ ] Port web screens to mobile
- [ ] Add native module integrations (GPS, camera, mesh networking)
- [ ] Setup push notifications
- [ ] Create offline-first data sync

---

## Part 5: Backend Service Architecture

### 5.1 Current Architecture

```
Flask + PostgreSQL + Redis + Web3.py
Single monolithic application
```

### 5.2 Target Microservices Architecture

**Service 1: API Server (Flask - MODIFIED)**
```python
# Core REST API
├── Routes for: Auth, Travelers, Itineraries, SafetyRatings
├── Group Management, SBT Management
└── Token transactions, Uploads
```

**Service 2: Real-Time Server (Node.js/Express - NEW)**
```javascript
// WebSocket server
├── Group chat messaging
├── Live location sharing
├── Presence detection
├── Notification broadcasting
└── Mesh network coordination
```

**Service 3: Blockchain Service (Python/FastAPI - NEW)**
```python
# Blockchain operations
├── SBT issuance to Base Sepolia
├── TRIP token minting/burning
├── Merkle proof generation
├── Transaction verification
└── Authority verification
```

**Service 4: ML Service (FastAPI - NEW)**
```python
# AI/ML models
├── Anomaly detection inference
├── Route safety scoring
├── Companion matching
├── Women safety heatmap generation
├── Offline recommendation caching
└── Model retraining jobs
```

**Service 5: Mesh Coordinator (Node.js - NEW)**
```javascript
// Offline mesh networking
├── Device registration & discovery
├── Message relay routing
├── Store-and-forward queue
├── Encryption key distribution
├── Network topology tracking
└── Sync coordination
```

**Service 6: Background Tasks (Celery - MODIFIED)**
```python
# Async jobs
├── SBT verification sync
├── TRIP token reward distribution
├── Safety incident aggregation
├── Heatmap generation
├── Model retraining
├── Report generation
└── Notifications
```

### 5.3 New Dependencies

**Backend Requirements (add to `requirements.txt`):**
```
# Core
Flask==3.0.0               # Keep existing
Flask-SQLAlchemy==3.1.1    # Keep existing
SQLAlchemy==2.0.20         # Keep existing
psycopg2-binary==2.9.9     # Keep existing
redis==5.0.1               # Keep existing

# New Blockchain
web3==7.0.0                # Upgrade from existing
eth-keys==0.5.1            # New - for Solidity ops
eth-utils==2.2.0           # New
Crypto==1.4.1              # New - for AES-256

# New ML/AI
tensorflow==2.14.0         # New
scikit-learn==1.3.2        # New
numpy==1.24.3              # New
pandas==2.0.3              # New

# New Real-Time
python-socketio==5.9.0     # New
python-engineio==4.7.1     # New

# New Mesh Networking
bluetooth-low-energy==0.1.0  # New (abstraction)
paho-mqtt==1.6.1             # New - alternative to WebSocket

# Database
mongodb==4.5.0               # New - for user-generated content
pymongo==4.5.0               # New

# Security
PyJWT==2.8.1               # Keep existing
cryptography==41.0.5       # Keep existing
python-dotenv==1.0.0       # Keep existing

# External APIs
requests==2.31.0           # Keep existing
httpx==0.25.0              # New - async HTTP

# Task Queue
celery==5.3.1              # Keep existing
celery-beat==2.5.0         # Keep existing

# Testing
pytest==7.4.2              # Keep existing
pytest-flask==1.2.0        # Keep existing
```

### 5.4 Model Updates - Python Classes

**Key Updates:**

```python
# models/traveler.py - EXTENDS User
class Traveler(User):
    sbt_id = db.String(256, unique=True)
    sbt_status = db.String(50)  # issued, verified, suspended, revoked
    phone = db.String(20)
    phone_verified = db.Boolean(default=False)

    travel_style = db.String(100)  # solo, group, family, adventure, etc.
    total_trips = db.Integer(default=0)
    destinations_visited = db.JSON  # array of destination strings

    safety_score = db.Float(default=0.0)  # 0-100
    women_guide_certified = db.Boolean(default=False)

    emergency_contact_1 = db.String(20)
    emergency_contact_1_name = db.String(100)

    sbt_verified_date = db.DateTime()

# models/itinerary.py - REPLACES Project
class Itinerary(db.Model):
    id = db.Integer(primary_key=True)
    uuid = db.String(36, unique=True)
    title = db.String(200)
    description = db.Text

    destination = db.String(200)  # Primary location
    regions = db.JSON  # Array of regions covered
    difficulty_level = db.String(20)  # Easy, Medium, Hard, Expert

    start_date = db.Date
    end_date = db.Date
    estimated_budget_min = db.Integer
    estimated_budget_max = db.Integer

    route_gpx = db.Text  # GPX format for route
    route_waypoints = db.JSON  # Array of GPS points

    created_by_sbt_id = db.String(256)
    safety_score = db.Float(default=0.0)
    women_safe_certified = db.Boolean(default=False)

    safety_ratings_count = db.Integer(default=0)
    safety_ratings_avg = db.Float(default=0.0)

    helpful_votes = db.Integer(default=0)
    is_published = db.Boolean(default=False)
    is_featured = db.Boolean(default=False)

    created_at = db.DateTime(default=datetime.utcnow)
    updated_at = db.DateTime(default=datetime.utcnow, onupdate=datetime.utcnow)
    last_verified_date = db.DateTime()

    # Relationships
    day_plans = db.relationship('DayPlan', backref='itinerary', cascade='all, delete-orphan')
    embedded_businesses = db.relationship('EmbeddedBusiness', backref='itinerary', cascade='all, delete-orphan')
    hidden_gems = db.relationship('HiddenGem', backref='itinerary', cascade='all, delete-orphan')
    safety_alerts = db.relationship('SafetyAlert', backref='itinerary', cascade='all, delete-orphan')

# models/safety_rating.py - REPLACES Vote
class SafetyRating(db.Model):
    id = db.Integer(primary_key=True)
    itinerary_id = db.Integer(db.ForeignKey('itinerary.id'))
    traveler_sbt_id = db.String(256)

    overall_safety_score = db.Integer  # 1-5
    experience_date = db.Date
    rating_date = db.DateTime(default=datetime.utcnow)

    rating_type = db.String(50)  # overall, accommodation, route, community, women_safety
    detailed_feedback = db.Text

    verified_traveler = db.Boolean(default=False)
    photo_ipfs_hashes = db.JSON  # Array of IPFS hashes

    helpful_votes = db.Integer(default=0)
    safety_alert_filed = db.Boolean(default=False)

# models/travel_intel.py - REPLACES Comment
class TravelIntel(db.Model):
    id = db.Integer(primary_key=True)
    itinerary_id = db.Integer(db.ForeignKey('itinerary.id'))
    traveler_sbt_id = db.String(256)

    intel_type = db.String(50)  # question, update, warning, recommendation, local_insight
    title = db.String(200)
    content = db.Text

    location_gps = db.String(50)  # "lat,lon"
    observation_timestamp = db.DateTime

    photo_ipfs_hashes = db.JSON
    verified_at_location = db.Boolean(default=False)

    parent_intel_id = db.Integer(db.ForeignKey('travel_intel.id'))  # For threading
    thread_depth = db.Integer(default=0)

    helpful_votes = db.Integer(default=0)
    severity_level = db.String(20)  # low, medium, high, critical
    status = db.String(50)  # open, resolved, verified

    created_at = db.DateTime(default=datetime.utcnow)
    updated_at = db.DateTime(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    replies = db.relationship('TravelIntel', remote_side=[id], backref='parent')
```

---

## Part 6: Implementation Roadmap

### Phase 1: Foundation & Core Models (Week 1-2)

**Backend:**
- [ ] Create new database schema (tripit db)
- [ ] Implement Traveler model (extends User)
- [ ] Implement Itinerary model (replaces Project)
- [ ] Implement SafetyRating model (replaces Vote)
- [ ] Implement TravelIntel model (replaces Comment)
- [ ] Create database migration scripts
- [ ] Setup Base Sepolia blockchain connection
- [ ] Create SBT smart contract (Solidity)
- [ ] Create TRIP token smart contract

**Frontend:**
- [ ] Update TypeScript types for new models
- [ ] Migrate component library (Shadcn)
- [ ] Create Itinerary display components
- [ ] Create SafetyRating component
- [ ] Update API service integration

**Actions:**
- [ ] Deploy SBT & TRIP contracts to Base Sepolia testnet
- [ ] Test blockchain integration
- [ ] Seed sample itineraries (50+ routes)

---

### Phase 2: Itinerary & Safety Features (Week 3-4)

**Backend:**
- [ ] Create itinerary CRUD endpoints (12 endpoints)
- [ ] Create safety rating endpoints (6 endpoints)
- [ ] Implement proof scoring (adapted for travel)
- [ ] Add safety heatmap generation
- [ ] Integrate AI anomaly detection model
- [ ] Create women-safe certification logic

**Frontend:**
- [ ] Build itinerary browse page
- [ ] Build itinerary detail page with map
- [ ] Build itinerary creation flow (multi-step)
- [ ] Build safety ratings UI
- [ ] Build women-safe badge display
- [ ] Implement Instagram itinerary sharing

**Mobile:**
- [ ] Setup React Native project with Expo
- [ ] Implement auth screens
- [ ] Port itinerary screens to mobile

---

### Phase 3: Group Formation & Real-Time Features (Week 5-6)

**Backend:**
- [ ] Create TravelGroup model
- [ ] Create group CRUD endpoints (10 endpoints)
- [ ] Implement group matching algorithm
- [ ] Setup WebSocket server (Node.js/Express)
- [ ] Implement real-time chat endpoints (7 endpoints)
- [ ] Create group emergency alert system
- [ ] Implement live location sharing

**Frontend & Mobile:**
- [ ] Build group discovery page
- [ ] Build group creation UI
- [ ] Build group chat component (WebSocket-based)
- [ ] Build live location sharing map
- [ ] Implement group matching UI
- [ ] Add emergency alert button to group chat

---

### Phase 4: Blockchain & Token Economy (Week 7-8)

**Backend:**
- [ ] Create SBT issuance endpoints (8 endpoints)
- [ ] Implement SBT verification workflow
- [ ] Create token transaction tracking (TRIPTokenTransaction)
- [ ] Implement token earning triggers
- [ ] Create token redemption system (9 endpoints)
- [ ] Build token dashboard API
- [ ] Implement blockchain sync service

**Frontend & Mobile:**
- [ ] Build SBT dashboard
- [ ] Build token balance display
- [ ] Build earning opportunities showcase
- [ ] Build redemption offers page
- [ ] Build leaderboard UI
- [ ] Implement token transaction history

**Actions:**
- [ ] Deploy token smart contract updates
- [ ] Setup token distribution workflow
- [ ] Test redemption flow

---

### Phase 5: BitChat - Offline Mesh Networking (Week 9-10)

**Backend:**
- [ ] Create MeshNode model
- [ ] Create MeshMessage model
- [ ] Implement mesh message relay logic
- [ ] Create store-and-forward service
- [ ] Create mesh emergency alert endpoints (6 endpoints)
- [ ] Implement sync service (offline→online)

**Mobile (React Native):**
- [ ] Build Bluetooth LE module (native)
- [ ] Build WiFi Direct module (native)
- [ ] Implement mesh discovery
- [ ] Implement message relay routing
- [ ] Implement offline storage (SQLite)
- [ ] Implement sync when online
- [ ] Add mesh status UI

**Actions:**
- [ ] Test mesh with 4 devices (2-hop relay)
- [ ] Test store-and-forward functionality
- [ ] Test emergency SOS broadcasting

---

### Phase 6: AI & Women's Safety Features (Week 11-12)

**Backend:**
- [ ] Train anomaly detection model
- [ ] Train route safety model
- [ ] Train companion matching model
- [ ] Implement AI endpoints (7 endpoints)
- [ ] Create women's safety module (5 endpoints)
- [ ] Implement verified female guide network
- [ ] Create women-only group features
- [ ] Implement safety escort service

**Frontend & Mobile:**
- [ ] Build women's safety hub
- [ ] Build guide directory & booking
- [ ] Build women-only group discovery
- [ ] Build safety analytics dashboard
- [ ] Build route safety visualization
- [ ] Add women-specific recommendations

**Actions:**
- [ ] Curate list of verified female guides (Phase 1: 50 guides)
- [ ] Test companion matching algorithm
- [ ] Test anomaly detection with sample data

---

### Phase 7: Government Integration & Testing (Week 13-14)

**Backend:**
- [ ] Create government authority endpoints (4 endpoints)
- [ ] Implement emergency reporting to police
- [ ] Create tourism analytics dashboard
- [ ] Implement safety advisory system
- [ ] Create permit/regulation database

**Actions:**
- [ ] API testing (60+ endpoints)
- [ ] Load testing
- [ ] Security audit
- [ ] Blockchain integration testing
- [ ] End-to-end testing

---

### Phase 8: Deployment & Launch Prep (Week 15-16)

**Backend:**
- [ ] Setup AWS/Azure infrastructure
- [ ] Configure Docker containers
- [ ] Setup CI/CD pipeline
- [ ] Configure auto-scaling
- [ ] Setup monitoring & alerting

**Frontend & Mobile:**
- [ ] Build optimization
- [ ] PWA configuration
- [ ] App store submission (iOS/Android)
- [ ] Performance testing

**Actions:**
- [ ] Deploy to staging
- [ ] UAT with beta users (50 users)
- [ ] Fix issues
- [ ] Production deployment

---

## Part 7: File Structure Changes

### 7.1 Backend File Structure (After Migration)

```
backend/
├── app.py                          # Main Flask app (MODIFY)
├── extensions.py                   # SQLAlchemy, JWT (KEEP)
├── config.py                       # Configuration (MODIFY for TripIt)
├── celery_app.py                   # Celery (KEEP)
├── requirements.txt                # Dependencies (UPDATE)
│
├── models/                         # RESTRUCTURE
│   ├── __init__.py
│   ├── base.py                     # Base model class
│   ├── user.py                     # RENAME to traveler.py
│   ├── traveler.py                 # NEW - extends user
│   ├── sbt.py                      # NEW - Soul-Bound Travel Card
│   ├── itinerary.py                # NEW - replaces project.py
│   ├── day_plan.py                 # NEW
│   ├── embedded_business.py        # NEW
│   ├── hidden_gem.py               # NEW
│   ├── safety_alert.py             # NEW
│   ├── safety_rating.py            # NEW - replaces vote.py
│   ├── travel_intel.py             # NEW - replaces comment.py
│   ├── travel_group.py             # NEW
│   ├── travel_group_member.py      # NEW
│   ├── group_chat_message.py       # NEW
│   ├── group_emergency_alert.py    # NEW
│   ├── traveler_certification.py   # NEW
│   ├── mesh_node.py                # NEW
│   ├── mesh_message.py             # NEW
│   ├── mesh_emergency_alert.py     # NEW
│   ├── trip_token_transaction.py   # NEW
│   ├── trip_token_balance.py       # NEW
│   ├── trip_token_redeem_offer.py  # NEW
│   ├── safety_incident.py          # NEW
│   ├── route_anomaly_detection.py  # NEW
│   ├── women_safety_analytics.py   # NEW
│   └── ai_model_metrics.py         # NEW
│
├── routes/                         # RESTRUCTURE
│   ├── __init__.py
│   ├── auth.py                     # MODIFY - add OTP, phone
│   ├── travelers.py                # NEW - replaces users.py (enhanced)
│   ├── itineraries.py              # NEW - replaces projects.py
│   ├── safety_ratings.py           # NEW - replaces votes.py
│   ├── travel_intel.py             # NEW - replaces comments.py
│   ├── travel_groups.py            # NEW
│   ├── group_chat.py               # NEW
│   ├── sbt.py                      # NEW
│   ├── trip_tokens.py              # NEW
│   ├── bitchat_mesh.py             # NEW
│   ├── ai_safety.py                # NEW
│   ├── women_safety.py             # NEW
│   ├── government.py               # NEW
│   ├── uploads.py                  # KEEP
│   └── blockchain.py               # MODIFY - update for Base Sepolia
│
├── schemas/                        # RESTRUCTURE
│   ├── __init__.py
│   ├── traveler_schema.py          # NEW
│   ├── itinerary_schema.py         # NEW
│   ├── safety_rating_schema.py     # NEW
│   ├── travel_intel_schema.py      # NEW
│   ├── travel_group_schema.py      # NEW
│   ├── sbt_schema.py               # NEW
│   ├── token_schema.py             # NEW
│   └── mesh_schema.py              # NEW
│
├── services/                       # EXPAND
│   ├── __init__.py
│   ├── auth_service.py             # MODIFY - add OTP
│   ├── traveler_service.py         # NEW
│   ├── itinerary_service.py        # NEW
│   ├── safety_service.py           # NEW
│   ├── group_service.py            # NEW
│   ├── mesh_service.py             # NEW
│   ├── token_service.py            # NEW
│   ├── sbt_service.py              # NEW
│   ├── ai_service.py               # NEW
│   ├── women_safety_service.py     # NEW
│   └── notification_service.py     # NEW
│
├── utils/                          # EXPAND
│   ├── __init__.py
│   ├── cache.py                    # KEEP
│   ├── decorators.py               # KEEP
│   ├── helpers.py                  # MODIFY
│   ├── scores.py                   # MODIFY - adapt proof scoring
│   ├── ipfs.py                     # KEEP
│   ├── blockchain.py               # MODIFY - update for Base Sepolia
│   ├── encryption.py               # NEW - AES-256 for SBT
│   ├── gps.py                      # NEW - GPS/location utilities
│   ├── mesh_protocol.py            # NEW - mesh networking logic
│   ├── anomaly_detection.py        # NEW - ML model inference
│   └── heatmap_generator.py        # NEW
│
├── tasks/                          # EXPAND (Celery)
│   ├── __init__.py
│   ├── blockchain_tasks.py         # NEW - SBT verification sync
│   ├── token_tasks.py              # NEW - reward distribution
│   ├── safety_tasks.py             # NEW - incident aggregation
│   ├── ml_tasks.py                 # NEW - heatmap generation, retraining
│   ├── notification_tasks.py       # NEW
│   └── report_tasks.py             # NEW
│
├── workers/                        # EXPAND
│   ├── __init__.py
│   ├── mesh_coordinator.py         # NEW - if using separate process
│   └── websocket_handler.py        # NEW - if using separate service
│
├── migrations/                     # Database migrations
│   └── (Alembic files)
│
├── tests/                          # RESTRUCTURE
│   ├── __init__.py
│   ├── test_auth.py                # UPDATE
│   ├── test_itineraries.py         # NEW
│   ├── test_safety_ratings.py      # NEW
│   ├── test_travel_groups.py       # NEW
│   ├── test_sbt.py                 # NEW
│   ├── test_tokens.py              # NEW
│   ├── test_mesh.py                # NEW
│   ├── test_ai.py                  # NEW
│   └── conftest.py                 # UPDATE
│
├── seeds/                          # Data seeding
│   ├── __init__.py
│   ├── seed_itineraries.py         # NEW
│   ├── seed_guides.py              # NEW
│   ├── seed_locations.py           # NEW
│   └── seed_incidents.py           # NEW
│
├── docs/                           # Documentation
│   ├── API_ROUTES_REFERENCE.md     # UPDATE
│   ├── DATABASE_SCHEMA.md          # NEW
│   ├── SBT_SPECIFICATION.md        # NEW
│   ├── MESH_PROTOCOL.md            # NEW
│   ├── AI_MODELS.md                # NEW
│   └── DEPLOYMENT.md               # UPDATE
│
├── scripts/                        # Utility scripts
│   ├── migrate_0xship_to_tripit.py # NEW - data migration
│   ├── deploy_contracts.py         # NEW - smart contract deployment
│   ├── generate_test_sbt.py        # NEW
│   ├── seed_initial_data.py        # NEW
│   └── verify_blockchain.py        # NEW
│
└── .env.example                    # UPDATE
```

### 7.2 Frontend File Structure (After Migration)

```
frontend/
├── src/
│   ├── pages/                      # REPLACE with Next.js app directory
│   │   ├── (auth)/
│   │   ├── (travel)/
│   │   ├── (groups)/
│   │   ├── (safety)/
│   │   ├── (tokens)/
│   │   └── (profile)/
│   │
│   ├── components/
│   │   ├── common/                 # REUSE from old
│   │   ├── itinerary/              # NEW
│   │   ├── safety/                 # NEW
│   │   ├── groups/                 # NEW
│   │   ├── sbt/                    # NEW
│   │   ├── tokens/                 # NEW
│   │   └── women-safety/           # NEW
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # KEEP/MODIFY
│   │   ├── useTraveler.ts          # NEW
│   │   ├── useItineraries.ts       # NEW
│   │   ├── useGroups.ts            # NEW
│   │   ├── useLocation.ts          # NEW
│   │   ├── useWebSocket.ts         # NEW - for real-time
│   │   └── useMesh.ts              # NEW - for offline mode
│   │
│   ├── services/
│   │   ├── api.ts                  # MODIFY - new endpoints
│   │   ├── auth.ts                 # MODIFY
│   │   ├── itinerary.ts            # NEW
│   │   ├── safety.ts               # NEW
│   │   ├── groups.ts               # NEW
│   │   ├── tokens.ts               # NEW
│   │   ├── sbt.ts                  # NEW
│   │   ├── websocket.ts            # NEW
│   │   └── mesh.ts                 # NEW
│   │
│   ├── types/
│   │   ├── index.ts                # EXTEND
│   │   ├── itinerary.ts            # NEW
│   │   ├── safety.ts               # NEW
│   │   ├── group.ts                # NEW
│   │   ├── token.ts                # NEW
│   │   └── sbt.ts                  # NEW
│   │
│   ├── lib/
│   │   ├── utils.ts                # KEEP
│   │   ├── map.ts                  # NEW - map utilities
│   │   ├── gps.ts                  # NEW
│   │   ├── encryption.ts           # NEW - for mesh
│   │   └── offline.ts              # NEW
│   │
│   └── index.css                   # UPDATE styles
│
├── public/                         # Static assets
│   └── images/                     # NEW - women guides, safety icons, etc.
│
├── app.json                        # Expo configuration (for mobile)
└── next.config.js                 # Next.js configuration (for web)
```

---

## Part 8: Testing Strategy

### 8.1 Unit Tests

```python
# Backend Testing
tests/test_itineraries.py          # Itinerary CRUD, scoring
tests/test_safety_ratings.py       # Safety rating calculation
tests/test_travel_groups.py        # Group formation, matching
tests/test_sbt.py                  # SBT issuance, verification
tests/test_tokens.py               # Token earning, redemption
tests/test_mesh.py                 # Mesh message relay, store-forward
tests/test_ai.py                   # Model inference
```

### 8.2 Integration Tests

```python
tests/test_full_itinerary_workflow.py
tests/test_full_group_formation.py
tests/test_sbt_blockchain_sync.py
tests/test_token_end_to_end.py
tests/test_emergency_response_chain.py
```

### 8.3 End-to-End Tests

```
Postman/Insomnia collections for all 60+ API endpoints
Mobile app testing on real devices
Mesh networking testing with 4+ devices
```

---

## Part 9: Deployment Configuration

### 9.1 Environment Variables (Update `.env.example`)

```bash
# Flask
FLASK_ENV=production
SECRET_KEY=<generate-new>

# Database
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb+srv://...

# Redis
REDIS_URL=rediss://...

# JWT
JWT_SECRET_KEY=<generate-new>

# Blockchain (Change from Kaia to Base)
BASE_SEPOLIA_RPC=https://sepolia.base.org
TRIP_TOKEN_CONTRACT=0x...
SBT_CONTRACT=0x...
PRIVATE_KEY_DEPLOYER=0x...

# IPFS
PINATA_API_KEY=...
PINATA_JWT=...

# WebSocket
WEBSOCKET_URL=wss://...
SOCKET_IO_ORIGIN=...

# Mesh Networking
MESH_COORDINATOR_URL=...
MQTT_BROKER=...

# ML Service
ML_SERVICE_URL=...

# External APIs
GOOGLE_MAPS_API_KEY=...
MAPBOX_API_KEY=...

# Women Safety
WOMEN_GUIDE_NETWORK_API=...
ESCORT_SERVICE_API=...

# Government Integration
POLICE_API_KEY=...
TOURISM_BOARD_API=...

# Notifications
FIREBASE_CONFIG=...
SMS_PROVIDER_KEY=...

# AWS/Azure (if using)
AWS_ACCESS_KEY=...
AWS_SECRET_KEY=...
S3_BUCKET=...
```

### 9.2 Docker Configuration

```dockerfile
# Dockerfile (MODIFY for TripIt services)

# Flask API Service
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:create_app()"]

# WebSocket Service
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
CMD ["node", "server.js"]

# ML Service
FROM tensorflow/tensorflow:latest-gpu
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml (EXPAND)
version: '3.8'
services:
  # Existing
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: tripit
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  # New Services
  api:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@db:5432/tripit

  websocket:
    build: ./services/websocket
    ports:
      - "3001:3001"
    depends_on:
      - redis

  ml_service:
    build: ./services/ml
    ports:
      - "8000:8000"
    environment:
      MODEL_PATH: /models
    volumes:
      - ./models:/models

  mesh_coordinator:
    build: ./services/mesh
    ports:
      - "3002:3002"

  worker:
    build: ./backend
    command: celery -A celery_app worker --loglevel=info
    depends_on:
      - db
      - redis

  flower:
    image: mher/flower
    ports:
      - "5555:5555"
    command: celery --broker=redis://redis:6379 flower
    depends_on:
      - redis

volumes:
  db_data:
```

---

## Part 10: Critical Success Factors & Risk Mitigation

### 10.1 Critical Success Factors

1. **Data Integrity During Migration** - Backup, validate, test thoroughly
2. **Blockchain Integration** - Base Sepolia testnet must work flawlessly
3. **Women's Safety Features** - Must be genuinely useful, not tokenistic
4. **Offline Mesh Networking** - Most technically complex, needs extensive testing
5. **Real-time Group Features** - WebSocket stability critical for user experience
6. **Safety Reputation System** - Must prevent gaming/manipulation

### 10.2 Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Blockchain network failure | Medium | High | Have fallback to centralized DB, retry logic |
| Mesh networking unreliability | High | High | Extensive testing, graceful degradation |
| Data loss during migration | Low | Critical | Multi-backup strategy, validation checks |
| Privacy violations (GPS data) | Medium | High | Encryption, consent management, audit logs |
| Women guide network vetting | High | Medium | Manual verification, background checks |
| Token economy gaming | High | Medium | Scoring algorithm adjustments, monitoring |

---

## Part 11: Summary of Changes

### A. Domain Model Changes

| Aspect | From | To |
|--------|------|-----|
| Main Entity | Project | Itinerary |
| Voting | Vote (up/down) | SafetyRating (1-5 scores) |
| Comments | Comment | TravelIntel (typed: Q&A, updates, warnings) |
| Users | User (basic) | Traveler (SBT-linked, travel history) |
| Proof Score | 4-category | 5-category (adapted) |
| Content Focus | Hackathon projects | Travel itineraries |

### B. Feature Additions (Major)

1. **Soul-Bound Travel Cards (SBTs)** - Blockchain identity
2. **Safe Group Formation** - Travel companion matching
3. **BitChat - Mesh Networking** - Offline communication
4. **TRIP Token Economy** - Reward system
5. **AI Safety Intelligence** - Anomaly detection, route safety
6. **Women's Safety Focus** - Guides, groups, analytics
7. **Real-time Features** - Chat, location sharing, emergency alerts
8. **Government Integration** - Emergency response, tourism analytics

### C. Technology Changes

| Layer | Changes |
|-------|---------|
| Blockchain | Kaia Testnet → Base Sepolia |
| Messaging | No real-time → WebSocket + MQTT |
| Database | PostgreSQL only → PostgreSQL + MongoDB |
| Backend | Flask only → Flask + Node.js + FastAPI |
| Frontend | React SPA → React (web) + React Native (mobile) |
| ML | None → TensorFlow, Scikit-learn |
| Mesh Networking | None → BLE + WiFi Direct |

---

## Part 12: Next Steps

1. **Review & Approval** - Stakeholder approval of this plan
2. **Sprint Planning** - Break 16-week roadmap into 2-week sprints
3. **Team Allocation** - Assign developers to modules
4. **Environment Setup** - Base Sepolia testnet, Pinata, AWS/Azure accounts
5. **Contract Development** - Begin SBT and TRIP token contracts
6. **Database Migration** - Create new schema, run migration scripts
7. **API Development** - Start with Phase 1 endpoints
8. **Testing Infrastructure** - Setup automated testing

---

**Document Created:** November 30, 2025
**Status:** Ready for Implementation
**Estimated Timeline:** 16 weeks (4 months)
