# AI Remix Chat - Comprehensive Implementation Plan

## 🎯 Overview

Transform the current one-shot AI remix into a **persistent chat-based interface** similar to ChatGPT/Claude, where users can iteratively refine their travel itinerary through conversation.

---

## 📋 Requirements Summary

### Core Changes from Current Implementation:
1. **Chat Interface** - Replace single generation with ongoing conversation
2. **Persistent Sessions** - Save and resume chat conversations
3. **Multiple Chats** - Manage multiple remix sessions like ChatGPT sidebar
4. **Modal/Popup UI** - Chat opens in modal instead of separate page
5. **Iterative Refinement** - Continuous back-and-forth until user is satisfied
6. **Smart Publishing** - Pre-fill existing publish form with final result
7. **Attribution** - "Generated with TripIt" tag + Inspirations section

### Flow Changes:
- **Before:** Select itineraries → One prompt → Generate → Done
- **After:** Select itineraries → Open chat → Continuous conversation → Save & Publish when ready

---

## 🗄️ Database Schema Design

### New Tables

#### 1. `remix_chat_sessions`
```sql
CREATE TABLE remix_chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
    title VARCHAR(200) DEFAULT 'New Remix Chat',
    source_itinerary_ids JSON NOT NULL,  -- Array of 1-3 itinerary IDs
    current_draft_id VARCHAR(36) REFERENCES itineraries(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',  -- active, finalized, archived
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_updated_at (updated_at)
);
```

**Purpose:** Stores chat sessions with metadata

#### 2. `remix_chat_messages`
```sql
CREATE TABLE remix_chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES remix_chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    metadata JSON,  -- For storing structured data (itinerary updates, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at)
);
```

**Purpose:** Stores individual messages in each chat session

#### 3. Migration Script Location
**File:** `backend/migrations/add_remix_chat_tables.py`

---

## 🔌 Backend API Design

### New Endpoints

#### 1. **Create Chat Session**
```
POST /api/remix/sessions
```
**Request:**
```json
{
  "itinerary_ids": ["id1", "id2"],  // 1-3 itineraries (change from 1-5)
  "initial_message": "I want to combine these trips for a 7-day adventure"
}
```
**Response:**
```json
{
  "status": "success",
  "data": {
    "session": {
      "id": "session-uuid",
      "title": "Remix: Himalayan Trek + Beach Getaway",
      "source_itineraries": [...],
      "created_at": "2025-12-08T10:00:00Z",
      "message_count": 1
    },
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "I want to combine...",
        "created_at": "2025-12-08T10:00:00Z"
      },
      {
        "id": "msg-2",
        "role": "assistant",
        "content": "I'd be happy to help...",
        "metadata": {
          "draft_itinerary": { /* initial draft */ }
        },
        "created_at": "2025-12-08T10:00:05Z"
      }
    ]
  }
}
```

---

#### 2. **List User's Chat Sessions**
```
GET /api/remix/sessions
```
**Query Params:**
- `status` - Filter by status (active/finalized/archived)
- `page`, `per_page` - Pagination

**Response:**
```json
{
  "status": "success",
  "data": {
    "sessions": [
      {
        "id": "session-1",
        "title": "Himalayan Adventure Mix",
        "source_itinerary_ids": ["id1", "id2"],
        "message_count": 12,
        "last_message_at": "2025-12-08T15:30:00Z",
        "preview": "Latest message preview...",
        "status": "active"
      }
    ],
    "total": 5,
    "page": 1,
    "per_page": 10
  }
}
```

---

#### 3. **Get Session with Messages**
```
GET /api/remix/sessions/:session_id
```
**Response:**
```json
{
  "status": "success",
  "data": {
    "session": {
      "id": "session-uuid",
      "title": "Himalayan Adventure Mix",
      "source_itineraries": [
        { "id": "id1", "title": "...", "destination": "..." }
      ],
      "current_draft": { /* latest itinerary state */ },
      "message_count": 12,
      "status": "active"
    },
    "messages": [
      { "id": "msg-1", "role": "user", "content": "...", "created_at": "..." },
      { "id": "msg-2", "role": "assistant", "content": "...", "metadata": {...} }
    ]
  }
}
```

---

