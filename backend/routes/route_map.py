"""
Route Map API - Extract locations from day-by-day plans using AI
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import json
import os

route_map_bp = Blueprint('route_map', __name__)

# OpenAI client - initialized lazily
client = None
AI_AVAILABLE = False

def get_openai_client():
    """Get or create OpenAI client"""
    global client, AI_AVAILABLE
    if client is not None:
        return client, AI_AVAILABLE

    try:
        from openai import OpenAI
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            # Try to get from Flask config
            api_key = current_app.config.get('OPENAI_API_KEY')

        if api_key:
            client = OpenAI(api_key=api_key)
            AI_AVAILABLE = True
            print(f"[RouteMap] OpenAI client initialized successfully")
        else:
            print(f"[RouteMap] No OpenAI API key found")
            AI_AVAILABLE = False
    except Exception as e:
        print(f"[RouteMap] OpenAI not available: {e}")
        AI_AVAILABLE = False

    return client, AI_AVAILABLE


@route_map_bp.route('/extract-locations', methods=['POST'])
@jwt_required()
def extract_locations():
    """
    Extract clean location names from day-by-day plan text using AI.

    Request Body:
        day_by_day_plan: string - The day-by-day itinerary text
        destination: string - The main destination (for context)

    Returns:
        Array of { day: number, location: string, description: string }
    """
    try:
        data = request.get_json()
        day_by_day_plan = data.get('day_by_day_plan', '')
        destination = data.get('destination', '')

        if not day_by_day_plan:
            return jsonify({
                'status': 'error',
                'message': 'No day-by-day plan provided'
            }), 400

        # Get OpenAI client
        openai_client, ai_available = get_openai_client()

        if not ai_available:
            print(f"[RouteMap] AI not available, using fallback extraction")
            # Fallback to simple extraction
            waypoints = fallback_extract_locations(day_by_day_plan, destination)
            return jsonify({
                'status': 'success',
                'data': {
                    'waypoints': waypoints
                }
            })

        # Use AI to extract locations
        waypoints = ai_extract_locations(openai_client, day_by_day_plan, destination)

        return jsonify({
            'status': 'success',
            'data': {
                'waypoints': waypoints
            }
        })

    except Exception as e:
        print(f"[RouteMap] Error extracting locations: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


def ai_extract_locations(openai_client, day_by_day_plan: str, destination: str) -> list:
    """Use OpenAI to extract clean location names from day-by-day plan"""

    prompt = f"""Extract ALL the specific locations/cities/places visited on EACH DAY from this travel itinerary.

DESTINATION CONTEXT: {destination}

DAY-BY-DAY PLAN:
{day_by_day_plan}

CRITICAL INSTRUCTIONS:
1. Extract EVERY day mentioned (Day 1, Day 2, Day 3, etc.) as a SEPARATE entry
2. For each day, identify the main location/city/town being visited
3. Return ONLY the place name (city, town, landmark) - NOT activities or descriptions
4. Add country or state for clarity (e.g., "Leh, Ladakh, India" not just "Leh")
5. If multiple locations in one day, pick the PRIMARY location for that day
6. MUST return one entry per day - if there are 5 days, return 5 entries
7. Look for patterns like "Day 1:", "Day 2:", etc. to identify each day

EXAMPLE INPUT:
"Day 1: Arrive in Leh. Day 2: Visit Nubra Valley. Day 3: Explore Pangong Lake."

EXAMPLE OUTPUT:
[
  {{"day": 1, "location": "Leh, Ladakh, India", "brief": "Arrival and acclimatization"}},
  {{"day": 2, "location": "Nubra Valley, Ladakh, India", "brief": "Sand dunes exploration"}},
  {{"day": 3, "location": "Pangong Lake, Ladakh, India", "brief": "Lake visit"}}
]

