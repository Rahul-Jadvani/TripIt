"""
Fix the first itinerary record with extended trip details
"""
import os
import sys
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
conn.autocommit = True
cursor = conn.cursor()

# Get the first itinerary with destination "test test test test"
cursor.execute("SELECT id, title FROM itineraries WHERE destination = 'test test test test '")
result = cursor.fetchone()

if result:
    itinerary_id = result[0]
    print(f"Updating itinerary: {result[1]} (ID: {itinerary_id})")

    # Update with proper data
    cursor.execute("""
        UPDATE itineraries SET
            title = %s,
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
        'Solo Trek to Kedarkantha Peak',
        'Winter wonderland adventure in the Himalayas',
        'An unforgettable solo winter trek to Kedarkantha Peak (3,800m) through snow-covered trails, pine forests, and breathtaking mountain vistas.',
        'Kedarkantha, Uttarakhand',
        'India',
        'Uttarakhand',
        6,
        15000.0,
        'INR',
        'Medium',
        'Solo',
        'December to April',
        Json(['Trekking', 'Winter Sports', 'Photography', 'Mountain Camping', 'First Aid Kit', 'Crampons', 'Ice Axe']),
        '''🏔️ Summit Success at 3,800m
⛺ Camping under starlit skies at -10°C
🌲 Walking through enchanting pine forests covered in snow
🌅 360° panoramic views of Himalayan peaks
📸 Captured rare wildlife including Himalayan Monal birds''',
        '''Day 0: Reached Dehradun by overnight train from Delhi. Met fellow trekkers at the base camp.
Day 1: Drive to Sankri village (6,400 ft), acclimatization walk around the village
Day 2: Trek to Juda Ka Talab (9,100 ft) - 4km through oak and pine forests
Day 3: Trek to Kedarkantha Base Camp (11,250 ft) - witnessed the most stunning sunset
Day 4: Summit push at 3 AM, reached Kedarkantha Peak at sunrise, descended to Hargaon Camp
Day 5: Trek back to Sankri, celebrated with local Garhwali food
Day 6: Return journey to Dehradun''',
        '''📅 Day 1: Dehradun → Sankri (220 km, 8 hrs)
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
        '''⚠️ ALTITUDE SICKNESS RISK: Medium
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
        '''🏡 Govind Guest House, Sankri
- Family-run homestay with authentic Garhwali meals
- Owner Uncle Govind shared amazing local folklore
- Hot water bottles provided for cold nights
- Cost: Rs.800/night including meals

🍲 Himalayan Dhaba, Sankri
- Best rajma chawal and maggi point before trek
- Run by local women's cooperative
- Proceeds support village school
- Must-try: Sidu (local bread) with ghee

⛺ Camp Himalaya Equipment Rentals
- High-quality gear at 50% cheaper than Dehradun
- Owner Rakesh offers free gear inspection
- Rented: -20°C sleeping bag, gaiters, trekking poles
- Total cost: Rs.1,200 for 6 days

📸 Secret Photography Spots:
- Sunrise at Juda Ka Talab (5:30 AM)
- Moonrise over base camp (7 PM)
- 360° peak shots from Kedarkantha summit

🎁 Local Shopping:
- Handmade woolen socks and caps at Sankri market
- Pure honey from local beekeepers
- Rhododendron juice (local specialty)''',
        '''✨ WHAT MADE THIS TREK SPECIAL:

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
        '''✅ PRE-TREK PREPARATION:
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
        itinerary_id
    ))

    print("✓ Itinerary updated successfully!")
else:
    print("No itinerary found with that destination")

cursor.close()
conn.close()
