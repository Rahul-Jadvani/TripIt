"""
Quick script to add test preferences to an investor profile
"""
from app import create_app
from models.investor_request import InvestorRequest
from extensions import db

app = create_app()

with app.app_context():
    # Get first approved investor without preferences
    investor = InvestorRequest.query.filter_by(status='approved').first()

    if investor:
        print(f"Updating investor: {investor.name or investor.user_id}")

        # Add sample preferences
        investor.industries = ["AI/ML", "SaaS", "Healthcare"]
        investor.investment_stages = ["Seed", "Series A", "Pre-seed"]
        investor.geographic_focus = ["North America", "Europe"]
        investor.ticket_size_min = 50000
        investor.ticket_size_max = 500000

        db.session.commit()

        print("✅ Updated investor profile with preferences:")
        print(f"  Industries: {investor.industries}")
        print(f"  Stages: {investor.investment_stages}")
        print(f"  Location: {investor.geographic_focus}")
        print(f"  Ticket Size: ${investor.ticket_size_min:,} - ${investor.ticket_size_max:,}")

        print(f"\nLog in as this investor to see curated feed!")
        print(f"User ID: {investor.user_id}")
    else:
        print("No approved investors found")
