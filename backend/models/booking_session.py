from datetime import datetime
from extensions import db

class BookingSession(db.Model):
    """Stores booking session state for iterative chat flow"""
    __tablename__ = 'booking_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    itinerary_id = db.Column(db.String(36), db.ForeignKey('itineraries.id'), nullable=False)

    # Session state
    session_token = db.Column(db.String(100), unique=True, nullable=False)
    current_step = db.Column(db.String(50), default='initial')  # initial, departure, dates, travelers, budget, flights, hotels, activities, summary

    # User inputs
    departure_city = db.Column(db.String(200))
    departure_date = db.Column(db.Date)
    return_date = db.Column(db.Date)
    num_travelers = db.Column(db.Integer)
    budget_preference = db.Column(db.String(50))  # economy, comfort, premium

    # Multi-city support
    cities = db.Column(db.JSON)  # List of cities to visit (for multi-city trips)
    current_destination_index = db.Column(db.Integer, default=0)

    # Selections (stored as JSON)
    selected_flights = db.Column(db.JSON)  # List of selected flight objects
    selected_hotels = db.Column(db.JSON)   # List of selected hotel objects
    selected_activities = db.Column(db.JSON)  # List of selected activity objects

    # Search cache (to avoid re-querying Perplexity)
    flight_options = db.Column(db.JSON)
    hotel_options = db.Column(db.JSON)
    activity_options = db.Column(db.JSON)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed = db.Column(db.Boolean, default=False)

    # Relationships
    user = db.relationship('User', backref='booking_sessions')
    itinerary = db.relationship('Itinerary', backref='booking_sessions')

    def to_dict(self):
        return {
            'id': self.id,
            'session_token': self.session_token,
            'current_step': self.current_step,
            'departure_city': self.departure_city,
            'departure_date': self.departure_date.isoformat() if self.departure_date else None,
            'return_date': self.return_date.isoformat() if self.return_date else None,
            'num_travelers': self.num_travelers,
            'budget_preference': self.budget_preference,
            'cities': self.cities or [],
            'current_destination_index': self.current_destination_index,
            'selected_flights': self.selected_flights or [],
            'selected_hotels': self.selected_hotels or [],
            'selected_activities': self.selected_activities or [],
            'flight_options': self.flight_options or [],
            'hotel_options': self.hotel_options or [],
            'activity_options': self.activity_options or [],
            'completed': self.completed,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
