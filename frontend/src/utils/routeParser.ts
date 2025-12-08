/**
 * Route Parser and Geocoding Utilities
 * Extracts locations from day-by-day plans using AI and geocodes them using Mapbox
 */

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2hyYXZhbjQ1IiwiYSI6ImNtaXgxZ3gwajAxeG4zZnF1ZWJpODRpOGQifQ.YT9XlUwsK8dLRAF-BjC54A';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface RouteWaypoint {
  day: number;
  location: string;
  lat: number;
  lng: number;
  description?: string;
}

/**
 * Parse day-by-day plan text to extract locations
 * Looks for patterns like:
 * - "Day 1: Location - Description"
 * - "Day 1 (Location): Description"
 * - "**Day 1 - Location**"
 */
export function parseDayByDayPlan(dayByDayText: string): Array<{ day: number; location: string; description: string }> {
  if (!dayByDayText) {
    console.log('[RouteParser] No day-by-day text provided');
    return [];
  }

  console.log('[RouteParser] Parsing text:', dayByDayText.substring(0, 300));

  const results: Array<{ day: number; location: string; description: string }> = [];

  // Split by lines
  const lines = dayByDayText.split('\n');
  console.log('[RouteParser] Total lines:', lines.length);

  let currentDay = 0;
  let currentLocation = '';
  let currentDescription = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pattern 1: "Day 1: Location - Description" or "Day 1 - Location - Description"
    const pattern1 = /^(?:\*\*)?Day\s+(\d+)(?:\*\*)?[\s:]+(?:\()?([^-:)]+)(?:\))?[\s:-]+(.+)$/i;
    const match1 = trimmed.match(pattern1);

    if (match1) {
      const [, dayNum, location, description] = match1;
      currentDay = parseInt(dayNum);
      currentLocation = location.trim();
      currentDescription = description.trim();

      results.push({
        day: currentDay,
        location: currentLocation,
        description: currentDescription
      });
      continue;
    }

    // Pattern 2: "Day 1 (Location):" followed by description on next lines
    const pattern2 = /^(?:\*\*)?Day\s+(\d+)\s*\(([^)]+)\)(?:\*\*)?:?\s*(.*)$/i;
    const match2 = trimmed.match(pattern2);

    if (match2) {
      const [, dayNum, location, description] = match2;
      currentDay = parseInt(dayNum);
      currentLocation = location.trim();
      currentDescription = description.trim();

      console.log('[RouteParser] Pattern 2 matched:', { day: currentDay, location: currentLocation });

      results.push({
        day: currentDay,
        location: currentLocation,
        description: currentDescription
      });
      continue;
    }

    // Pattern 3: "Day 1:" followed by location mention
    const pattern3 = /^(?:\*\*)?Day\s+(\d+)(?:\*\*)?:?\s+(.+)$/i;
    const match3 = trimmed.match(pattern3);

    if (match3) {
      const [, dayNum, content] = match3;
      currentDay = parseInt(dayNum);

      // Try to extract location from content - improved patterns
      // Look for location patterns and extract just the place name
      let location = null;

      // Try different extraction patterns in order of specificity

      // Pattern A: "Arrive in/at Location." or "Transfer to Location."
      const arrivePattern = content.match(/(?:arrive|transfer|travel|fly|drive|reach)\s+(?:in|at|to)\s+([A-Z][a-zA-Z\s]+?)(?:\s+and|\.|,|;|:)/i);
      if (arrivePattern) {
        location = arrivePattern[1].trim();
      }

      // Pattern B: "in/at Location," or "to Location."
      if (!location) {
        const inPattern = content.match(/(?:in|at|to|from)\s+([A-Z][a-zA-Z\s]+?)(?:\s+and|\.|,|;|:|\s+via|\s+for)/i);
        if (inPattern) {
          location = inPattern[1].trim();
        }
      }

      // Pattern C: First capitalized word sequence (as fallback)
      if (!location) {
        const capitalPattern = content.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/);
        if (capitalPattern) {
          location = capitalPattern[1].trim();
        }
      }

      if (location && location.length > 2) {
        // Final cleanup: remove any trailing action words
        location = location.replace(/\s+(and|with|for|including|featuring).*$/i, '').trim();

        currentLocation = location;
        currentDescription = content.trim();

        console.log('[RouteParser] Pattern 3 matched:', { day: currentDay, location: currentLocation, original: content.substring(0, 50) });

        results.push({
          day: currentDay,
          location: currentLocation,
          description: currentDescription
        });
      }
    }
  }

  console.log('[RouteParser] Parsed results:', results.length, 'locations found');
  return results;
}