#### 4. **Send Message (Main Chat Endpoint)**
```
POST /api/remix/sessions/:session_id/messages
```
**Request:**
```json
{
  "message": "Can you add more cultural experiences and reduce budget to $1500?"
}
```
**Response:**
```json
{
  "status": "success",
  "data": {
    "user_message": {
      "id": "msg-13",
      "role": "user",
      "content": "Can you add more...",
      "created_at": "2025-12-08T16:00:00Z"
    },
    "assistant_message": {
      "id": "msg-14",
      "role": "assistant",
      "content": "I've updated your itinerary to include...",
      "metadata": {
        "draft_itinerary": {
          "title": "Cultural Himalayan Journey",
          "budget_amount": 1450,
          "daily_plans": [...]
        }
      },
      "created_at": "2025-12-08T16:00:08Z"
    },
    "session": {
      "message_count": 14,
      "current_draft": { /* updated draft */ }
    }
  }
}
```

---

#### 5. **Finalize Session & Prepare for Publishing**
```
POST /api/remix/sessions/:session_id/finalize
```
**Purpose:** Locks the session and returns complete data for publish form

**Response:**
```json
{
  "status": "success",
  "data": {
    "itinerary": {
      "id": "draft-id",
      "title": "Cultural Himalayan Journey",
      "tagline": "A perfect blend of adventure and culture",
      "description": "Full description...",
      "destination": "Himachal Pradesh",
      "duration_days": 7,
      "budget_amount": 1450,
      "budget_currency": "USD",
      "difficulty_level": "moderate",
      "activity_tags": ["trekking", "culture", "food"],
      "categories": ["Adventure", "Cultural"],
      "day_by_day_plan": "Detailed plan...",
      "trip_highlights": "...",
      "trip_journey": "...",
      "safety_tips": "...",
      "packing_list": [...],
      "important_notes": [...],
      "is_remixed": true,
      "remixed_from_ids": ["id1", "id2"]
    },
    "source_itineraries": [
      { "id": "id1", "title": "...", "creator": {...} },
      { "id": "id2", "title": "...", "creator": {...} }
    ],
    "chat_summary": "User wanted to combine...",
    "redirect_to": "/publish"
  }
}
```

---

#### 6. **Update Session Title**
```
PATCH /api/remix/sessions/:session_id
```
**Request:**
```json
{
  "title": "My Amazing Trip Plan"
}
```

---

#### 7. **Delete Session**
```
DELETE /api/remix/sessions/:session_id
```

---

#### 8. **Archive Session**
```
POST /api/remix/sessions/:session_id/archive
```

---

## 🎨 Frontend Architecture

### Component Structure

```
frontend/src/
├── pages/
│   ├── RemixPage.tsx                  (KEEP - selection page)
│   └── RemixCreatePage.tsx            (DELETE - replaced by modal)
├── components/
│   ├── remix/
│   │   ├── RemixChatModal.tsx         (NEW - Main modal container)
│   │   ├── RemixChatSidebar.tsx       (NEW - Chat sessions list)
│   │   ├── RemixChatHeader.tsx        (NEW - Top bar with title & actions)
│   │   ├── RemixChatMessages.tsx      (NEW - Messages area)
│   │   ├── RemixChatInput.tsx         (NEW - Input box)
│   │   ├── RemixMessageBubble.tsx     (NEW - Individual message)
│   │   ├── RemixItineraryPreview.tsx  (NEW - Live preview card)
│   │   └── RemixSourceCards.tsx       (NEW - Show source itineraries)
│   └── ...
├── hooks/
│   ├── useRemixChat.ts                (NEW - Chat state management)
│   ├── useRemixSessions.ts            (NEW - Sessions CRUD)
│   └── useRemixMessages.ts            (NEW - Message handling)
└── context/
    └── RemixChatContext.tsx           (NEW - Global chat state)
```

---

### UI/UX Flow

#### **Step 1: Selection Page** (`RemixPage.tsx`)
**Changes:**
- Reduce selection limit from **5 to 3** itineraries
- Update button text: "Continue to Remix" → "Start Remix Chat"
- On click: Open `RemixChatModal` instead of navigating to new page

---

