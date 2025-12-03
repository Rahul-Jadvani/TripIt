"""
Populate sample itineraries with extended trip details
"""
import os
import sys
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Sample itinerary data
sample_itineraries = [
    {
        'title': 'Solo Trek to Kedarkantha Peak',
        'tagline': 'Winter wonderland adventure in the Himalayas',
        'description': 'An unforgettable solo winter trek to Kedarkantha Peak (3,800m) through snow-covered trails, pine forests, and breathtaking mountain vistas.',
        'destination': 'Kedarkantha, Uttarakhand',
        'country': 'India',
        'state_province': 'Uttarakhand',
        'duration_days': 6,
        'budget_amount': 15000,
        'budget_currency': 'INR',
        'difficulty_level': 'Medium',
        'travel_style': 'Solo',
        'best_season': 'December to April',
        'activity_tags': ['Trekking', 'Winter Sports', 'Photography', 'Mountain Camping', 'First Aid Kit', 'Crampons', 'Ice Axe'],
        'trip_highlights': '''🏔️ Summit Success at 3,800m
⛺ Camping under starlit skies at -10°C
🌲 Walking through enchanting pine forests covered in snow
🌅 360° panoramic views of Himalayan peaks
📸 Captured rare wildlife including Himalayan Monal birds''',
        'trip_journey': '''Day 0: Reached Dehradun by overnight train from Delhi. Met fellow trekkers at the base camp.
Day 1: Drive to Sankri village (6,400 ft), acclimatization walk around the village
Day 2: Trek to Juda Ka Talab (9,100 ft) - 4km through oak and pine forests
Day 3: Trek to Kedarkantha Base Camp (11,250 ft) - witnessed the most stunning sunset
Day 4: Summit push at 3 AM, reached Kedarkantha Peak at sunrise, descended to Hargaon Camp
Day 5: Trek back to Sankri, celebrated with local Garhwali food
Day 6: Return journey to Dehradun''',
        'day_by_day_plan': '''📅 Day 1: Dehradun → Sankri (220 km, 8 hrs)
- 6 AM: Start from Dehradun
- 2 PM: Reach Sankri, check into homestay
- 4 PM: Village exploration and acclimatization walk
- 7 PM: Dinner and trek briefing

📅 Day 2: Sankri → Juda Ka Talab (4 km trek, 4-5 hrs)
- 7 AM: Breakfast and pack lunch
- 8 AM: Begin trek through oak forests
- 12 PM: Reach Juda Ka Talab campsite
- 1 PM: Lunch and rest
- 4 PM: Explore the frozen lake
- 7 PM: Dinner around campfire

📅 Day 3: Juda Ka Talab → Base Camp (4 km, 4 hrs)
- 7 AM: Early breakfast
- 8 AM: Trek through pine forests
- 12 PM: Reach Kedarkantha Base Camp
- 2 PM: Lunch and rest for summit day
- 6 PM: Early dinner and sleep by 8 PM

📅 Day 4: Base Camp → Summit → Hargaon (6 km, 8-9 hrs)
- 3 AM: Wake up, light snacks
- 3:30 AM: Begin summit push
- 6:30 AM: Reach Kedarkantha Peak at sunrise
- 10 AM: Descend to base camp for breakfast
- 12 PM: Continue descent to Hargaon Camp
- 6 PM: Dinner and celebration

📅 Day 5: Hargaon → Sankri (6 km, 4 hrs)
- 8 AM: Breakfast
- 9 AM: Final descent to Sankri
- 1 PM: Reach Sankri, lunch at local dhaba
- 3 PM: Rest and pack
- 7 PM: Farewell dinner with local family

📅 Day 6: Sankri → Dehradun
- 7 AM: Breakfast and departure
- 3 PM: Reach Dehradun''',
        'safety_intelligence': '''⚠️ ALTITUDE SICKNESS RISK: Medium
- Acclimatize properly at Sankri for at least 6 hours
- Watch for symptoms: headache, nausea, dizziness
- Carry Diamox tablets (consult doctor first)

❄️ WEATHER HAZARDS:
- Temperature drops to -15°C at night in December-January
- Sudden snowstorms possible - carried emergency shelter
- Trail becomes icy after 10,000 ft - used microspikes

🐻 WILDLIFE ENCOUNTERS:
- Black bears spotted near Juda Ka Talab (rare in winter)
- Keep food sealed in bear bags
- Travel in groups through forest sections

📱 CONNECTIVITY:
- Last mobile network at Sankri (BSNL works best)
- No network during trek - carried satellite phone for emergencies
- Informed local authorities about trek plan

💊 MEDICAL PREPAREDNESS:
- Nearest hospital: Uttarkashi (90 km from Sankri)
- Carried comprehensive first aid kit
- Trek leader was wilderness first aid certified''',
        'hidden_gems': '''🏡 Govind Guest House, Sankri
- Family-run homestay with authentic Garhwali meals
- Owner Uncle Govind shared amazing local folklore
- Hot water bottles provided for cold nights
- Cost: ₹800/night including meals
- Contact: +91-XXXXXXXXXX

🍲 Himalayan Dhaba, Sankri
- Best rajma chawal and maggi point before trek
- Run by local women's cooperative
- Proceeds support village school
- Must-try: Sidu (local bread) with ghee

⛺ Camp Himalaya Equipment Rentals
- High-quality gear at 50% cheaper than Dehradun
- Owner Rakesh offers free gear inspection
- Rented: -20°C sleeping bag, gaiters, trekking poles
- Total cost: ₹1,200 for 6 days

📸 Secret Photography Spots:
- Sunrise at Juda Ka Talab (5:30 AM)
- Moonrise over base camp (7 PM)
- 360° peak shots from Kedarkantha summit

🎁 Local Shopping:
- Handmade woolen socks and caps at Sankri market
- Pure honey from local beekeepers
- Rhododendron juice (local specialty)''',
        'unique_highlights': '''✨ WHAT MADE THIS TREK SPECIAL:

🌟 Solo Female Trekker Achievement
- Completed the trek independently as a solo female traveler
- Met inspiring women trekkers from 5 different countries
- Proved that solo adventure travel in India is safe with proper planning

🎨 Cultural Immersion
- Participated in a local Garhwali wedding at Sankri
- Learned traditional folk songs from village elders
- Stayed with local families who shared incredible mountain wisdom

🌌 Astrophotography Paradise
- Zero light pollution - captured Milky Way from base camp
- Witnessed Geminid meteor shower (December)
- Shot long-exposure photos with Himalayan peaks

🏆 Personal Milestone
- First high-altitude trek above 3,500m
- Overcame fear of heights
- Lost 4 kg and gained immense confidence

📚 Journaling & Reflection
- Maintained a detailed trek journal with sketches
- Practiced meditation at sunrise facing the peaks
- Digital detox for 5 days - life-changing experience''',
        'safety_tips': '''✅ PRE-TREK PREPARATION:
- Start cardio training 4 weeks before (30 min daily)
- Practice walking with weighted backpack (5-7 kg)
- Get tetanus and flu shots
- Inform family/friends about trek schedule

🎒 ESSENTIAL GEAR CHECKLIST:
- Layered clothing: thermal + fleece + waterproof jacket
- Insulated trekking boots (broken in before trek)
- Gaiters and microspikes for snow
- Sunglasses with UV protection + sunscreen (SPF 50+)
- Headlamp with extra batteries
- Water bottles with insulation covers

💊 MEDICAL KIT MUST-HAVES:
- Diamox for altitude sickness
- ORS packets for dehydration
- Pain relievers and anti-inflammatory meds
- Bandages, antiseptic, blister treatment
- Personal prescription medications

🌡️ STAYING WARM:
- Wear moisture-wicking base layers (avoid cotton)
- Keep head, hands, feet covered at all times
- Use hot water bottles in sleeping bag
- Eat high-calorie foods to maintain body heat

💧 HYDRATION:
- Drink 4-5 liters of water daily
- Carry water purification tablets
- Avoid alcohol and caffeine at high altitude

📱 EMERGENCY CONTACTS:
- Trek operator: [Number]
- Local police (Sankri): 01370-266100
- Uttarkashi District Hospital: 01374-222180
- Emergency helicopter rescue: Dial 112

👥 WOMEN SAFETY TIPS:
- Trek with registered operators (I used Indiahikes)
- Share live location with family (when network available)
- Trust your instincts, choose mixed-gender groups
- Local communities are very respectful and helpful''',
        'screenshots': []
    },
    {
        'title': 'Backpacking Through Rajasthan',
        'tagline': 'A colorful journey through the desert state',
        'description': 'Two weeks exploring the vibrant cities, desert landscapes, and rich cultural heritage of Rajasthan on a budget.',
        'destination': 'Rajasthan',
        'country': 'India',
        'state_province': 'Rajasthan',
        'duration_days': 14,
        'budget_amount': 25000,
        'budget_currency': 'INR',
        'difficulty_level': 'Easy',
        'travel_style': 'Solo Backpacking',
        'best_season': 'October to March',
        'activity_tags': ['Backpacking', 'Cultural Tourism', 'Photography', 'Desert Safari', 'Street Food', 'First Aid Kit', 'Sunscreen'],
        'trip_highlights': '''🏰 Explored 5 magnificent forts and palaces
🐪 Camel safari in Thar Desert under starlit sky
🎨 Attended traditional Rajasthani folk performance
🍛 Tasted authentic dal baati churma and laal maas
📸 Photographed colorful bazaars and haveli architecture''',
        'trip_journey': '''Started in Jaipur (Pink City) exploring Amber Fort and City Palace. Took overnight bus to Jodhpur to see the magnificent Mehrangarh Fort. Spent magical evening watching sunset from the fort ramparts. Journey continued to Jaisalmer for a 2-day desert safari experience. Rode camels into the Sam Sand Dunes and slept under the stars. Explored the golden sandstone architecture of Jaisalmer Fort. Traveled to Udaipur (City of Lakes) and fell in love with Lake Pichola. Ended the trip in Pushkar during the famous camel fair - an unforgettable cultural experience.''',
        'day_by_day_plan': '''Day 1-3: Jaipur - Amber Fort, Hawa Mahal, Jantar Mantar, local markets
Day 4-5: Jodhpur - Mehrangarh Fort, blue city exploration, clock tower market
Day 6-8: Jaisalmer - Fort exploration, desert safari, cultural evening
Day 9-11: Udaipur - City Palace, boat ride on Lake Pichola, sunset at Ambrai Ghat
Day 12-14: Pushkar - Brahma Temple, Pushkar Lake, camel fair, hippie street markets''',
        'safety_intelligence': '''Weather: Extreme heat in summer (40°C+), pleasant in winter. Hydration is critical.
Scams to avoid: Fake tour guides at monuments, overpriced camel rides (negotiate beforehand)
Transportation: Use government-approved taxis and buses. Avoid unmarked vehicles at night.
Health: Carry ORS packets, avoid street food if sensitive stomach, drink bottled water only.
Women safety: Dress modestly, avoid walking alone late at night, use female-only hostel dorms.''',
        'hidden_gems': '''🏨 zostel Hostels - Best backpacker hostels with rooftop restaurants
🍜 Natraj Dining Hall (Udaipur) - Unlimited Rajasthani thali for ₹180
☕ Café Edelweiss (Pushkar) - German bakery with lake view
🎭 Dharohar Folk Dance Show (Jaipur) - Better and cheaper than touristy shows
📷 Toorji Ka Jhalra stepwell (Jodhpur) - Instagram-worthy spot with zero crowds''',
        'unique_highlights': '''Met travelers from 15+ countries and made lifelong friends. Learned to tie a traditional Rajasthani turban from a local uncle. Witnessed a traditional Rajasthani wedding procession by chance. Collected hand-block printed fabrics from local artisans. Started each day with sunrise views from fort ramparts.''',
        'safety_tips': '''Book accommodation in advance during peak season. Carry sunscreen (SPF 50+), sunglasses, and hat. Keep photocopies of important documents. Use ATMs during daytime only. Learn basic Hindi phrases - locals appreciate the effort. Trust your instincts, say no firmly to persistent touts. Install maps.me for offline navigation.''',
        'screenshots': []
    },
    {
        'title': 'Goa Workation Paradise',
        'tagline': 'Living and working remotely from India\'s beach paradise',
        'description': 'One month digital nomad experience in Goa, balancing remote work with beach life, yoga, and local culture.',
        'destination': 'Goa',
        'country': 'India',
        'state_province': 'Goa',
        'duration_days': 30,
        'budget_amount': 45000,
        'budget_currency': 'INR',
        'difficulty_level': 'Easy',
        'travel_style': 'Solo / Digital Nomad',
        'best_season': 'November to February',
        'activity_tags': ['Digital Nomad', 'Beach', 'Yoga', 'Water Sports', 'Coworking', 'Laptop', 'Power Bank'],
        'trip_highlights': '''💻 Worked from beachside cafes with high-speed WiFi
🏄 Learned surfing at Ashwem Beach
🧘 Daily sunrise yoga sessions on the beach
🍹 Experienced authentic Goan nightlife and beach shacks
🌴 Perfect work-life balance achieved''',
        'trip_journey': '''Rented a scooty for the month and explored both North and South Goa. Established a routine: work from 8 AM to 2 PM at coworking spaces, beach and leisure from 3 PM onwards. Weekdays were for focused work, weekends for exploring hidden beaches, waterfalls, and spice plantations. Made friends with other digital nomads and locals. Attended weekly beach cleanups and community yoga classes. Learned to cook Goan fish curry from my landlady. The month flew by in a perfect blend of productivity and paradise.''',
        'day_by_day_plan': '''Week 1: Settled in Panjim, explored Old Goa churches, set up workspace at Workation coworking
Week 2: Moved to Anjuna, discovered Chapora Fort, worked from beach cafes
Week 3: Explored South Goa - Palolem, Agonda, Cola Beach (quieter beaches)
Week 4: Back to North Goa, attended full moon party, wrapped up work projects, farewell dinners''',
        'safety_intelligence': '''Internet: Most cafes have 50+ Mbps WiFi. Backup with Jio/Airtel 4G dongle.
Safety: Goa is very safe but avoid isolated beaches after dark. Drug laws are strict.
Transport: Helmet mandatory for scooters. Police checking is frequent.
Accommodation: Book monthly rentals on Facebook groups (cheaper than Airbnb)
Health: Beware of food poisoning from beach shacks - stick to busy, popular places.''',
        'hidden_gems': '''☕ Artjuna Garden Café (Anjuna) - Amazing coworking vibe + healthy food
🏠 Facebook group "Goa Freelancers & Digital Nomads" - Find roommates & events
🌊 Querim Beach - North Goa's emptiest beach, perfect for peaceful work breaks
🍛 Viva Panjim - Authentic Goan restaurant run by a local family
💆 Purple Valley Yoga Retreat - Drop-in classes for ₹500''',
        'unique_highlights': '''Attended a Goan wedding and tasted traditional sannas. Created a community of digital nomads who still stay in touch. Improved swimming and learned surfing basics. Pitched a freelance client while sitting on the beach at sunset. Achieved 40+ hours of productive work every week while enjoying paradise. Started a side project inspired by Goan laid-back culture.''',
        'safety_tips': '''Get comprehensive travel insurance covering medical + laptop theft. Backup all work files to cloud daily. Keep laptop locked when leaving coworking space. Avoid carrying laptop to beach/parties. Use VPN for public WiFi. Have backup power bank (frequent power cuts). Maintain regular sleep schedule despite party culture. Set firm work hours and stick to them. Join nomad communities for networking and safety. Rent scooter with insurance included.''',
        'screenshots': []
    }
]

