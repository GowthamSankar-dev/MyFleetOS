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
    msg['From'] = f"myfleetOS <{sender}>"
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
        subject = "Verify your myfleetOS account"
        heading = "Confirm your email"
        subheading = "You're almost there! Use the code below to complete your registration."
        action_label = "Registration Code"
        footer_note = "You're receiving this because someone tried to create a myfleetOS account with this email address."
    elif purpose == "login":
        subject = "Your myfleetOS login code"
        heading = "Sign-in verification"
        subheading = "Use the code below to complete your passwordless sign-in. It expires in 10 minutes."
        action_label = "Login Code"
        footer_note = "You're receiving this because a sign-in was requested for your myfleetOS account."
    elif purpose == "reset":
        subject = "Reset your myfleetOS password"
        heading = "Password reset request"
        subheading = "We received a request to reset your password. Use the code below to continue."
        action_label = "Password Reset Code"
        footer_note = "If you didn't request a password reset, you can safely ignore this email."
    else:
        subject = "Your myfleetOS verification code"
        heading = "Verification code"
        subheading = "Use the code below to verify your action. It expires in 10 minutes."
        action_label = "Verification Code"
        footer_note = "You're receiving this from myfleetOS."

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo / Brand Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#0ea5e9,#14b8a6);border-radius:16px;padding:12px 24px;">
                    <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      Fleet<span style="color:#a7f3d0;">OS</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1e293b;border-radius:20px;padding:40px 36px;border:1px solid #334155;">

              <!-- Heading -->
              <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#f1f5f9;letter-spacing:-0.3px;">{heading}</h1>
              <p style="margin:0 0 32px 0;font-size:15px;color:#94a3b8;line-height:1.6;">{subheading}</p>

              <!-- OTP Label -->
              <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;">{action_label}</p>

              <!-- OTP Box -->
              <div style="background-color:#0f172a;border:2px solid #0ea5e9;border-radius:14px;padding:24px;text-align:center;margin-bottom:28px;">
                <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#e2e8f0;font-family:'Courier New',Courier,monospace;">{otp}</span>
              </div>

              <!-- Expiry Notice -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#172554;border-left:3px solid #3b82f6;border-radius:0 10px 10px 0;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#93c5fd;">
                      &#9201;&nbsp; This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #334155;margin:0 0 24px 0;" />

              <!-- Security Warning -->
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                &#128274;&nbsp; <strong style="color:#94a3b8;">Security tip:</strong> myfleetOS will never ask for your OTP via phone, chat, or any other channel. Only enter this code on the official myfleetOS website.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#475569;">{footer_note}</p>
              <p style="margin:0;font-size:12px;color:#334155;">
                &copy; 2025 myfleetOS &nbsp;&middot;&nbsp; Real-time Fleet Tracking
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    plain_body = f"""{heading}

{subheading}

{action_label}: {otp}

This code expires in 10 minutes. Do not share it with anyone.

---
{footer_note}
© 2025 myfleetOS — Real-time Fleet Tracking
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

Please check your myfleetOS dashboard for live tracking.

© 2025 myfleetOS — Real-time Fleet Tracking"""

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<body>
  <h2>Geofence Alert</h2>
  <p>Your vehicle <strong>{vehicle_name}</strong> has just left the designated geofence zone <strong>{zone_name}</strong>.</p>
  <p>Please check your <a href="http://localhost:5173">FleetOS dashboard</a> for live tracking.</p>
</body>
</html>"""

    msg = EmailMessage()
    msg['From'] = f"myfleetOS Alerts <{sender}>"
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