#### **Step 2: Chat Modal** (`RemixChatModal.tsx`)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [Sidebar]  │         [Chat Area]          │ [Preview] │
│             │                               │           │
│  My Chats   │  ┌─ Chat Header ──────────┐  │ Current   │
│  ---------  │  │ 🎨 Himalayan Mix      │  │ Itinerary │
│  Chat 1     │  │ [Save & Publish] [×]   │  │ Preview   │
│  Chat 2     │  └────────────────────────┘  │           │
│  + New Chat │                               │ Day 1:... │
│             │  [Messages Area - scroll]     │ Day 2:... │
│             │  ┌─────────────────────────┐ │           │
│             │  │ User: I want...        │ │           │
│             │  │ AI: I've created...    │ │           │
│             │  │ User: Add more...      │ │           │
│             │  │ AI: Updated with...    │ │           │
│             │  └─────────────────────────┘ │           │
│             │                               │           │
│             │  [Input Box]                  │           │
│             │  Type your message... [Send]  │           │
└─────────────────────────────────────────────────────────┘
```

**Responsive:**
- **Desktop:** 3-column layout (sidebar | chat | preview)
- **Tablet:** 2-column (chat | preview), sidebar as drawer
- **Mobile:** Full screen chat, preview as collapsible

---

#### **Step 3: Chat Interaction**

**User Flow:**
1. User types message: "I want a 7-day trip with more cultural activities"
2. Message appears in chat immediately (optimistic update)
3. AI response streams in (or shows typing indicator)
4. Preview panel updates with new itinerary state
5. Repeat until satisfied
6. Click "Save & Publish"

---

#### **Step 4: Save & Publish**

**Flow:**
1. User clicks "Save & Publish" button in chat header
2. Call `POST /api/remix/sessions/:id/finalize`
3. Close modal
4. Navigate to `/publish` with state:
   ```ts
   navigate('/publish', {
     state: {
       prefillData: {
         title: "...",
         description: "...",
         // ... all fields
       },
       isRemix: true,
       sourceItineraries: [...],
       chatSessionId: "session-id"
     }
   });
   ```

---

## 🔧 Technical Implementation Details

### 1. **AI Service Changes** (`backend/services/ai_analyzer.py`)

**Current Method:**
```python
def remix_itineraries(itineraries_data, user_prompt):
    # Single shot generation
```

**New Methods:**
```python
class AIAnalyzer:
    def start_remix_chat(self, itineraries_data, initial_message):
        """Initialize chat with source analysis"""
        # Return initial draft + greeting

    def continue_remix_chat(self, chat_history, user_message, current_draft):
        """Continue conversation with context"""
        # Takes: previous messages + current state
        # Returns: AI response + updated draft

    def _build_chat_context(self, itineraries_data, messages, current_draft):
        """Build OpenAI messages array with context"""
        # System prompt with itinerary data
        # Previous conversation history
        # Current state
```

**System Prompt Template:**
```
You are TripIt AI, a travel planning assistant helping users create perfect
itineraries by combining multiple source trips.

SOURCE ITINERARIES:
1. {title}: {destination}, {days} days, ${budget}
   Highlights: {highlights}
   Daily plans: {plans}

2. {title}: ...

Your task:
- Help the user iteratively refine their dream trip
- Suggest improvements based on their feedback
- Maintain budget, duration, and feasibility
- Be creative but practical
- Update the itinerary JSON after each message

Current Draft State:
{current_draft_json}

User's latest message: {user_message}

Respond with:
1. A conversational message (2-3 sentences)
2. Updated itinerary JSON in metadata
```

---

### 2. **State Management** (Frontend)

**Option A: React Context + Local State**
```tsx
// context/RemixChatContext.tsx
interface RemixChatContextType {
  activeSessionId: string | null;
  sessions: Session[];
  currentMessages: Message[];
  sendMessage: (content: string) => Promise<void>;
  createSession: (itineraryIds: string[]) => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  finalizeSession: () => Promise<FinalizedData>;
}
```

**Option B: Zustand Store** (Recommended)
```ts
// stores/remixChatStore.ts
interface RemixChatStore {
  sessions: Session[];
  activeSessionId: string | null;
  messages: Record<string, Message[]>;
  currentDraft: Itinerary | null;
  isLoading: boolean;

  // Actions
  fetchSessions: () => Promise<void>;
  createSession: (data) => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  finalizeSession: () => Promise<void>;
}
```

---

### 3. **Real-time Streaming** (Optional Enhancement)

**Phase 1:** Standard polling (simpler, works everywhere)
**Phase 2:** Server-Sent Events for streaming responses

```python
# Backend streaming endpoint (optional)
@remix_bp.route('/sessions/<session_id>/stream', methods=['POST'])
def stream_message(session_id):
    def generate():
        # Stream AI response token by token
        for chunk in ai_analyzer.stream_chat_response(...):
            yield f"data: {json.dumps(chunk)}\n\n"

    return Response(generate(), mimetype='text/event-stream')
```

```tsx
// Frontend streaming (optional)
const useStreamingMessage = () => {
  const sendStreamingMessage = async (message: string) => {
    const eventSource = new EventSource(`/api/remix/sessions/${id}/stream`);
    eventSource.onmessage = (event) => {
      const chunk = JSON.parse(event.data);
      // Update message incrementally
    };
  };
};
```

---

## 📝 Publish Form Integration

### Changes to `Publish.tsx`

#### 1. **Accept Pre-filled Data**
```tsx
// Publish.tsx
const location = useLocation();
const { prefillData, isRemix, sourceItineraries } = location.state || {};