def get_first_traveler_id(cursor):
    """Get the first traveler ID from the database"""
    cursor.execute("SELECT id FROM travelers LIMIT 1")
    result = cursor.fetchone()
    return result[0] if result else None

def update_existing_itinerary(cursor, traveler_id):
    """Update the first itinerary with extended trip details"""
    # Get the first itinerary
    cursor.execute("SELECT id, title FROM itineraries LIMIT 1")
    result = cursor.fetchone()

    if not result:
        print("No existing itineraries found")
        return False

    itinerary_id = result[0]
    print(f"\nUpdating existing itinerary: {result[1]}")

    # Update with the first sample data
    data = sample_itineraries[0]

    cursor.execute("""
        UPDATE itineraries SET
            tagline = %s,
            description = %s,
            destination = %s,
            country = %s,
            state_province = %s,
            duration_days = %s,
            budget_amount = %s,
            budget_currency = %s,
            difficulty_level = %s,
            travel_style = %s,
            best_season = %s,
            activity_tags = %s,
            trip_highlights = %s,
            trip_journey = %s,
            day_by_day_plan = %s,
            safety_intelligence = %s,
            hidden_gems = %s,
            unique_highlights = %s,
            safety_tips = %s,
            updated_at = NOW()
        WHERE id = %s
    """, (
        data['tagline'],
        data['description'],
        data['destination'],
        data['country'],
        data['state_province'],
        data['duration_days'],
        data['budget_amount'],
        data['budget_currency'],
        data['difficulty_level'],
        data['travel_style'],
        data['best_season'],
        Json(data['activity_tags']),
        data['trip_highlights'],
        data['trip_journey'],
        data['day_by_day_plan'],
        data['safety_intelligence'],
        data['hidden_gems'],
        data['unique_highlights'],
        data['safety_tips'],
        itinerary_id
    ))

    print(f"✓ Updated itinerary: {itinerary_id}")
    return True