Return ONLY a valid JSON array with ONE ENTRY PER DAY. No other text."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a travel location extractor. Extract specific place names from itineraries. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.3
        )

        content = response.choices[0].message.content.strip()

        print(f"[RouteMap] Raw AI response: {content[:500]}")

        # Clean up the response - remove markdown code blocks if present
        if content.startswith('```'):
            content = content.split('```')[1]
            if content.startswith('json'):
                content = content[4:]
        content = content.strip()

        waypoints = json.loads(content)

        print(f"[RouteMap] AI extracted {len(waypoints)} locations:")
        for wp in waypoints:
            print(f"  Day {wp.get('day')}: {wp.get('location')}")

        # Format for frontend
        result = []
        for wp in waypoints:
            result.append({
                'day': wp.get('day', 0),
                'location': wp.get('location', ''),
                'description': wp.get('brief', '')
            })

        return result

    except Exception as e:
        print(f"[RouteMap] AI extraction failed: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to simple extraction
        return fallback_extract_locations(day_by_day_plan, destination)


def fallback_extract_locations(day_by_day_plan: str, destination: str) -> list:
    """Smart regex-based fallback if AI is not available"""
    import re

    results = []

    print(f"[RouteMap] ========== FALLBACK EXTRACTION ==========")
    print(f"[RouteMap] Destination: {destination}")
    print(f"[RouteMap] Day-by-day plan length: {len(day_by_day_plan)} chars")
    print(f"[RouteMap] First 500 chars: {day_by_day_plan[:500]}")

    # Indian cities/locations for context detection
    indian_locations = [
        'hampi', 'rishikesh', 'leh', 'ladakh', 'manali', 'shimla', 'dharamshala',
        'varanasi', 'jaipur', 'udaipur', 'jodhpur', 'agra', 'delhi', 'mumbai',
        'goa', 'kerala', 'alleppey', 'kochi', 'munnar', 'ooty', 'mysore',
        'bangalore', 'hyderabad', 'chennai', 'pondicherry', 'darjeeling',
        'gangtok', 'shillong', 'guwahati', 'andaman', 'havelock', 'spiti',
        'kasol', 'mcleodganj', 'pushkar', 'ranthambore', 'khajuraho',
        'nubra', 'pangong', 'tso moriri', 'zanskar', 'srinagar', 'pahalgam',
        'kodaikanal', 'coorg', 'hampta', 'triund', 'kedarnath', 'badrinath'
    ]

    # Detect if this is an India trip
    is_india_trip = any(loc in destination.lower() for loc in indian_locations) or \
                    any(loc in day_by_day_plan.lower() for loc in indian_locations) or \
                    'india' in destination.lower()

    # Split text by "Day X" patterns
    day_segments = re.split(r'(?=Day\s+\d+)', day_by_day_plan, flags=re.IGNORECASE)

    print(f"[RouteMap] Found {len(day_segments)} day segments")

    for segment in day_segments:
        segment = segment.strip()
        if not segment:
            continue

        # Match "Day X:" pattern
        match = re.match(r'^Day\s+(\d+)[:\s]+(.+)', segment, re.IGNORECASE | re.DOTALL)
        if match:
            day_num = int(match.group(1))
            content = match.group(2).strip()

            # Take only text until next "Day" mention
            next_day = re.search(r'Day\s+\d+', content, re.IGNORECASE)
            if next_day:
                content = content[:next_day.start()].strip()

            # Try to extract location from various patterns
            location = None

            # Pattern 1: "Arrive in/at Location"
            loc_match = re.search(r'(?:arrive|transfer|travel|reach|depart|head)\s+(?:in|at|to|for)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|;|:|\s+and|\s+to|\s+for|\s+in\s+the)', content, re.IGNORECASE)
            if loc_match:
                location = loc_match.group(1).strip()

            # Pattern 2: "in/at/to Location" (more generic)
            if not location:
                loc_match = re.search(r'(?:in|at|to|explore|visit)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|;|:|\s+and|\s+via|\s+for|\s+in\s+the)', content, re.IGNORECASE)
                if loc_match:
                    location = loc_match.group(1).strip()

            # Pattern 3: Check for known Indian locations directly
            if not location and is_india_trip:
                for indian_loc in indian_locations:
                    if indian_loc in content.lower():
                        # Capitalize properly
                        location = indian_loc.title()
                        break

            # Pattern 4: First capitalized place-like words
            if not location:
                loc_match = re.search(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b', content)
                if loc_match:
                    candidate = loc_match.group(1).strip()
                    # Skip common non-location words
                    if candidate.lower() not in ['day', 'morning', 'evening', 'afternoon', 'night', 'full', 'enjoy', 'explore', 'visit', 'check', 'dinner', 'lunch', 'breakfast']:
                        location = candidate

            if location:
                # Clean up location - remove trailing action words
                location = re.sub(r'\s+(and|with|for|including|check|enjoy|explore|settle|morning|evening|the).*$', '', location, flags=re.IGNORECASE).strip()
                location = re.sub(r'^(the|a|an)\s+', '', location, flags=re.IGNORECASE).strip()

                # Add India context if needed
                if is_india_trip and ',' not in location and 'india' not in location.lower():
                    location = f"{location}, India"

                print(f"[RouteMap] Day {day_num}: extracted '{location}'")

                results.append({
                    'day': day_num,
                    'location': location,
                    'description': content[:150]
                })

    # If no results, try to split destination and use each part
    if not results and destination:
        # Split destination by common separators
        dest_parts = re.split(r'\s+and\s+|,\s*|\s*&\s*', destination)
        for i, part in enumerate(dest_parts):
            part = part.strip()
            if part:
                if is_india_trip and ',' not in part and 'india' not in part.lower():
                    part = f"{part}, India"
                results.append({
                    'day': i + 1,
                    'location': part,
                    'description': f'Visit to {part}'
                })

    print(f"[RouteMap] Fallback extracted {len(results)} locations: {[r['location'] for r in results]}")
    return results