/**
 * Geocode a location using Mapbox Geocoding API
 */
export async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedLocation = encodeURIComponent(location);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedLocation}.json?access_token=${MAPBOX_TOKEN}&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error for location:', location, error);
    return null;
  }
}

/**
 * Extract destination coordinates from text
 * Tries to get the main destination of the itinerary
 */
export async function geocodeDestination(destination: string): Promise<{ lat: number; lng: number } | null> {
  return geocodeLocation(destination);
}

/**
 * Use AI to extract clean location names from day-by-day plan
 */
async function aiExtractLocations(
  dayByDayText: string,
  destination: string
): Promise<Array<{ day: number; location: string; description: string }>> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('[RouteParser] No auth token, falling back to regex');
      return parseDayByDayPlan(dayByDayText);
    }

    console.log('[RouteParser] Using AI to extract locations...');

    const response = await fetch(`${API_URL}/api/route-map/extract-locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        day_by_day_plan: dayByDayText,
        destination: destination
      })
    });

    if (!response.ok) {
      console.log('[RouteParser] AI extraction failed, falling back to regex');
      return parseDayByDayPlan(dayByDayText);
    }

    const data = await response.json();

    if (data.status === 'success' && data.data?.waypoints) {
      console.log('[RouteParser] AI extracted locations:', data.data.waypoints);
      return data.data.waypoints;
    }

    return parseDayByDayPlan(dayByDayText);
  } catch (error) {
    console.error('[RouteParser] AI extraction error:', error);
    return parseDayByDayPlan(dayByDayText);
  }
}

/**
 * Process day-by-day plan and geocode all locations
 * Uses AI for location extraction, falls back to regex
 */
export async function parseAndGeocodeRoute(
  dayByDayText: string,
  destination: string
): Promise<RouteWaypoint[]> {
  const waypoints: RouteWaypoint[] = [];

  // Use AI to extract clean location names
  const parsedDays = await aiExtractLocations(dayByDayText, destination);

  console.log('[RouteParser] Parsed days:', parsedDays);

  if (parsedDays.length === 0) {
    // Fallback: Just geocode the destination
    const coords = await geocodeDestination(destination);
    if (coords) {
      waypoints.push({
        day: 1,
        location: destination,
        lat: coords.lat,
        lng: coords.lng,
        description: `Trip to ${destination}`
      });
    }
    return waypoints;
  }

  // Geocode each location (now with clean location names from AI)
  for (const dayData of parsedDays) {
    console.log(`[RouteParser] Geocoding Day ${dayData.day}: "${dayData.location}"`);

    const coords = await geocodeLocation(dayData.location);

    if (coords) {
      console.log(`[RouteParser] ✓ Geocoded "${dayData.location}" to:`, coords);
      waypoints.push({
        day: dayData.day,
        location: dayData.location,
        lat: coords.lat,
        lng: coords.lng,
        description: dayData.description
      });
    } else {
      console.log(`[RouteParser] ✗ Failed to geocode "${dayData.location}"`);
    }
  }

  // If no locations were geocoded, fallback to destination
  if (waypoints.length === 0) {
    const coords = await geocodeDestination(destination);
    if (coords) {
      waypoints.push({
        day: 1,
        location: destination,
        lat: coords.lat,
        lng: coords.lng,
        description: `Trip to ${destination}`
      });
    }
  }

  return waypoints;
}

/**
 * Get map bounds for a set of waypoints
 */
export function getRouteBounds(waypoints: RouteWaypoint[]): [[number, number], [number, number]] | null {
  if (waypoints.length === 0) return null;

  const lngs = waypoints.map(w => w.lng);
  const lats = waypoints.map(w => w.lat);

  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  return [
    [minLng, minLat],
    [maxLng, maxLat]
  ];
}
