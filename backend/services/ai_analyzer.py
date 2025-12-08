"""
AI Analyzer Service - Real-time AI-based analysis for itineraries and snaps
Uses OpenAI to generate safety alerts, insights, recommendations, and warnings
"""
import json
import os
from typing import Dict, List, Optional
from openai import OpenAI
from flask import current_app


class AIAnalyzer:
    """
    AI service for analyzing travel content and generating real-time alerts
    """

    # Alert priority levels
    PRIORITY_CRITICAL = 'critical'  # Safety emergencies, immediate action required
    PRIORITY_HIGH = 'high'  # Important safety concerns
    PRIORITY_MEDIUM = 'medium'  # Useful insights and recommendations
    PRIORITY_LOW = 'low'  # General tips and suggestions

    # Alert types
    TYPE_SAFETY = 'safety'  # Safety warnings and alerts
    TYPE_INSIGHT = 'insight'  # Interesting facts and information
    TYPE_RECOMMENDATION = 'recommendation'  # Travel recommendations
    TYPE_WARNING = 'warning'  # Weather, political, natural disaster warnings
    TYPE_SUGGESTION = 'suggestion'  # Content improvement suggestions

    def __init__(self):
        """Initialize OpenAI client"""
        self.client = None
        try:
            api_key = current_app.config.get('OPENAI_API_KEY')
            if api_key:
                self.client = OpenAI(api_key=api_key)
                self.model = current_app.config.get('OPENAI_MODEL', 'gpt-4o-mini')
                self.max_tokens = current_app.config.get('OPENAI_MAX_TOKENS', 2000)
                self.temperature = current_app.config.get('OPENAI_TEMPERATURE', 0.3)
        except Exception as e:
            print(f"[AIAnalyzer] Failed to initialize OpenAI: {e}")

    def is_available(self) -> bool:
        """Check if AI analysis is available"""
        return self.client is not None

    def analyze_itinerary(self, itinerary_data: Dict) -> List[Dict]:
        """
        Analyze an itinerary and generate AI alerts

        Args:
            itinerary_data: Dictionary containing itinerary information

        Returns:
            List of alert dictionaries with type, priority, title, message
        """
        if not self.is_available():
            print("[AIAnalyzer] OpenAI not configured, skipping analysis")
            return []

        try:
            # Build comprehensive prompt for itinerary analysis
            prompt = self._build_itinerary_prompt(itinerary_data)

            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a travel safety and insights expert AI. Analyze travel itineraries and provide actionable alerts, safety warnings, insights, and recommendations. Always return valid JSON array format."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                response_format={"type": "json_object"}
            )

            # Parse response
            content = response.choices[0].message.content
            result = json.loads(content)

            # Extract alerts array
            alerts = result.get('alerts', [])

            print(f"[AIAnalyzer] Generated {len(alerts)} alerts for itinerary: {itinerary_data.get('title')}")
            return alerts

        except Exception as e:
            print(f"[AIAnalyzer] Error analyzing itinerary: {e}")
            import traceback
            traceback.print_exc()
            return []

    def analyze_snap(self, snap_data: Dict) -> List[Dict]:
        """
        Analyze a snap with GPT-4 VISION (sees actual image + caption)

        Args:
            snap_data: Dictionary containing snap information (requires image_url)

        Returns:
            List of alert dictionaries with type, priority, title, message
        """
        if not self.is_available():
            print("[AIAnalyzer] OpenAI not configured, skipping analysis")
            return []

        # Get image URL and caption
        image_url = snap_data.get('image_url', '').strip()
        caption = snap_data.get('caption', '').strip()
        location_name = snap_data.get('location_name', 'Unknown location')

        # REQUIRE image URL for vision analysis
        if not image_url:
            print(f"[AIAnalyzer] Skipping snap analysis - no image URL provided")
            return []

        print(f"[AIAnalyzer] 📍 Location: {location_name}")
        print(f"[AIAnalyzer] 🖼️  Image URL: {image_url}")
        print(f"[AIAnalyzer] 💬 Caption: {caption or '(none)'}")

        try:
            # Build vision-enabled prompt
            text_prompt = self._build_snap_vision_prompt(snap_data)

            # Call OpenAI Vision API (GPT-4 Vision)
            print(f"[AIAnalyzer] 🔍 Calling GPT-4 Vision API...")
            response = self.client.chat.completions.create(
                model="gpt-4o",  # GPT-4 Vision model (use gpt-4-vision-preview or gpt-4o)
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert AI that analyzes ALL types of images and provides helpful alerts. Analyze EVERYTHING - travel, infrastructure issues, daily life, road conditions, etc. Provide alerts for ANY content that could be useful to people in that location."
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": text_prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url,
                                    "detail": "low"  # Low detail for faster/cheaper analysis
                                }
                            }
                        ]
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )

            # Parse response
            content = response.choices[0].message.content

            # Try to extract JSON from response
            try:
                # Sometimes GPT-4 Vision returns JSON wrapped in markdown
                if '```json' in content:
                    content = content.split('```json')[1].split('```')[0].strip()
                elif '```' in content:
                    content = content.split('```')[1].split('```')[0].strip()

                result = json.loads(content)
                alerts = result.get('alerts', [])
            except json.JSONDecodeError:
                # If JSON parsing fails, treat as no alerts
                print(f"[AIAnalyzer] Could not parse JSON from vision response, skipping")
                return []

            print(f"[AIAnalyzer] ✅ Vision analyzed image, generated {len(alerts)} alerts for: {location_name}")
            return alerts

        except Exception as e:
            error_message = str(e)
            print(f"[AIAnalyzer] ❌ Error in vision analysis: {error_message}")

            # Check if it's an image access issue
            if 'url' in error_message.lower() or 'image' in error_message.lower() or '404' in error_message:
                print(f"[AIAnalyzer] 💡 Possible image access issue - IPFS URL may not be accessible to OpenAI")
                print(f"[AIAnalyzer] Image URL was: {image_url}")

            import traceback
            traceback.print_exc()
            # Return empty so fallback notification will be created
            return []

    def _build_itinerary_prompt(self, itinerary_data: Dict) -> str:
        """Build detailed prompt for itinerary analysis"""

        title = itinerary_data.get('title', 'Unknown')
        destination = itinerary_data.get('destination', 'Unknown')
        description = itinerary_data.get('description', '')
        duration_days = itinerary_data.get('duration_days', 'Unknown')
        budget_amount = itinerary_data.get('budget_amount', 'Not specified')
        budget_currency = itinerary_data.get('budget_currency', 'USD')
        difficulty_level = itinerary_data.get('difficulty_level', 'moderate')
        activity_tags = itinerary_data.get('activity_tags', [])
        best_season = itinerary_data.get('best_season', 'Not specified')
        women_safe_certified = itinerary_data.get('women_safe_certified', False)

        prompt = f"""
Analyze this travel itinerary and provide comprehensive alerts, insights, and recommendations:

**Itinerary Details:**
- Title: {title}
- Destination: {destination}
- Description: {description[:500] if description else 'Not provided'}
- Duration: {duration_days} days
- Budget: {budget_amount} {budget_currency}
- Difficulty: {difficulty_level}
- Activities: {', '.join(activity_tags) if activity_tags else 'None specified'}
- Best Season: {best_season}
- Women Safe Certified: {women_safe_certified}

**Analysis Required:**
1. **Safety Alerts** (CRITICAL/HIGH priority):
   - Current security situation at destination
   - Travel advisories or warnings
   - Health and vaccination requirements
   - Women safety considerations
   - Areas to avoid
   - Emergency contact information needs

2. **Weather & Natural Warnings** (HIGH/MEDIUM priority):
   - Weather conditions for current season
   - Natural disaster risks (earthquakes, floods, etc.)
   - Best/worst times to visit

3. **Budget Insights** (MEDIUM priority):
   - Is the budget realistic for the destination?
   - Cost-saving tips
   - Hidden costs to be aware of

4. **Travel Recommendations** (MEDIUM/LOW priority):
   - Similar destinations they might enjoy
   - Must-visit places in the area
   - Local experiences they shouldn't miss
   - Hidden gems nearby

5. **Suggestions** (LOW priority):
   - Missing information in itinerary
   - Better activity combinations
   - Optimal duration recommendations

**Output Format (STRICT JSON):**
Return a JSON object with an "alerts" array. Each alert must have:
- type: "safety" | "insight" | "recommendation" | "warning" | "suggestion"
- priority: "critical" | "high" | "medium" | "low"
- title: string (max 40 chars, SHORT and clear, like a news headline)
- message: string (detailed explanation with full context)
- send_email: boolean (true only for critical/high priority safety issues)

**IMPORTANT:**
- Provide ONLY 1-2 MOST CRITICAL alerts
- Prioritize safety warnings and essential insights
- Combine related information into single alerts
- Keep titles under 40 characters - be concise!

Example:
{{
  "alerts": [
    {{
      "type": "safety",
      "priority": "high",
      "title": "{destination} Travel Advisory",
      "message": "Current security situation requires caution. Check latest updates before travel and register with embassy. Avoid border areas and travel in groups.",
      "send_email": true
    }},
    {{
      "type": "insight",
      "priority": "medium",
      "title": "Best Season: April-June",
      "message": "Pleasant weather with temperatures 15-25°C. Avoid monsoon (July-Sept). Pack warm layers for evenings. Book accommodations in advance for peak season.",
      "send_email": true
    }}
  ]
}}

Provide MAXIMUM 2 alerts. Focus on most critical and actionable information only.
"""
        return prompt

    def _build_snap_vision_prompt(self, snap_data: Dict) -> str:
        """Build vision-enabled prompt for intelligent snap analysis with image"""

        caption = snap_data.get('caption', 'No caption provided')
        location_name = snap_data.get('location_name', 'Unknown location')
        city = snap_data.get('city', 'Unknown city')
        country = snap_data.get('country', 'Unknown country')

        prompt = f"""
**YOUR TASK:** Analyze this image and provide helpful alerts for ANYTHING you see.

**Image Context:**
- Caption: "{caption}"
- Location: {location_name}, {city}, {country}

**CRITICAL INSTRUCTIONS:**

1. **ANALYZE EVERYTHING**
   - Look at what's in the image
   - Provide alerts for ANY content (travel, infrastructure, daily life, etc.)
   - DO NOT skip anything - all content is valuable to local community

2. **WHAT TO ALERT ABOUT:**
   - **Potholes/Road damage:** Warn about infrastructure issues, suggest reporting to authorities
   - **Traffic jams:** Provide alternative routes, best times to travel, traffic patterns
   - **Scenic views:** Travel insights, best times to visit, photography tips
   - **Food/Restaurants:** Recommendations, popular dishes, pricing
   - **Infrastructure issues:** Report to authorities, workarounds, safety concerns
   - **Residential issues:** Community awareness, local authority contact info
   - **Office/Work areas:** Area safety, parking, nearby amenities
   - **ANY content:** If you see it, alert about it!

3. **EXAMPLES OF ALERTS TO PROVIDE:**
   - Pothole near house → "Infrastructure Alert: Report pothole to municipal authorities via app/helpline. Avoid this route, use parallel street."
   - Traffic near office → "Traffic Pattern: Peak hours 9-10 AM. Alternative route via [street name]. Carpooling recommended."
   - Home interior → "Safety Tips: Ensure fire safety, secure windows, install CCTV for security."
   - Parking lot → "Parking Info: Rates, availability, nearby alternatives, safety tips for parking."
   - Broken sidewalk → "Pedestrian Alert: Damaged sidewalk reported. Use opposite side, report to authorities."

4. **ALWAYS PROVIDE 1-2 ALERTS**
   - Never return empty alerts
   - Find something helpful to say about any image
   - Make it useful for people in that location

**Output Format (STRICT JSON):**
{{
  "alerts": [
    {{
      "type": "safety" | "insight" | "recommendation" | "warning" | "suggestion",
      "priority": "high" | "medium" | "low",
      "title": "Short title (max 40 chars)",
      "message": "Detailed helpful information with actionable advice",
      "send_email": true
    }}
  ]
}}

**IMPORTANT:** ALWAYS generate 1-2 alerts. Never return empty array. Every image has something useful to share!

Analyze the image now and provide helpful alerts!
"""
        return prompt

    def _build_snap_prompt(self, snap_data: Dict) -> str:
        """Build detailed prompt for snap analysis"""

        caption = snap_data.get('caption', 'No caption')
        location_name = snap_data.get('location_name', 'Unknown location')
        city = snap_data.get('city', 'Unknown city')
        country = snap_data.get('country', 'Unknown country')
        latitude = snap_data.get('latitude', 0)
        longitude = snap_data.get('longitude', 0)
        image_url = snap_data.get('image_url', '')

        prompt = f"""
CRITICAL INSTRUCTION: You MUST analyze based on the CAPTION content first. Location is secondary context.

**Snap Details:**
- Caption: "{caption}"
- Image URL: {image_url}
- Location: {location_name}, {city}, {country}

**ANALYSIS RULES:**
1. If caption describes specific content (pothole, traffic, scenery, food, etc.):
   - Analyze ONLY what's mentioned in the caption
   - Ignore generic location safety unless caption requests it
   - Focus on what the user is actually sharing

2. If caption is empty or generic ("No caption", "Photo", etc.):
   - DO NOT generate any alerts
   - Return empty alerts array
   - User didn't ask for location insights

3. If caption mentions travel tips, safety, or recommendations:
   - Then provide relevant location-based insights

**Examples:**
- Caption: "Pothole near my house" → NO ALERTS (not travel-related)
- Caption: "Bad road conditions" → NO ALERTS (unless asking for alternatives)
- Caption: "Beautiful sunset at Dal Lake" → Provide Dal Lake insights
- Caption: "Is this area safe for solo travel?" → Provide safety analysis
- Caption: "" (empty) → NO ALERTS

**What to Analyze:**
1. **Location Safety** (CRITICAL/HIGH priority):
   - Is this area currently safe for travelers?
   - Any recent incidents or alerts for this location?
   - Safety tips for this specific area
   - Women safety considerations

2. **Weather & Environmental** (HIGH/MEDIUM priority):
   - Current weather conditions
   - Natural disaster risks in this area
   - Best times to visit this location

3. **Local Insights** (MEDIUM priority):
   - Interesting facts about this location
   - Historical or cultural significance
   - Local customs travelers should know
   - Best times to visit (avoid crowds)

4. **Hidden Gems Nearby** (MEDIUM priority):
   - Lesser-known attractions within 5-10 km
   - Local food spots
   - Authentic experiences nearby

5. **Travel Tips** (LOW priority):
   - How to get around
   - Estimated time needed at this location
   - Entry fees or permits needed
   - Photography tips

**Output Format (STRICT JSON):**
Return a JSON object with an "alerts" array. Each alert must have:
- type: "safety" | "insight" | "recommendation" | "warning" | "suggestion"
- priority: "critical" | "high" | "medium" | "low"
- title: string (max 40 chars, SHORT like a news headline)
- message: string (detailed explanation with full context and specific recommendations)
- send_email: boolean (true only for critical/high priority safety issues)

**IMPORTANT:**
- Provide ONLY 1-2 MOST CRITICAL alerts
- Prioritize safety warnings and essential local insights
- Combine multiple tips into single comprehensive alerts
- Keep titles under 40 characters - be concise!

Example:
{{
  "alerts": [
    {{
      "type": "safety",
      "priority": "high",
      "title": "Safety Alert: {location_name}",
      "message": "Petty theft common in crowded areas. Keep valuables secure, avoid displaying cameras/jewelry. Stay in well-lit areas after dark. Use authorized taxis only.",
      "send_email": true
    }},
    {{
      "type": "recommendation",
      "priority": "medium",
      "title": "Local Gems & Tips",
      "message": "Try authentic cuisine at 'Cafe Heritage' (500m, best views). Visit early morning to avoid crowds. Entry fee: $5. Great for photography during sunset.",
      "send_email": true
    }}
  ]
}}

Provide MAXIMUM 2 alerts. Focus on most critical information for this specific location.
"""
        return prompt

    def remix_itineraries(self, itineraries_data: List[Dict], user_prompt: str) -> Optional[Dict]:
        """
        Remix multiple itineraries into one new itinerary using AI

        Args:
            itineraries_data: List of itinerary dictionaries to combine
            user_prompt: User's custom requirements and preferences

        Returns:
            Dictionary with remixed itinerary data or None if error
        """
        if not self.is_available():
            print("[AIAnalyzer] OpenAI not configured, cannot remix")
            return None

        if not itineraries_data or len(itineraries_data) < 1:
            print("[AIAnalyzer] Need at least 1 itinerary to remix")
            return None

        try:
            # Build comprehensive remix prompt
            prompt = self._build_remix_prompt(itineraries_data, user_prompt)

            print(f"[AIAnalyzer] 🎨 Remixing {len(itineraries_data)} itineraries...")
            print(f"[AIAnalyzer] 💬 User prompt: {user_prompt[:100]}...")

            # Use gpt-4o-mini for cost efficiency (per user's request)
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert AI travel planner that creates amazing itineraries by intelligently combining multiple travel plans. You understand budgets, logistics, activities, and create cohesive day-by-day plans."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=4000,
                temperature=0.7,  # Creative but coherent
                response_format={"type": "json_object"}
            )

            # Parse AI response
            content = response.choices[0].message.content
            result = json.loads(content)

            print(f"[AIAnalyzer] ✅ Successfully remixed: {result.get('title')}")
            return result

        except Exception as e:
            print(f"[AIAnalyzer] ❌ Error remixing: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _build_remix_prompt(self, itineraries_data: List[Dict], user_prompt: str) -> str:
        """Build detailed prompt for AI remix"""

        # Summarize each source itinerary
        itinerary_summaries = []
        for i, itin in enumerate(itineraries_data, 1):
            summary = f"""
**Source Itinerary {i}: "{itin.get('title', 'Untitled')}"**
- ID: {itin.get('id')}
- Destination: {itin.get('destination', 'Unknown')}
- Duration: {itin.get('duration_days', 'N/A')} days
- Budget: {itin.get('budget_amount', 'N/A')} {itin.get('budget_currency', 'INR')}
- Difficulty: {itin.get('difficulty_level', 'moderate')}
- Activities: {', '.join(itin.get('activity_tags', []))}
- Best Season: {itin.get('best_season', 'Any time')}
- Description: {itin.get('description', 'No description')[:200]}...
"""
            # Add daily plans summary
            daily_plans = itin.get('daily_plans', [])
            if daily_plans:
                summary += f"\n  Daily Plans ({len(daily_plans)} days):\n"
                for day in daily_plans[:3]:  # First 3 days as sample
                    summary += f"  - Day {day.get('day_number')}: {day.get('title')} - {day.get('description', '')[:80]}...\n"

            itinerary_summaries.append(summary)

        prompt = f"""
You are remixing {len(itineraries_data)} travel itineraries into ONE amazing new itinerary.

**SOURCE ITINERARIES:**
{''.join(itinerary_summaries)}

**USER'S REQUIREMENTS:**
{user_prompt}

**YOUR TASK:**
1. Analyze all source itineraries and extract the best elements
2. Apply user's requirements (duration, budget, activities, etc.)
3. Combine destinations in a logical geographic flow
4. Create detailed day-by-day plans
5. Generate a cohesive, realistic itinerary

**IMPORTANT RULES:**
- If user specifies duration, use that exactly
- If user specifies budget, stay within it (add 10-15% buffer)
- Combine similar activities to avoid repetition
- Ensure daily plans are realistic (travel time, rest, etc.)
- Create a compelling title that captures the essence
- Write engaging description (200-400 words)
- Include detailed daily plans with activities and costs

**OUTPUT FORMAT (STRICT JSON):**
{{
  "title": "Exciting title for remixed itinerary",
  "destination": "Main destination or route",
  "description": "200-400 word engaging description",
  "duration_days": <number>,
  "budget_amount": <total budget number>,
  "budget_currency": "INR" or "USD",
  "difficulty_level": "easy" | "moderate" | "challenging" | "extreme",
  "activity_tags": ["tag1", "tag2", "tag3"],
  "best_season": "Best time to do this trip",
  "accommodation_type": "hotels" | "hostels" | "camping" | "homestays" | "mixed",
  "transport_modes": ["flight", "car", "train", "trekking"],
  "daily_plans": [
    {{
      "day_number": 1,
      "title": "Day 1 title",
      "description": "Detailed 150-300 word plan for the day",
      "activities": ["activity1", "activity2"],
      "start_point": "Starting location",
      "end_point": "Ending location",
      "distance_km": <distance in km>,
      "estimated_duration_hours": <hours>
    }}
  ],
  "packing_list": ["item1", "item2"],
  "important_notes": ["note1", "note2"],
  "remixed_from_ids": [{', '.join([f'"{itin.get("id")}"' for itin in itineraries_data if itin.get("id")])}]
}}

Return ONLY valid JSON. Make this itinerary exciting and practical!
"""
        return prompt

    def start_remix_chat(self, itineraries_data: List[Dict], initial_message: str) -> Optional[Dict]:
        """
        Start a chat-based remix conversation

        Args:
            itineraries_data: List of source itinerary dictionaries
            initial_message: User's initial message/requirements

        Returns:
            Dict with AI greeting message and initial draft
        """
        if not self.is_available():
            print("[AIAnalyzer] OpenAI not configured")
            return None

        try:
            # Build system prompt with itinerary context
            system_prompt = self._build_chat_system_prompt(itineraries_data)

            print(f"[AIAnalyzer] 🎨 Starting remix chat with {len(itineraries_data)} itineraries...")

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": initial_message}
                ],
                max_tokens=3000,
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            print(f"[AIAnalyzer] ✅ Chat started successfully")
            return result

        except Exception as e:
            print(f"[AIAnalyzer] ❌ Error starting chat: {e}")
            import traceback
            traceback.print_exc()
            return None

    def continue_remix_chat(self, itineraries_data: List[Dict], chat_history: List[Dict],
                           user_message: str, current_draft: Optional[Dict]) -> Optional[Dict]:
        """
        Continue an existing remix chat conversation

        Args:
            itineraries_data: Source itineraries
            chat_history: Previous conversation messages
            user_message: User's latest message
            current_draft: Current itinerary draft state

        Returns:
            Dict with AI response and updated draft
        """
        if not self.is_available():
            return None

        try:
            # Build system prompt
            system_prompt = self._build_chat_system_prompt(itineraries_data, current_draft)

            # Build messages array
            messages = [{"role": "system", "content": system_prompt}]

            # Add chat history (last 10 messages for context)
            for msg in chat_history[-10:]:
                messages.append({
                    "role": msg['role'],
                    "content": msg['content']
                })

            # Add new user message
            messages.append({"role": "user", "content": user_message})

            print(f"[AIAnalyzer] 💬 Continuing chat (history: {len(chat_history)} msgs)...")

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=3000,
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            print(f"[AIAnalyzer] ✅ Chat response generated")
            return result

        except Exception as e:
            print(f"[AIAnalyzer] ❌ Error continuing chat: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _build_chat_system_prompt(self, itineraries_data: List[Dict],
                                  current_draft: Optional[Dict] = None) -> str:
        """Build system prompt for chat-based remix"""

        # Summarize source itineraries
        itinerary_summaries = []
        for i, itin in enumerate(itineraries_data, 1):
            summary = f"""
**Source Itinerary {i}: "{itin.get('title', 'Untitled')}"**
- Destination: {itin.get('destination', 'Unknown')}
- Duration: {itin.get('duration_days', 'N/A')} days
- Budget: {itin.get('budget_amount', 'N/A')} {itin.get('budget_currency', 'USD')}
- Activities: {', '.join(itin.get('activity_tags', [])[:5])}
- Highlights: {itin.get('trip_highlights', 'N/A')[:200]}
"""
            # Add sample daily plans
            daily_plans = itin.get('daily_plans', [])
            if daily_plans:
                summary += f"  First 2 days:\n"
                for day in daily_plans[:2]:
                    summary += f"  - Day {day.get('day_number')}: {day.get('title', '')}\n"

            itinerary_summaries.append(summary)

        # Current draft context
        draft_context = ""
        if current_draft:
            draft_context = f"""

**CURRENT DRAFT STATE:**
- Title: {current_draft.get('title', 'Untitled')}
- Destination: {current_draft.get('destination', 'TBD')}
- Duration: {current_draft.get('duration_days', 'TBD')} days
- Budget: {current_draft.get('budget_amount', 'TBD')} {current_draft.get('budget_currency', 'USD')}
- Activities: {', '.join(current_draft.get('activity_tags', []))}
- Description: {current_draft.get('description', '')[:200]}

The user may want to modify this draft. Update the relevant fields based on their feedback.
"""

        prompt = f"""You are TripIt AI, an expert travel planning assistant helping users create perfect itineraries through conversation.

**SOURCE ITINERARIES YOU'RE WORKING WITH:**
{''.join(itinerary_summaries)}
{draft_context}

**YOUR ROLE:**
- Help users iteratively refine their dream trip
- Be conversational, friendly, and enthusiastic
- Make helpful suggestions based on the source itineraries
- Ask clarifying questions when needed
- Update the itinerary draft with each message
- Be practical about budgets, durations, and logistics

**RESPONSE FORMAT (STRICT JSON):**
{{
  "message": "Your conversational response to the user (2-4 sentences, friendly tone)",
  "draft_itinerary": {{
    "title": "Trip title",
    "destination": "Main destination",
    "description": "300-500 word engaging description covering what makes this trip special, what travelers will experience, and who it's perfect for",
    "duration_days": <number>,
    "budget_amount": <number - MUST be a valid number, never null or 0>,
    "budget_currency": "USD" | "INR",
    "difficulty_level": "easy" | "moderate" | "challenging" | "extreme",
    "activity_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "categories": ["Adventure", "Cultural", "Beach", "Family"],
    "best_season": "Best time to visit (2-3 sentences with reasons)",
    "trip_highlights": "200-300 word detailed paragraph about key highlights, unique experiences, must-see attractions, and what makes this trip unforgettable",
    "trip_journey": "200-300 word detailed narrative about the journey flow, how destinations connect, travel modes, and the overall experience arc",
    "hidden_gems": "150-250 word paragraph about lesser-known spots, local experiences, and off-the-beaten-path recommendations",
    "unique_highlights": "150-250 word paragraph about what makes this trip unique compared to typical tours - special access, unusual routes, authentic experiences",
    "day_by_day_plan": "Comprehensive day-by-day breakdown. Format: **Day 1 (Location Name):** Description with 100-150 words describing activities, timings, meals, and travel. Start each day with 'Day X (City/Location):' for route mapping.",
    "safety_tips": "150-200 word detailed safety information including health precautions, local customs, emergency contacts, and travel advisories",
    "packing_list": ["item1", "item2", "item3", "item4", "item5"],
    "important_notes": ["note1", "note2", "note3"]
  }}
}}

**CRITICAL REQUIREMENTS:**
- ALWAYS set budget_amount to a valid number (never 0, null, or NaN)
- Calculate realistic budget based on duration and activities
- Make ALL text fields detailed and informative (200-500 words)
- Include 5-7 activity tags covering all trip aspects
- Write engaging, detailed descriptions that help travelers visualize the experience
- Keep your conversational message brief (2-4 sentences)
- Update ALL fields in draft_itinerary with each response
- If user asks for changes, apply them to the draft
- Be realistic about costs and logistics
- Always return valid JSON

Return ONLY valid JSON. No additional text outside the JSON structure.
"""

        return prompt

    def test_connection(self) -> Dict:
        """Test AI service connection"""
        if not self.is_available():
            return {
                'connected': False,
                'error': 'OpenAI API key not configured'
            }

        try:
            # Simple test call
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": "Say 'connected' if you can read this."}
                ],
                max_tokens=10
            )

            return {
                'connected': True,
                'model': self.model,
                'response': response.choices[0].message.content
            }
        except Exception as e:
            return {
                'connected': False,
                'error': str(e)
            }
