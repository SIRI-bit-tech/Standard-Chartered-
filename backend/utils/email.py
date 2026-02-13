import logging
import asyncio
import html
from urllib.parse import quote
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from email.utils import formataddr
from config import settings

logger = logging.getLogger(__name__)


def _send_blocking_email(email: str, msg: MIMEMultipart, verification_url: str) -> None:
    """Blocking SMTP operations moved to separate function for thread execution"""
    # Send email
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)


async def send_verification_email(email: str, verification_token: str, first_name: str) -> None:
    """Send verification email to user"""
    try:
        # Create email message
        encoded_token = quote(verification_token, safe='')
        verification_url = f"{settings.FRONTEND_URL}/dashboard/verify-email?token={encoded_token}"
        
        # HTML-escape user-controlled input to prevent XSS
        escaped_first_name = html.escape(first_name or "Valued Customer")
        
        # Clean display name for email header (prevent injection)
        safe_display_name = (first_name or "Valued Customer").replace('\r', '').replace('\n', '').strip()
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_USER
        msg['To'] = formataddr((safe_display_name, email))
        msg['Subject'] = "Verify Your Standard Chartered Account"
        
        # Attach HTML content
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send email using thread executor to avoid blocking event loop
        await asyncio.to_thread(_send_blocking_email, email, msg, verification_url)
            
        logger.info(f"Verification email sent to {email}")
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")
        raise e
