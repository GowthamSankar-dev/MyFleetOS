import httpx
import logging
import base64
from email.message import EmailMessage
from app.config import settings

logger = logging.getLogger(__name__)

def _get_gmail_access_token() -> str | None:
    """Exchange the refresh token for a short-lived access token."""
    try:
        response = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "refresh_token": settings.GMAIL_REFRESH_TOKEN,
                "grant_type": "refresh_token"
            },
            timeout=10.0
        )
        response.raise_for_status()
        return response.json().get("access_token")
    except Exception as e:
        logger.error(f"Failed to refresh Gmail access token: {e}")
        return None

def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    """Send an OTP code to the provided email via Gmail REST API."""
    logger.info("OTP generated for %s (purpose=%s)", to_email, purpose)
    
    if not (settings.GMAIL_CLIENT_ID and settings.GMAIL_CLIENT_SECRET and settings.GMAIL_REFRESH_TOKEN):
        logger.warning("Gmail OAuth credentials are not set. Cannot send email.")
        return False
        
    access_token = _get_gmail_access_token()
    if not access_token:
        return False
        
    sender = settings.SMTP_EMAIL
    if not sender:
        logger.warning("SMTP_EMAIL is not set. Using fallback for sender.")
        sender = "fleetos.official@gmail.com"

    subject, html_body, plain_body = _build_email_content(otp, purpose)

    msg = EmailMessage()
    msg['From'] = f"ShowMyFleet <{sender}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.set_content(plain_body)                      # plain-text fallback
    msg.add_alternative(html_body, subtype='html')   # rich HTML version
        
    # Encode as base64url for Gmail API
    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
    
    try:
        response = httpx.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={"raw": raw_message},
            timeout=10.0
        )
        if response.status_code >= 400:
            logger.error(f"Gmail API Error: {response.text}")
        response.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def _build_email_content(otp: str, purpose: str) -> tuple[str, str, str]:
    """Return (subject, html_body, plain_text_body) for the given OTP purpose."""

    if purpose == "register":
        subject = "Verify your ShowMyFleet account"
        heading = "Confirm your email"
        subheading = "You're almost there! Use the code below to complete your registration."
        action_label = "Registration Code"
        footer_note = "You're receiving this because someone tried to create a ShowMyFleet account with this email address."
    elif purpose == "login":
        subject = "Your ShowMyFleet login code"
        heading = "Sign-in verification"
        subheading = "Use the code below to complete your passwordless sign-in. It expires in 10 minutes."
        action_label = "Login Code"
        footer_note = "You're receiving this because a sign-in was requested for your ShowMyFleet account."
    elif purpose == "reset":
        subject = "Reset your ShowMyFleet password"
        heading = "Password reset request"
        subheading = "We received a request to reset your password. Use the code below to continue."
        action_label = "Password Reset Code"
        footer_note = "If you didn't request a password reset, you can safely ignore this email."
    else:
        subject = "Your ShowMyFleet verification code"
        heading = "Verification code"
        subheading = "Use the code below to verify your action. It expires in 10 minutes."
        action_label = "Verification Code"
        footer_note = "You're receiving this from ShowMyFleet."

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="font-family: sans-serif; color: #333; line-height: 1.5; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
    <h2>{heading}</h2>
    <p>{subheading}</p>
    <p><strong>{action_label}:</strong></p>
    <h1 style="font-size: 32px; letter-spacing: 5px; color: #000;">{otp}</h1>
    <p style="font-size: 14px; color: #555;">This code expires in 10 minutes. Do not share it with anyone.</p>
    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
    <p style="font-size: 12px; color: #777;">{footer_note}</p>
    <p style="font-size: 12px; color: #777;">&copy; 2025 ShowMyFleet</p>
  </div>
</body>
</html>"""

    plain_body = f"""{heading}

{subheading}

{action_label}: {otp}

This code expires in 10 minutes. Do not share it with anyone.

---
{footer_note}
© 2025 ShowMyFleet — Real-time Fleet Tracking
"""
    return subject, html_body, plain_body

def send_geofence_alert_email(to_email: str, vehicle_name: str, zone_name: str) -> bool:
    """Send an alert that a vehicle left its geofence."""
    logger.info("Geofence alert generated for %s (vehicle=%s, zone=%s)", to_email, vehicle_name, zone_name)
    
    if not (settings.GMAIL_CLIENT_ID and settings.GMAIL_CLIENT_SECRET and settings.GMAIL_REFRESH_TOKEN):
        logger.warning("Gmail OAuth credentials are not set. Cannot send alert email.")
        return False
        
    access_token = _get_gmail_access_token()
    if not access_token:
        return False
        
    sender = settings.SMTP_EMAIL or "fleetos.official@gmail.com"

    subject = f"Alert: {vehicle_name} left zone {zone_name}"
    
    plain_body = f"""Alert!
    
Your vehicle "{vehicle_name}" has just left the designated geofence zone "{zone_name}".

Please check your ShowMyFleet dashboard for live tracking.

© 2025 ShowMyFleet — Real-time Fleet Tracking"""

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<body>
  <h2>Geofence Alert</h2>
  <p>Your vehicle <strong>{vehicle_name}</strong> has just left the designated geofence zone <strong>{zone_name}</strong>.</p>
  <p>Please check your <a href="http://localhost:5173">ShowMyFleet dashboard</a> for live tracking.</p>
</body>
</html>"""

    msg = EmailMessage()
    msg['From'] = f"ShowMyFleet Alerts <{sender}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.set_content(plain_body)
    msg.add_alternative(html_body, subtype='html')
        
    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
    
    try:
        response = httpx.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={"raw": raw_message},
            timeout=10.0
        )
        response.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Failed to send alert email to {to_email}: {e}")
        return False