def create_new_itineraries(cursor, traveler_id):
    """Create new itineraries with all sample data"""
    import uuid

    # Skip the first sample (used for update) and create the rest
    for idx, data in enumerate(sample_itineraries[1:], start=2):
        itinerary_id = str(uuid.uuid4())
        start_date = datetime.now() - timedelta(days=30 * idx)
        end_date = start_date + timedelta(days=data['duration_days'])

        cursor.execute("""
            INSERT INTO itineraries (
                id, uuid, created_by_traveler_id,
                title, tagline, description,
                destination, country, state_province,
                start_date, end_date, duration_days,
                budget_amount, budget_currency,
                difficulty_level, travel_style, best_season,
                activity_tags,
                trip_highlights, trip_journey, day_by_day_plan,
                safety_intelligence, hidden_gems, unique_highlights,
                safety_tips, screenshots,
                is_published, proof_score,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s
            )
        """, (
            itinerary_id, str(uuid.uuid4()), traveler_id,
            data['title'], data['tagline'], data['description'],
            data['destination'], data['country'], data['state_province'],
            start_date.date(), end_date.date(), data['duration_days'],
            data['budget_amount'], data['budget_currency'],
            data['difficulty_level'], data['travel_style'], data['best_season'],
            Json(data['activity_tags']),
            data['trip_highlights'], data['trip_journey'], data['day_by_day_plan'],
            data['safety_intelligence'], data['hidden_gems'], data['unique_highlights'],
            data['safety_tips'], Json(data['screenshots']),
            True, 75.0 + idx * 5,  # Varying proof scores
            start_date, start_date
        ))

        print(f"✓ Created itinerary: {data['title']}")

def main():
    """Main function"""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        print("\n" + "="*60)
        print("POPULATING SAMPLE ITINERARIES")
        print("="*60)

        # Get traveler ID
        traveler_id = get_first_traveler_id(cursor)
        if not traveler_id:
            print("❌ No travelers found in database. Create a user first.")
            return

        print(f"\nUsing traveler ID: {traveler_id}")

        # Update existing itinerary
        print("\n📝 Updating existing itinerary...")
        update_existing_itinerary(cursor, traveler_id)

        # Create new itineraries
        print(f"\n➕ Creating {len(sample_itineraries) - 1} new itineraries...")
        create_new_itineraries(cursor, traveler_id)

        print("\n" + "="*60)
        print("✅ SAMPLE ITINERARIES POPULATED SUCCESSFULLY!")
        print("="*60)
        print(f"\nTotal itineraries: {len(sample_itineraries)}")
        print("All itineraries include:")
        print("  ✓ Trip Highlights")
        print("  ✓ Trip Journey & Experience")
        print("  ✓ Day-by-Day Itinerary")
        print("  ✓ Safety Intelligence & Risks")
        print("  ✓ Hidden Gems & Local Businesses")
        print("  ✓ Unique Highlights")
        print("  ✓ Safety & Travel Tips")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