useEffect(() => {
  if (prefillData) {
    // Pre-fill all form fields
    setValue('title', prefillData.title);
    setValue('description', prefillData.description);
    // ... all other fields
  }
}, [prefillData]);
```

---

#### 2. **Add Inspirations Section**
```tsx
// New section in Publish.tsx (after team/story sections)
{isRemix && sourceItineraries && (
  <div id="inspirationsSection" className="card-elevated p-6">
    <h2 className="text-2xl font-bold text-foreground mb-4">
      🎨 Remix Attribution
    </h2>

    {/* Auto-added tag */}
    <div className="mb-4">
      <Badge className="badge-primary">
        <Sparkles className="w-4 h-4 mr-1" />
        Generated with TripIt AI
      </Badge>
    </div>

    {/* Source itineraries */}
    <div className="mb-4">
      <label className="block text-foreground font-semibold mb-2">
        Inspired by these amazing trips:
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sourceItineraries.map(source => (
          <Link
            key={source.id}
            to={`/itinerary/${source.id}`}
            className="card-interactive p-4 hover:outline-primary"
          >
            <h3 className="font-bold text-foreground">{source.title}</h3>
            <p className="text-sm text-muted-foreground">
              by {source.creator.username}
            </p>
            <p className="text-xs text-primary mt-1">
              {source.destination} • {source.duration_days} days
            </p>
          </Link>
        ))}
      </div>
    </div>

    {/* Info message */}
    <p className="text-sm text-muted-foreground">
      This itinerary was created using TripIt's AI Remix feature.
      Credit will be given to the original creators.
    </p>
  </div>
)}
```

---

#### 3. **Auto-add Tags**
```tsx
// In form submission handler
if (isRemix) {
  // Add special tag
  if (!activity_tags.includes('AI Generated')) {
    activity_tags.push('AI Generated');
  }

  // Ensure remix metadata is preserved
  formData.is_remixed = true;
  formData.remixed_from_ids = sourceItineraries.map(s => s.id);
}
```

---

## 🚀 Implementation Phases

### **Phase 1: Backend Foundation** (Day 1-2)
- [ ] Create database tables (migration script)
- [ ] Create backend models (RemixChatSession, RemixChatMessage)
- [ ] Build session CRUD endpoints
- [ ] Refactor AI service for chat-based interaction
- [ ] Test with Postman/curl

### **Phase 2: Chat UI Core** (Day 3-4)
- [ ] Build RemixChatModal component
- [ ] Create message display area
- [ ] Build chat input with send functionality
- [ ] Implement basic message sending/receiving
- [ ] Add loading states

### **Phase 3: Session Management** (Day 5)
- [ ] Build sidebar with sessions list
- [ ] Implement session creation
- [ ] Add session switching
- [ ] Implement session deletion/archiving
- [ ] Auto-generate session titles

### **Phase 4: Itinerary Preview** (Day 6)
- [ ] Build preview panel component
- [ ] Show current draft state
- [ ] Update preview on new messages
- [ ] Add expand/collapse for mobile

### **Phase 5: Publish Integration** (Day 7)
- [ ] Add finalize endpoint
- [ ] Implement "Save & Publish" button
- [ ] Update Publish.tsx to accept prefill data
- [ ] Add Inspirations section
- [ ] Add "Generated with TripIt" badge
- [ ] Test full flow

### **Phase 6: Polish & Testing** (Day 8)
- [ ] Add animations and transitions
- [ ] Implement error handling
- [ ] Add retry logic
- [ ] Mobile responsive testing
- [ ] Cross-browser testing
- [ ] Performance optimization

---

## 🎨 UI Component Specifications

### RemixChatModal.tsx
```tsx
interface RemixChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItineraryIds: string[];
  initialMessage?: string;
}

const RemixChatModal: FC<RemixChatModalProps> = ({...}) => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh]">
        <div className="flex h-full">
          <RemixChatSidebar />
          <div className="flex-1 flex flex-col">
            <RemixChatHeader />
            <RemixChatMessages />
            <RemixChatInput />
          </div>
          <RemixItineraryPreview />
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### RemixChatMessages.tsx
```tsx
const RemixChatMessages: FC = () => {
  const messages = useRemixMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map(msg => (
        <RemixMessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
```

