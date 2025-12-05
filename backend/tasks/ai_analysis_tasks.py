"""
AI Analysis Celery Tasks - Async AI-powered analysis for travel content
Generates real-time alerts, insights, and recommendations for itineraries and snaps
"""
from celery_app import celery
from extensions import db
from services.ai_analyzer import AIAnalyzer
from utils.notifications import create_notification
from services.socket_service import SocketService
from flask import current_app
import traceback


@celery.task(name='analyze_itinerary_ai', bind=True, max_retries=3)
def analyze_itinerary_ai(self, itinerary_id: str):
    """
    Analyze an itinerary using AI and generate real-time alerts

    Args:
        itinerary_id: ID of the itinerary to analyze
    """
    try:
        print(f"\n{'='*80}")
        print(f"[AI Analysis Task] Starting AI analysis for itinerary: {itinerary_id}")
        print(f"{'='*80}\n")

        # Import models here to avoid circular imports
        from models.itinerary import Itinerary
        from models.user import User
        from models.traveler import Traveler

        # Get itinerary
        itinerary = Itinerary.query.get(itinerary_id)
        if not itinerary:
            print(f"[AI Analysis Task] ❌ Itinerary not found: {itinerary_id}")
            return {
                'success': False,
                'error': 'Itinerary not found'
            }

        print(f"[AI Analysis Task] 📍 Analyzing: {itinerary.title} → {itinerary.destination}")

        # Initialize AI analyzer
        ai_analyzer = AIAnalyzer()

        if not ai_analyzer.is_available():
            print("[AI Analysis Task] ⚠️ AI analyzer not available (OpenAI not configured)")
            return {
                'success': False,
                'error': 'AI service not available'
            }

        # Prepare itinerary data for analysis
        itinerary_data = itinerary.to_dict(include_creator=True)

        # Analyze itinerary with AI (with fallback)
        print(f"[AI Analysis Task] 🤖 Calling OpenAI for analysis...")
        alerts = []

        try:
            alerts = ai_analyzer.analyze_itinerary(itinerary_data)
            print(f"[AI Analysis Task] ✅ AI returned {len(alerts)} alerts")
        except Exception as e:
            print(f"[AI Analysis Task] ⚠️ AI analysis exception: {e}")
            import traceback
            traceback.print_exc()

        # Fallback: If AI failed or returned no alerts, create a generic notification
        if not alerts:
            print("[AI Analysis Task] 📢 No AI alerts - creating fallback notification")
            alerts = [{
                'type': 'insight',
                'priority': 'low',
                'title': '🗺️ New Itinerary Shared',
                'message': f"A new travel itinerary to {itinerary.destination} was shared. Check it out for travel inspiration and planning ideas.",
                'send_email': False
            }]

        # Get creator information
        creator = Traveler.query.get(itinerary.created_by_traveler_id)
        creator_name = creator.display_name or creator.username if creator else "A traveler"

        # MVP: Broadcast to all travelers (location-based filtering will be on frontend)
        # NOTE: Using Traveler table because that's what the app uses for auth
        travelers = Traveler.query.filter_by(is_active=True).all()
        print(f"[AI Analysis Task] 📢 Broadcasting to {len(travelers)} travelers (MVP mode)")

        # Convert travelers to user format for notifications
        users = travelers

        # Process each alert
        notification_count = 0
        email_count = 0

        for alert in alerts:
            alert_type = alert.get('type', 'insight')
            priority = alert.get('priority', 'medium')
            title = alert.get('title', 'Travel Alert')
            message = alert.get('message', '')
            send_email = alert.get('send_email', True)  # MVP: Send all emails

            # Determine notification type mapping
            notification_type_map = {
                'safety': 'ai_safety_alert',
                'insight': 'ai_insight',
                'recommendation': 'ai_recommendation',
                'warning': 'ai_warning',
                'suggestion': 'ai_suggestion'
            }
            notification_type = notification_type_map.get(alert_type, 'ai_alert')

            # Create emoji prefix based on alert type
            emoji_map = {
                'safety': '🚨',
                'insight': '💡',
                'recommendation': '🎯',
                'warning': '⚠️',
                'suggestion': '✨'
            }
            emoji = emoji_map.get(alert_type, '📢')

            # Enhanced title with emoji and context
            full_title = f"{emoji} {title}"
            full_message = f"New itinerary: '{itinerary.title}' ({itinerary.destination})\n\n{message}"

            # Create in-app notifications for all users
            for user in users:
                try:
                    notification = create_notification(
                        user_id=user.id,
                        notification_type=notification_type,
                        title=full_title,
                        message=full_message,
                        project_id=itinerary_id,
                        actor_id=itinerary.created_by_traveler_id,
                        redirect_url=f"/itinerary/{itinerary_id}"
                    )
                    notification_count += 1
                except Exception as e:
                    print(f"[AI Analysis Task] ❌ Failed to create notification for user {user.id}: {e}")

            # Send emails (MVP: Send for all alerts)
            if send_email:
                try:
                    from services.email_service import EmailService

                    for user in users:
                        if user.email and user.email_verified:
                            try:
                                # Use existing email service (we'll create a new method)
                                sent = send_ai_alert_email(
                                    user=user,
                                    alert_type=alert_type,
                                    title=title,
                                    message=message,
                                    itinerary=itinerary,
                                    creator_name=creator_name,
                                    priority=priority
                                )
                                if sent:
                                    email_count += 1
                            except Exception as e:
                                print(f"[AI Analysis Task] ⚠️ Failed to send email to {user.email}: {e}")

                except Exception as e:
                    print(f"[AI Analysis Task] ❌ Email service error: {e}")

        print(f"\n[AI Analysis Task] 📊 Results:")
        print(f"  - Alerts generated: {len(alerts)}")
        print(f"  - Notifications created: {notification_count}")
        print(f"  - Emails sent: {email_count}")
        print(f"{'='*80}\n")

        return {
            'success': True,
            'itinerary_id': itinerary_id,
            'alert_count': len(alerts),
            'notification_count': notification_count,
            'email_count': email_count,
            'alerts': alerts
        }

    except Exception as e:
        print(f"[AI Analysis Task] ❌ ERROR: {str(e)}")
        traceback.print_exc()

        # Retry on failure (max 3 times)
        if self.request.retries < self.max_retries:
            print(f"[AI Analysis Task] 🔄 Retrying... (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))  # Exponential backoff

        return {
            'success': False,
            'error': str(e)
        }


@celery.task(name='analyze_snap_ai', bind=True, max_retries=3)
def analyze_snap_ai(self, snap_id: str, local_filename: str = None):
    """
    Analyze a snap using AI and generate real-time alerts

    Args:
        snap_id: ID of the snap to analyze
        local_filename: Local filename for AI analysis (optional)
    """
    try:
        print(f"\n{'='*80}")
        print(f"[AI Analysis Task] Starting AI analysis for snap: {snap_id}")
        print(f"{'='*80}\n")

        # Import models here to avoid circular imports
        from models.snap import Snap
        from models.user import User
        from models.traveler import Traveler
        from flask import current_app

        # Get snap
        snap = Snap.query.get(snap_id)
        if not snap:
            print(f"[AI Analysis Task] ❌ Snap not found: {snap_id}")
            return {
                'success': False,
                'error': 'Snap not found'
            }

        location_text = snap.location_name or f"{snap.city}, {snap.country}" if snap.city else "Unknown location"
        print(f"[AI Analysis Task] 📍 Analyzing snap at: {location_text}")

        # Initialize AI analyzer
        ai_analyzer = AIAnalyzer()

        if not ai_analyzer.is_available():
            print("[AI Analysis Task] ⚠️ AI analyzer not available (OpenAI not configured)")
            return {
                'success': False,
                'error': 'AI service not available'
            }

        # Prepare snap data for analysis
        snap_data = snap.to_dict(include_creator=True)

        # Use local file for AI analysis if available (convert to base64)
        if local_filename:
            import os
            import base64

            upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'snaps')
            local_path = os.path.join(upload_folder, local_filename)

            if os.path.exists(local_path):
                print(f"[AI Analysis Task] 🖼️  Reading local file for AI: {local_path}")

                # Read file and convert to base64
                with open(local_path, 'rb') as img_file:
                    image_data = base64.b64encode(img_file.read()).decode('utf-8')

                # Determine image format
                ext = local_filename.rsplit('.', 1)[1].lower()
                mime_type = f"image/{ext}" if ext != 'jpg' else "image/jpeg"

                # Create data URL for OpenAI
                snap_data['image_url'] = f"data:{mime_type};base64,{image_data}"
                print(f"[AI Analysis Task] ✅ Converted local image to base64 ({len(image_data)} chars)")
            else:
                print(f"[AI Analysis Task] ⚠️ Local file not found, falling back to IPFS URL")

        # Analyze snap with AI (with fallback)
        print(f"[AI Analysis Task] 🤖 Calling OpenAI for analysis...")
        alerts = []

        try:
            alerts = ai_analyzer.analyze_snap(snap_data)
            print(f"[AI Analysis Task] ✅ AI returned {len(alerts)} alerts")
        except Exception as e:
            print(f"[AI Analysis Task] ⚠️ AI analysis exception: {e}")
            import traceback
            traceback.print_exc()

        # Fallback: If AI failed or returned no alerts, create a generic notification
        if not alerts:
            print("[AI Analysis Task] 📢 No AI alerts - creating fallback notification")
            alerts = [{
                'type': 'insight',
                'priority': 'low',
                'title': '📸 New Snap Shared',
                'message': f"A new snap was shared at {location_text}. Check it out to stay updated with travel insights from this location.",
                'send_email': False
            }]

        # Get creator information
        creator = Traveler.query.get(snap.user_id)
        creator_name = creator.display_name or creator.username if creator else "A traveler"

        # MVP: Broadcast to all travelers (location-based filtering will be on frontend)
        # NOTE: Using Traveler table because that's what the app uses for auth
        travelers = Traveler.query.filter_by(is_active=True).all()
        print(f"[AI Analysis Task] 📢 Broadcasting to {len(travelers)} travelers (MVP mode)")

        # Convert travelers to user format for notifications
        users = travelers

        # Process each alert
        notification_count = 0
        email_count = 0

        for alert in alerts:
            alert_type = alert.get('type', 'insight')
            priority = alert.get('priority', 'medium')
            title = alert.get('title', 'Travel Alert')
            message = alert.get('message', '')
            send_email = alert.get('send_email', True)  # MVP: Send all emails

            # Determine notification type mapping
            notification_type_map = {
                'safety': 'ai_safety_alert',
                'insight': 'ai_insight',
                'recommendation': 'ai_recommendation',
                'warning': 'ai_warning',
                'suggestion': 'ai_suggestion'
            }
            notification_type = notification_type_map.get(alert_type, 'ai_alert')

            # Create emoji prefix based on alert type
            emoji_map = {
                'safety': '🚨',
                'insight': '💡',
                'recommendation': '🎯',
                'warning': '⚠️',
                'suggestion': '✨'
            }
            emoji = emoji_map.get(alert_type, '📢')

            # Enhanced title with emoji and context
            full_title = f"{emoji} {title}"
            full_message = f"New snap at {location_text}\n\n{message}"

            # Create in-app notifications for all users
            for user in users:
                try:
                    notification = create_notification(
                        user_id=user.id,
                        notification_type=notification_type,
                        title=full_title,
                        message=full_message,
                        actor_id=snap.user_id,
                        redirect_url=f"/snaps/{snap_id}"
                    )
                    notification_count += 1
                except Exception as e:
                    print(f"[AI Analysis Task] ❌ Failed to create notification for user {user.id}: {e}")

            # Send emails (MVP: Send for all alerts)
            if send_email:
                try:
                    from services.email_service import EmailService

                    for user in users:
                        if user.email and user.email_verified:
                            try:
                                # Use existing email service (we'll create a new method)
                                sent = send_ai_snap_alert_email(
                                    user=user,
                                    alert_type=alert_type,
                                    title=title,
                                    message=message,
                                    snap=snap,
                                    location_text=location_text,
                                    creator_name=creator_name,
                                    priority=priority
                                )
                                if sent:
                                    email_count += 1
                            except Exception as e:
                                print(f"[AI Analysis Task] ⚠️ Failed to send email to {user.email}: {e}")

                except Exception as e:
                    print(f"[AI Analysis Task] ❌ Email service error: {e}")

        print(f"\n[AI Analysis Task] 📊 Results:")
        print(f"  - Alerts generated: {len(alerts)}")
        print(f"  - Notifications created: {notification_count}")
        print(f"  - Emails sent: {email_count}")
        print(f"{'='*80}\n")

        return {
            'success': True,
            'snap_id': snap_id,
            'alert_count': len(alerts),
            'notification_count': notification_count,
            'email_count': email_count,
            'alerts': alerts
        }

    except Exception as e:
        print(f"[AI Analysis Task] ❌ ERROR: {str(e)}")
        traceback.print_exc()

        # Retry on failure (max 3 times)
        if self.request.retries < self.max_retries:
            print(f"[AI Analysis Task] 🔄 Retrying... (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))  # Exponential backoff

        return {
            'success': False,
            'error': str(e)
        }


def send_ai_alert_email(user, alert_type, title, message, itinerary, creator_name, priority):
    """
    Send AI alert email for itinerary

    Args:
        user: User object to send email to
        alert_type: Type of alert (safety, insight, etc.)
        title: Alert title
        message: Alert message
        itinerary: Itinerary object
        creator_name: Name of itinerary creator
        priority: Alert priority level

    Returns:
        bool: True if email sent successfully
    """
    try:
        from services.email_service import EmailService
        from flask import current_app

        config = current_app.config

        # Check if email service is enabled
        if not EmailService.is_enabled():
            print("[AI Email] ZeptoMail not configured, skipping email")
            return False

        # Priority emoji and label
        priority_map = {
            'critical': '🔴 CRITICAL',
            'high': '🟠 HIGH',
            'medium': '🟡 MEDIUM',
            'low': '🟢 LOW'
        }
        priority_label = priority_map.get(priority, '🟡 MEDIUM')

        # Alert type emoji
        type_emoji = {
            'safety': '🚨',
            'insight': '💡',
            'recommendation': '🎯',
            'warning': '⚠️',
            'suggestion': '✨'
        }
        emoji = type_emoji.get(alert_type, '📢')

        # Email subject
        subject = f"{emoji} AI Alert: {title}"

        # HTML email body
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #FACC15 0%, #F59E0B 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: #0B0B0B; margin: 0; font-size: 24px;">{emoji} AI Travel Alert</h1>
                    <p style="color: #0B0B0B; margin: 10px 0 0 0;">Priority: {priority_label}</p>
                </div>

                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #0B0B0B; margin-top: 0;">{title}</h2>

                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FACC15;">
                        <p style="margin: 0;">{message}</p>
                    </div>

                    <h3 style="color: #666; font-size: 14px; margin: 20px 0 10px 0;">RELATED ITINERARY</h3>
                    <div style="background: white; padding: 15px; border-radius: 8px;">
                        <h4 style="margin: 0 0 10px 0; color: #0B0B0B;">{itinerary.title}</h4>
                        <p style="margin: 0; color: #666;"><strong>Destination:</strong> {itinerary.destination}</p>
                        <p style="margin: 5px 0 0 0; color: #666;"><strong>By:</strong> {creator_name}</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{config.get('FRONTEND_APP_URL', 'http://localhost:8080')}/itineraries/{itinerary.id}"
                           style="background: #FACC15; color: #0B0B0B; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            View Itinerary
                        </a>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                    <p>This is an AI-generated alert based on real-time travel data analysis</p>
                    <p>© TripIt - Powered by AI Travel Intelligence</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Text email body (fallback)
        text_body = f"""
{emoji} AI TRAVEL ALERT
Priority: {priority_label}

{title}

{message}

RELATED ITINERARY:
- {itinerary.title}
- Destination: {itinerary.destination}
- By: {creator_name}

View full details: {config.get('FRONTEND_APP_URL')}/itineraries/{itinerary.id}

---
This is an AI-generated alert based on real-time travel data analysis.
© TripIt - Powered by AI Travel Intelligence
        """

        # Prepare email payload
        payload = {
            "from": {
                "address": config['ZEPTO_SENDER_ADDRESS'],
                "name": config.get('ZEPTO_SENDER_NAME', 'TripIt AI Alerts'),
            },
            "to": [
                {
                    "email_address": {
                        "address": user.email,
                        "name": user.display_name or user.username,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        import requests
        session = EmailService._get_retry_session()
        response = session.post(
            config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
        )
        response.raise_for_status()

        print(f"[AI Email] ✅ Sent AI alert email to {user.email}")
        return True

    except Exception as e:
        print(f"[AI Email] ❌ Failed to send email: {e}")
        return False


def send_ai_snap_alert_email(user, alert_type, title, message, snap, location_text, creator_name, priority):
    """
    Send AI alert email for snap

    Args:
        user: User object to send email to
        alert_type: Type of alert (safety, insight, etc.)
        title: Alert title
        message: Alert message
        snap: Snap object
        location_text: Human-readable location text
        creator_name: Name of snap creator
        priority: Alert priority level

    Returns:
        bool: True if email sent successfully
    """
    try:
        from services.email_service import EmailService
        from flask import current_app

        config = current_app.config

        # Check if email service is enabled
        if not EmailService.is_enabled():
            print("[AI Email] ZeptoMail not configured, skipping email")
            return False

        # Priority emoji and label
        priority_map = {
            'critical': '🔴 CRITICAL',
            'high': '🟠 HIGH',
            'medium': '🟡 MEDIUM',
            'low': '🟢 LOW'
        }
        priority_label = priority_map.get(priority, '🟡 MEDIUM')

        # Alert type emoji
        type_emoji = {
            'safety': '🚨',
            'insight': '💡',
            'recommendation': '🎯',
            'warning': '⚠️',
            'suggestion': '✨'
        }
        emoji = type_emoji.get(alert_type, '📢')

        # Email subject
        subject = f"{emoji} AI Alert: {title}"

        # HTML email body
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #FACC15 0%, #F59E0B 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: #0B0B0B; margin: 0; font-size: 24px;">{emoji} AI Location Alert</h1>
                    <p style="color: #0B0B0B; margin: 10px 0 0 0;">Priority: {priority_label}</p>
                </div>

                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #0B0B0B; margin-top: 0;">{title}</h2>

                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FACC15;">
                        <p style="margin: 0;">{message}</p>
                    </div>

                    <h3 style="color: #666; font-size: 14px; margin: 20px 0 10px 0;">RELATED SNAP</h3>
                    <div style="background: white; padding: 15px; border-radius: 8px;">
                        <p style="margin: 0; color: #666;"><strong>📍 Location:</strong> {location_text}</p>
                        <p style="margin: 5px 0 0 0; color: #666;"><strong>By:</strong> {creator_name}</p>
                        {f'<p style="margin: 5px 0 0 0; color: #666;"><strong>Caption:</strong> {snap.caption}</p>' if snap.caption else ''}
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{config.get('FRONTEND_APP_URL', 'http://localhost:8080')}/snaps/{snap.id}"
                           style="background: #FACC15; color: #0B0B0B; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            View Snap
                        </a>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                    <p>This is an AI-generated alert based on real-time location data analysis</p>
                    <p>© TripIt - Powered by AI Travel Intelligence</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Text email body (fallback)
        text_body = f"""
{emoji} AI LOCATION ALERT
Priority: {priority_label}

{title}

{message}

RELATED SNAP:
- Location: {location_text}
- By: {creator_name}
{f'- Caption: {snap.caption}' if snap.caption else ''}

View full details: {config.get('FRONTEND_APP_URL')}/snaps/{snap.id}

---
This is an AI-generated alert based on real-time location data analysis.
© TripIt - Powered by AI Travel Intelligence
        """

        # Prepare email payload
        payload = {
            "from": {
                "address": config['ZEPTO_SENDER_ADDRESS'],
                "name": config.get('ZEPTO_SENDER_NAME', 'TripIt AI Alerts'),
            },
            "to": [
                {
                    "email_address": {
                        "address": user.email,
                        "name": user.display_name or user.username,
                    }
                }
            ],
            "subject": subject,
            "htmlbody": html_body,
            "textbody": text_body,
        }

        headers = {
            "authorization": f"Zoho-enczapikey {config['ZEPTO_SEND_MAIL_TOKEN']}",
            "content-type": "application/json",
        }

        import requests
        session = EmailService._get_retry_session()
        response = session.post(
            config["ZEPTO_ENDPOINT"], json=payload, headers=headers, timeout=30
        )
        response.raise_for_status()

        print(f"[AI Email] ✅ Sent AI snap alert email to {user.email}")
        return True

    except Exception as e:
        print(f"[AI Email] ❌ Failed to send email: {e}")
        return False
