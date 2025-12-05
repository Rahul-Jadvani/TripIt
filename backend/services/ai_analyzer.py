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