### RemixChatInput.tsx
```tsx
const RemixChatInput: FC = () => {
  const [input, setInput] = useState('');
  const { sendMessage, isLoading } = useRemixChat();

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  return (
    <div className="border-t-4 border-black p-4">
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe changes you'd like..."
          className="flex-1 resize-none rounded-[15px] border-2 border-black p-3"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="btn-primary self-end"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : 'Send'}
        </button>
      </div>
    </div>
  );
};
```

---

## 📊 Example Chat Flow

```
[System Message - Auto-generated on session start]
"I've analyzed these itineraries:
1. Himalayan Trek (8 days, $2000)
2. Goa Beach Retreat (5 days, $800)

I've created an initial plan combining both. What would you like to adjust?"

[User]
"I only have 7 days total and want to spend more time in mountains"

[Assistant]
"I've updated the itinerary to 7 days with 5 days in Himalayas and 2 days
in Goa. Budget is now $1750. Daily breakdown:
- Days 1-5: Trek + Manali sightseeing
- Days 6-7: Beach relaxation in Goa
Want me to adjust anything?"

[User]
"Can you reduce budget to $1500 and add more local food experiences?"

[Assistant]
"Updated! Reduced to $1480 by:
- Budget accommodations (hostels/guesthouses)
- Local transport instead of private
- Added 5 local food experiences (included in daily plans)
Check the preview on the right!"

[User]
"Perfect! This looks great."

[User clicks "Save & Publish"]
```

---

## ⚠️ Important Considerations

### 1. **Token Costs**
- Each chat message = API call to OpenAI
- Estimate: ~1500-2000 tokens per exchange
- Cost: ~$0.003 per message with gpt-4o-mini
- 20 messages = ~$0.06 (acceptable for user value)

### 2. **Rate Limiting**
Implement per-user limits:
- Max 3 active sessions
- Max 50 messages per session
- Max 10 sessions per day

### 3. **Session Cleanup**
- Auto-archive sessions after 30 days of inactivity
- Delete archived sessions after 90 days
- Keep finalized sessions indefinitely

### 4. **Error Handling**
- Network failures: Retry with exponential backoff
- AI failures: Show error + retry button
- Session conflicts: Lock session during updates

---

## ✅ Success Metrics

### User Experience:
- [ ] Users can create and manage multiple chat sessions
- [ ] Messages appear within 1 second
- [ ] AI responses within 10 seconds
- [ ] Preview updates immediately
- [ ] Publish form pre-fills 100% correctly
- [ ] Mobile experience is smooth

### Technical:
- [ ] 99% API uptime
- [ ] <500ms average response time (excluding AI)
- [ ] Zero data loss on session switching
- [ ] Proper error recovery
- [ ] All CRUD operations work flawlessly

---

## 📁 File Checklist

### Backend (New)
- [ ] `backend/models/remix_chat_session.py`
- [ ] `backend/models/remix_chat_message.py`
- [ ] `backend/routes/remix_chat.py` (or extend itineraries.py)
- [ ] `backend/migrations/add_remix_chat_tables.py`
- [ ] `backend/services/ai_analyzer.py` (modify existing)

### Frontend (New)
- [ ] `frontend/src/components/remix/RemixChatModal.tsx`
- [ ] `frontend/src/components/remix/RemixChatSidebar.tsx`
- [ ] `frontend/src/components/remix/RemixChatHeader.tsx`
- [ ] `frontend/src/components/remix/RemixChatMessages.tsx`
- [ ] `frontend/src/components/remix/RemixChatInput.tsx`
- [ ] `frontend/src/components/remix/RemixMessageBubble.tsx`
- [ ] `frontend/src/components/remix/RemixItineraryPreview.tsx`
- [ ] `frontend/src/components/remix/RemixSourceCards.tsx`
- [ ] `frontend/src/hooks/useRemixChat.ts`
- [ ] `frontend/src/hooks/useRemixSessions.ts`
- [ ] `frontend/src/stores/remixChatStore.ts` (optional)

### Frontend (Modified)
- [ ] `frontend/src/pages/RemixPage.tsx` - Change max selection to 3, open modal
- [ ] `frontend/src/pages/Publish.tsx` - Add prefill support + Inspirations section
- [ ] Delete `frontend/src/pages/RemixCreatePage.tsx`

---

## 🎯 Next Steps

1. **Review & Approve Plan** - Get user confirmation on approach
2. **Start Phase 1** - Database + backend endpoints
3. **Incremental Testing** - Test each phase before moving on
4. **Iterate** - Gather feedback and refine UX

---

**Ready to start implementation?** 🚀

Let me know if you want to:
- Adjust any part of the plan
- Add/remove features
- Change the technical approach
- Start building immediately
