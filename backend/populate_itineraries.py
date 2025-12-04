"""
Populate database with diverse itineraries for testing feed functionality
"""
from app import app, db
from models.itinerary import Itinerary
from models.traveler import Traveler
from datetime import datetime, timedelta
import random

def populate_itineraries():
    """Add diverse itineraries covering different activity tags"""

    with app.app_context():
        # Get a traveler to assign as creator (use first available)
        traveler = Traveler.query.filter_by(is_active=True).first()
        if not traveler:
            print("No active traveler found. Creating one...")
            traveler = Traveler(
                username="admin",
                email="admin@tripit.com",
                password_hash="dummy",
                is_active=True
            )
            db.session.add(traveler)
            db.session.commit()

        traveler_id = traveler.id
        print(f"Using traveler: {traveler.username} (ID: {traveler_id})")

        # Define diverse itineraries
        itineraries_data = [
            {
                "title": "Scuba Diving in Andaman Islands",
                "tagline": "Crystal clear waters and vibrant coral reefs",
                "description": "Experience world-class scuba diving in Havelock Island with professional PADI instructors. Explore coral reefs, underwater caves, and encounter exotic marine life including sea turtles, rays, and colorful tropical fish.",
                "destination": "Havelock Island, Andaman",
                "country": "India",
                "duration_days": 5,
                "difficulty_level": "Medium",
                "travel_type": "Solo",
                "estimated_budget_min": 25000,
                "estimated_budget_max": 35000,
                "budget_currency": "INR",
                "activity_tags": ["Scuba Diving", "Beach", "Water Sports", "Snorkeling", "Photography", "Marine Life"],
                "travel_companions": [],
                "best_season": "November to May",
                "women_safe_certified": True,
                "screenshots": [
                    "https://images.unsplash.com/photo-1544551763-46a013bb70d5",
                    "https://images.unsplash.com/photo-1559827260-dc66d52bef19",
                    "https://images.unsplash.com/photo-1583212292454-1fe6229603b7"
                ],
                "trip_highlights": "PADI certified diving, Coral reef exploration, Night diving experience",
                "safety_tips": "Always dive with certified instructors, Check equipment before each dive, Follow depth and time limits",
                "proof_score": 85.5,
                "helpful_votes": random.randint(50, 200),
                "view_count": random.randint(500, 2000),
                "comment_count": random.randint(10, 50),
            },
            {
                "title": "Heritage Walk Through Old Delhi",
                "tagline": "Explore 400 years of Mughal architecture and culture",
                "description": "A guided walking tour through the narrow lanes of Old Delhi, exploring magnificent mosques, bustling markets, and hidden havelis. Experience authentic street food and learn about the rich history of the Mughal Empire.",
                "destination": "Old Delhi",
                "country": "India",
                "duration_days": 2,
                "difficulty_level": "Easy",
                "travel_type": "Group",
                "estimated_budget_min": 3000,
                "estimated_budget_max": 5000,
                "budget_currency": "INR",
                "activity_tags": ["Cultural Tourism", "Heritage", "Photography", "Street Food", "History", "Architecture", "Walking"],
                "travel_companions": [{"name": "Heritage Guide"}],
                "best_season": "October to March",
                "women_safe_certified": True,
                "screenshots": [
                    "https://images.unsplash.com/photo-1587474260584-136574528ed5",
                    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da",
                    "https://images.unsplash.com/photo-1596402184320-417e7178b2cd"
                ],
                "trip_highlights": "Jama Masjid visit, Chandni Chowk food tour, Red Fort exploration",
                "safety_tips": "Stay with your group, Keep valuables secure, Drink bottled water only",
                "proof_score": 78.0,
                "helpful_votes": random.randint(30, 150),
                "view_count": random.randint(400, 1500),
                "comment_count": random.randint(8, 40),
            },
            {
                "title": "Manali Digital Nomad Retreat",
                "tagline": "Work from the mountains with high-speed internet",
                "description": "Perfect coworking space in Manali with stunning mountain views, high-speed internet, and a community of like-minded digital nomads. Combine work with adventure activities on weekends including paragliding and trekking.",
                "destination": "Manali, Himachal Pradesh",
                "country": "India",
                "duration_days": 30,
                "difficulty_level": "Easy",
                "travel_type": "Solo",
                "estimated_budget_min": 30000,
                "estimated_budget_max": 45000,
                "budget_currency": "INR",
                "activity_tags": ["Digital Nomad", "Coworking", "Laptop", "Remote Work", "Mountain", "Trekking", "Paragliding"],
                "travel_companions": [],
                "best_season": "March to June",
                "women_safe_certified": True,
                "screenshots": [
                    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
                    "https://images.unsplash.com/photo-1606761568499-6d2451b23c66",
                    "https://images.unsplash.com/photo-1542831371-29b0f74f9713"
                ],
                "trip_highlights": "High-speed fiber internet, Mountain workspace, Networking events, Weekend adventures",
                "safety_tips": "Book accommodation with backup power, Carry power bank, Have offline maps downloaded",
                "proof_score": 82.0,
                "helpful_votes": random.randint(60, 220),
                "view_count": random.randint(600, 2500),
                "comment_count": random.randint(15, 60),
            },
            {
                "title": "Hampi Rock Climbing Adventure",
                "tagline": "World-class bouldering destination with ancient ruins",
                "description": "Experience the unique combination of rock climbing and history in Hampi. Scale granite boulders during the day and explore ancient Vijayanagara Empire ruins in the evening. Perfect for intermediate to advanced climbers.",
                "destination": "Hampi, Karnataka",
                "country": "India",
                "duration_days": 7,
                "difficulty_level": "Hard",
                "travel_type": "Group",
                "estimated_budget_min": 15000,
                "estimated_budget_max": 22000,
                "budget_currency": "INR",
                "activity_tags": ["Climbing", "Bouldering", "Heritage", "Photography", "Camping", "Adventure"],
                "travel_companions": [{"name": "Climbing Instructor"}, {"name": "Safety Guide"}],
                "best_season": "November to February",
                "women_safe_certified": True,
                "screenshots": [
                    "https://images.unsplash.com/photo-1522163182402-834f871fd851",
                    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4",
                    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4"
                ],
                "trip_highlights": "Professional climbing guides, Ancient temple exploration, Sunset bouldering sessions",
                "safety_tips": "Always climb with a partner, Use proper safety gear, Check weather conditions",
                "proof_score": 88.5,
                "helpful_votes": random.randint(40, 180),
                "view_count": random.randint(450, 1800),
                "comment_count": random.randint(12, 45),
            },
            {
                "title": "Kerala Backwaters Houseboat Experience",
                "tagline": "Serene waterways and traditional Kerala cuisine",
                "description": "Cruise through the tranquil backwaters of Alleppey on a traditional kettuvallam houseboat. Enjoy freshly prepared Kerala cuisine, watch village life along the waterways, and experience the unique ecosystem of the backwaters.",
                "destination": "Alleppey, Kerala",
                "country": "India",
                "duration_days": 3,
                "difficulty_level": "Easy",
                "travel_type": "Family",
                "estimated_budget_min": 20000,
                "estimated_budget_max": 30000,
                "budget_currency": "INR",
                "activity_tags": ["Beach", "Boat Cruise", "Cultural Tourism", "Photography", "Bird Watching", "Family Friendly"],
                "travel_companions": [{"name": "Family Members"}],
                "best_season": "September to March",
                "women_safe_certified": True,
                "screenshots": [
                    "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944",
                    "https://images.unsplash.com/photo-1596402184320-417e7178b2cd",
                    "https://images.unsplash.com/photo-1587474260584-136574528ed5"
                ],
                "trip_highlights": "Traditional houseboat stay, Fresh Kerala cuisine, Sunset cruise",
                "safety_tips": "Wear life jackets, Stay inside boat during navigation, Apply mosquito repellent",
                "proof_score": 80.0,
                "helpful_votes": random.randint(70, 250),
                "view_count": random.randint(700, 2800),
                "comment_count": random.randint(18, 70),
            },
            {
                "title": "Ladakh Motorcycle Expedition",
                "tagline": "Epic Himalayan roads and Buddhist monasteries",
                "description": "The ultimate motorcycle adventure through the highest motorable passes in the world. Ride through stunning landscapes, visit ancient Buddhist monasteries, and experience the unique culture of Ladakh. Suitable for experienced riders only.",
                "destination": "Leh-Ladakh",
                "country": "India",
                "duration_days": 12,
                "difficulty_level": "Expert",
                "travel_type": "Group",
                "estimated_budget_min": 45000,
                "estimated_budget_max": 65000,
                "budget_currency": "INR",
                "activity_tags": ["Motorcycle", "Adventure", "Mountain", "Camping", "Photography", "Cultural Tourism", "High Altitude"],
                "travel_companions": [{"name": "Ride Leader"}, {"name": "Support Vehicle Driver"}, {"name": "Mechanic"}],
                "best_season": "June to September",
                "women_safe_certified": False,
                "screenshots": [
                    "https://images.unsplash.com/photo-1544551763-46a013bb70d5",
                    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
                    "https://images.unsplash.com/photo-1559827260-dc66d52bef19"
                ],
                "trip_highlights": "Khardung La pass, Pangong Lake, Nubra Valley, Magnetic Hill",
                "safety_tips": "Acclimatize properly to high altitude, Carry oxygen cylinder, Ride in daylight only, Stay hydrated",
                "proof_score": 92.0,
                "helpful_votes": random.randint(100, 350),
                "view_count": random.randint(1000, 4000),
                "comment_count": random.randint(25, 90),
            },
            {
                "title": "Rishikesh Yoga & Meditation Retreat",
                "tagline": "Find inner peace by the banks of the Ganges",
                "description": "Immerse yourself in authentic yoga and meditation practices in the yoga capital of the world. Daily yoga sessions, meditation workshops, Ayurvedic meals, and spiritual teachings in a serene ashram environment.",
                "destination": "Rishikesh, Uttarakhand",
                "country": "India",
                "duration_days": 14,
                "difficulty_level": "Easy",
                "travel_type": "Solo",
                "estimated_budget_min": 25000,
                "estimated_budget_max": 35000,
                "budget_currency": "INR",
                "activity_tags": ["Yoga", "Meditation", "Wellness", "Spiritual", "River", "Photography", "Vegetarian"],
                "travel_companions": [],
                "best_season": "September to November, February to May",
                "women_safe_certified": True,
                "screenshots": [
                    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
                    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
                    "https://images.unsplash.com/photo-1588286840104-8957b019727f"
                ],
                "trip_highlights": "Daily yoga classes, Ganga Aarti ceremony, Sound healing sessions, Ayurvedic spa",
                "safety_tips": "Stay in registered ashrams, Inform family of location, Avoid river bathing in strong current areas",
                "proof_score": 86.0,
                "helpful_votes": random.randint(80, 280),
                "view_count": random.randint(800, 3000),
                "comment_count": random.randint(20, 75),
            },
            {
                "title": "Spiti Valley Winter Expedition",
                "tagline": "Experience the frozen desert and snow leopard territory",
                "description": "A challenging winter expedition to one of the most remote regions of India. Experience sub-zero temperatures, frozen waterfalls, snow-covered monasteries, and potentially spot the elusive snow leopard. Only for experienced winter trekkers.",
                "destination": "Spiti Valley, Himachal Pradesh",
                "country": "India",
                "duration_days": 10,
                "difficulty_level": "Expert",
                "travel_type": "Group",
                "estimated_budget_min": 35000,
                "estimated_budget_max": 50000,
                "budget_currency": "INR",
                "activity_tags": ["Trekking", "Winter Sports", "Photography", "Wildlife", "Mountain", "Camping", "Adventure", "High Altitude"],
                "travel_companions": [{"name": "Trek Leader"}, {"name": "Local Guide"}, {"name": "Cook"}],
                "best_season": "January to February",
                "women_safe_certified": True,
                "screenshots": [
                    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
                    "https://images.unsplash.com/photo-1519681393784-d120267933ba",
                    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4"
                ],
                "trip_highlights": "Key Monastery, Frozen Spiti River, Snow leopard tracking, Ice climbing",
                "safety_tips": "Proper winter gear essential, Emergency evacuation plan, Satellite phone recommended, Travel insurance mandatory",
                "proof_score": 94.5,
                "helpful_votes": random.randint(90, 320),
                "view_count": random.randint(900, 3500),
                "comment_count": random.randint(22, 85),
            }
        ]

        # Add each itinerary
        added_count = 0
        for data in itineraries_data:
            # Check if itinerary with same title exists
            existing = Itinerary.query.filter_by(title=data['title']).first()
            if existing:
                print(f"✓ Itinerary already exists: {data['title']}")
                continue

            # Create new itinerary
            itinerary = Itinerary(
                created_by_traveler_id=traveler_id,
                title=data['title'],
                tagline=data['tagline'],
                description=data['description'],
                destination=data['destination'],
                country=data.get('country'),
                duration_days=data['duration_days'],
                difficulty_level=data['difficulty_level'],
                travel_type=data['travel_type'],
                estimated_budget_min=data['estimated_budget_min'],
                estimated_budget_max=data['estimated_budget_max'],
                budget_currency=data['budget_currency'],
                activity_tags=data['activity_tags'],
                travel_companions=data['travel_companions'],
                best_season=data['best_season'],
                women_safe_certified=data['women_safe_certified'],
                screenshots=data.get('screenshots', []),
                trip_highlights=data.get('trip_highlights'),
                safety_tips=data.get('safety_tips'),
                proof_score=data.get('proof_score', 75.0),
                helpful_votes=data.get('helpful_votes', 0),
                view_count=data.get('view_count', 0),
                comment_count=data.get('comment_count', 0),
                is_published=True,
                is_featured=random.choice([True, False]),
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
            )

            db.session.add(itinerary)
            added_count += 1
            print(f"✓ Added: {data['title']}")

        # Commit all changes
        db.session.commit()

        # Print summary
        total_count = Itinerary.query.filter_by(is_published=True).count()
        print(f"\n{'='*60}")
        print(f"Successfully added {added_count} new itineraries")
        print(f"Total published itineraries: {total_count}")
        print(f"{'='*60}")

        # Show breakdown by activity tags
        print("\nActivity Tag Distribution:")
        all_itineraries = Itinerary.query.filter_by(is_published=True).all()
        tag_counts = {}
        for itin in all_itineraries:
            for tag in (itin.activity_tags or []):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

        for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:15]:
            print(f"  {tag}: {count}")

if __name__ == "__main__":
    populate_itineraries()
