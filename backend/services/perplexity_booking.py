import os
import requests
from datetime import datetime, date
from typing import Dict, List, Optional, Any
import json
import re

class PerplexityBookingService:
    """Service for searching flights, hotels, and activities using Perplexity API"""

    # USD to INR conversion rate (update periodically)
    USD_TO_INR = 90.14

    def __init__(self):
        self.api_key = os.getenv('PERPLEXITY_API_KEY')
        self.base_url = "https://api.perplexity.ai/chat/completions"
        self.model = "sonar"

        if not self.api_key:
            print("[Perplexity] WARNING: PERPLEXITY_API_KEY not found in environment variables")
            raise ValueError("PERPLEXITY_API_KEY not found in environment variables")

        print(f"[Perplexity] Initialized with API key: {self.api_key[:10]}...")

    def _make_request(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Make a request to Perplexity API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": messages
        }

        try:
            response = requests.post(self.base_url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Perplexity API error: {e}")
            raise

    def search_flights(
        self,
        departure_city: str,
        destination_city: str,
        departure_date: date,
        return_date: Optional[date],
        num_travelers: int,
        budget_preference: str
    ) -> List[Dict[str, Any]]:
        """Search for flight options using Perplexity"""

        date_str = departure_date.strftime("%Y-%m-%d")
        return_str = return_date.strftime("%Y-%m-%d") if return_date else ""

        trip_type = "round-trip" if return_date else "one-way"

        prompt = f"""Find actual, bookable flights from {departure_city} to {destination_city} for {num_travelers} traveler(s).
Departure: {date_str}
{"Return: " + return_str if return_date else "One-way trip"}
Budget: {budget_preference}

Please provide 3-5 REAL flight options with:
1. Airline name
2. Flight numbers
3. Departure time and arrival time
4. Duration
5. Number of stops
6. Approximate price per person (in USD)
7. Direct booking link (Google Flights, Kayak, Skyscanner, or airline website)

Format as JSON array with this structure:
[
  {{
    "airline": "Airline name",
    "flight_number": "XX123",
    "departure_time": "HH:MM",
    "arrival_time": "HH:MM",
    "duration": "Xh XXm",
    "stops": 0 or number,
    "price": 450.00,
    "booking_url": "https://..."
  }}
]

Only return the JSON array, nothing else."""

        messages = [
            {"role": "system", "content": "You are a travel booking assistant. Always return valid JSON arrays with real, current booking options."},
            {"role": "user", "content": prompt}
        ]

        try:
            response = self._make_request(messages)
            content = response['choices'][0]['message']['content']

            # Capture citations/sources if available
            citations = response.get('citations', [])

            # Extract JSON from response
            flights = self._extract_json(content)

            # Convert prices from USD to INR and add source citations
            if isinstance(flights, list):
                for flight in flights:
                    if 'price' in flight and isinstance(flight['price'], (int, float)):
                        flight['price'] = round(flight['price'] * self.USD_TO_INR, 2)
                    # Add source citations (for verification)
                    if citations:
                        flight['sources'] = citations[:2]  # Top 2 sources

            return flights if isinstance(flights, list) else []

        except Exception as e:
            print(f"Error searching flights: {e}")
            return []

    def search_hotels(
        self,
        city: str,
        check_in: date,
        check_out: date,
        num_travelers: int,
        budget_preference: str,
        search_variation: str = ""
    ) -> List[Dict[str, Any]]:
        """Search for hotel options using Perplexity"""

        check_in_str = check_in.strftime("%Y-%m-%d")
        check_out_str = check_out.strftime("%Y-%m-%d")
        nights = (check_out - check_in).days

        prompt = f"""Find actual, bookable hotels in {city} for {num_travelers} guest(s).
Check-in: {check_in_str}
Check-out: {check_out_str}
Nights: {nights}
Budget: {budget_preference}
{search_variation}

Please provide 4-6 REAL hotel options with:
1. Hotel name
2. Star rating (1-5)
3. Address
4. Amenities (list of key amenities)
5. Price per night (in USD)
6. Total price for the stay
7. Guest rating (out of 5)
8. Number of reviews
9. Direct booking link (Booking.com, Hotels.com, Expedia, or hotel website)
10. Coordinates (latitude, longitude) for map display

Format as JSON array:
[
  {{
    "name": "Hotel name",
    "star_rating": 4.5,
    "address": "Full address",
    "amenities": ["WiFi", "Pool", "Gym"],
    "price_per_night": 120.00,
    "total_price": 360.00,
    "rating": 4.7,
    "review_count": 1250,
    "booking_url": "https://...",
    "coordinates": {{"lat": 28.6139, "lng": 77.2090}}
  }}
]

Only return the JSON array."""

        messages = [
            {"role": "system", "content": "You are a travel booking assistant. Always return valid JSON arrays with real, current hotel options including exact coordinates."},
            {"role": "user", "content": prompt}
        ]

        try:
            response = self._make_request(messages)
            content = response['choices'][0]['message']['content']

            # Capture citations/sources if available
            citations = response.get('citations', [])

            # Extract JSON from response
            hotels = self._extract_json(content)

            # Convert prices from USD to INR and add source citations
            if isinstance(hotels, list):
                for hotel in hotels:
                    if 'price_per_night' in hotel and isinstance(hotel['price_per_night'], (int, float)):
                        hotel['price_per_night'] = round(hotel['price_per_night'] * self.USD_TO_INR, 2)
                    if 'total_price' in hotel and isinstance(hotel['total_price'], (int, float)):
                        hotel['total_price'] = round(hotel['total_price'] * self.USD_TO_INR, 2)
                    # Add source citations (for verification)
                    if citations:
                        hotel['sources'] = citations[:2]  # Top 2 sources

            return hotels if isinstance(hotels, list) else []

        except Exception as e:
            print(f"Error searching hotels: {e}")
            return []

    def search_activities(
        self,
        city: str,
        activities_from_itinerary: List[str],
        dates: List[date],
        num_travelers: int,
        search_variation: str = ""
    ) -> List[Dict[str, Any]]:
        """Search for bookable activities and experiences using Perplexity"""

        date_range = f"{dates[0].strftime('%Y-%m-%d')} to {dates[-1].strftime('%Y-%m-%d')}" if dates else "flexible dates"
        activities_list = ", ".join(activities_from_itinerary[:5])  # Top 5 activities

        prompt = f"""Find actual, bookable activities and experiences in {city} for {num_travelers} person(s).
Dates: {date_range}
Interested in: {activities_list}
{search_variation}

Please provide 5-8 REAL bookable activities/experiences with:
1. Activity name
2. Category (tour, experience, attraction, etc.)
3. Description (1-2 sentences)
4. Duration
5. Price per person (in USD)
6. Rating (out of 5)
7. Number of reviews
8. Booking link (Viator, GetYourGuide, Klook, or official website)

Format as JSON array:
[
  {{
    "name": "Activity name",
    "category": "Tour",
    "description": "Brief description",
    "duration": "3 hours",
    "price": 45.00,
    "rating": 4.8,
    "review_count": 890,
    "booking_url": "https://..."
  }}
]

Only return the JSON array."""

        messages = [
            {"role": "system", "content": "You are a travel booking assistant. Always return valid JSON arrays with real, bookable activities."},
            {"role": "user", "content": prompt}
        ]

        try:
            response = self._make_request(messages)
            content = response['choices'][0]['message']['content']

            # Capture citations/sources if available
            citations = response.get('citations', [])

            # Extract JSON from response
            activities = self._extract_json(content)

            # Convert prices from USD to INR and add source citations
            if isinstance(activities, list):
                for activity in activities:
                    if 'price' in activity and isinstance(activity['price'], (int, float)):
                        activity['price'] = round(activity['price'] * self.USD_TO_INR, 2)
                    # Add source citations (for verification)
                    if citations:
                        activity['sources'] = citations[:2]  # Top 2 sources

            return activities if isinstance(activities, list) else []

        except Exception as e:
            print(f"Error searching activities: {e}")
            return []

    def extract_travel_route(self, itinerary_data: Dict[str, Any]) -> List[str]:
        """
        Use LLM to intelligently extract the travel route (cities) from an itinerary.
        Returns a logical, ordered list of cities to visit.
        """
        # Build context from itinerary
        title = itinerary_data.get('title', '')
        destination = itinerary_data.get('destination', '')
        description = itinerary_data.get('description', '')
        day_plan = itinerary_data.get('day_by_day_plan', '')
        regions = itinerary_data.get('regions', [])

        prompt = f"""Analyze this travel itinerary and extract ONLY the actual cities that should be visited, in logical travel order.

Itinerary Title: {title}
Primary Destination: {destination}
Description: {description[:300]}...
Regions: {', '.join(regions) if regions else 'Not specified'}
Day Plan: {day_plan[:500]}...

IMPORTANT RULES:
1. Extract ONLY actual cities, NOT attractions, landmarks, or tourist spots (e.g., exclude temples, falls, markets, monuments)
2. Return cities in a LOGICAL travel order (no backtracking)
3. Maximum 3 cities for practical booking
4. If it's a single-city trip with day trips, return only that ONE city
5. Format as a JSON array of city names only

Examples:
- "Delhi → Agra → Jaipur" becomes ["Delhi", "Agra", "Jaipur"]
- "Manali with local attractions" becomes ["Manali"]
- "Himachal tour: Shimla, Manali, Dharamshala" becomes ["Shimla", "Manali", "Dharamshala"]

Return ONLY a JSON array like ["City1", "City2", "City3"] with NO explanation."""

        messages = [
            {"role": "system", "content": "You are a travel route analyzer. Return only JSON arrays with city names, nothing else."},
            {"role": "user", "content": prompt}
        ]

        try:
            response = self._make_request(messages)
            content = response['choices'][0]['message']['content']

            # Extract JSON array
            cities = self._extract_json(content)

            if isinstance(cities, list) and len(cities) > 0:
                # Clean and validate cities
                clean_cities = []
                for city in cities[:3]:  # Max 3 cities
                    if isinstance(city, str) and len(city) > 2:
                        clean_cities.append(city.strip())

                return clean_cities if clean_cities else [destination]
            else:
                return [destination]

        except Exception as e:
            print(f"Error extracting travel route with LLM: {e}")
            # Fallback to primary destination
            return [destination]

    def _extract_json(self, content: str) -> Any:
        """Extract JSON from Perplexity response"""
        # Try to find JSON array in the response
        try:
            # First try direct parse
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to find JSON array in markdown code blocks
            json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))

            # Try to find bare JSON array
            json_match = re.search(r'(\[.*?\])', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))

            print(f"Could not extract JSON from: {content}")
            return []


# Global instance (with safe initialization)
try:
    perplexity_booking_service = PerplexityBookingService()
    print("[Perplexity] Booking service initialized successfully")
except Exception as e:
    print(f"[Perplexity] ERROR: Failed to initialize booking service: {e}")
    perplexity_booking_service = None
