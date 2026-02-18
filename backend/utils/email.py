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
        encoded_token = quote(verification_token, safe='')
        verification_url = f"{settings.FRONTEND_URL}/dashboard/verify-email?token={encoded_token}"
        escaped_first_name = html.escape(first_name or "Valued Customer")
        safe_display_name = (first_name or "Valued Customer").replace('\r', '').replace('\n', '').strip()
        brand_primary = "#0073CF"
        brand_light = "#E6F2FF"
        text_primary = "#2C2C2C"
        text_secondary = "#6B6B6B"
        border = "#E5E7EB"
        logo_url = f"{settings.FRONTEND_URL}/logo.png" if getattr(settings, "FRONTEND_URL", None) else None
        header_brand = f"<img src='{logo_url}' alt='Standard Chartered' style='height:42px'/>" if logo_url else "<div style='font-weight:700;font-size:18px;color:%s'>Standard Chartered</div>" % brand_primary
        html_content = f"""
        <html>
          <body style="margin:0;padding:0;background:#F8F9FA;">
            <div style="max-width:640px;margin:0 auto;">
              <div style="background:#FFFFFF;padding:16px 20px;border-bottom:3px solid {brand_primary};text-align:center">
                {header_brand}
              </div>
              <div style="background:#FFFFFF;padding:24px;">
                <h2 style="margin:0 0 8px 0;color:{text_primary};font-family:Arial,sans-serif">Verify Your Email</h2>
                <div style="color:{text_secondary};font-family:Arial,sans-serif;line-height:1.6;font-size:14px">
                  <p>Hello {escaped_first_name},</p>
                  <p>Confirm your email to activate your account and start banking with us.</p>
                  <div style="margin:16px 0;padding:16px;border:1px solid {border};background:{brand_light};border-radius:8px;text-align:center">
                    <a href="{verification_url}" style="display:inline-block;background:{brand_primary};color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Verify Email</a>
                  </div>
                  <p style="margin:0 0 8px 0;"><strong>Having trouble?</strong></p>
                  <p>If the button doesn’t work, copy and paste this link into your browser:</p>
                  <p style="word-break:break-all;color:{text_primary}">{verification_url}</p>
                  <p style="margin:12px 0 8px 0;"><strong>What happens next</strong></p>
                  <ul style="margin:0 0 12px 18px;color:{text_primary}">
                    <li>Your account features unlock after verification.</li>
                    <li>If you didn’t request this, you can ignore this email safely.</li>
                  </ul>
                  <p>Need assistance? Visit Support in your dashboard after logging in.</p>
                </div>
              </div>
              <div style="padding:16px;text-align:center;color:#9CA3AF;font-family:Arial,sans-serif;font-size:12px">
                © 2026 Standard Chartered Bank. All rights reserved.
              </div>
            </div>
          </body>
        </html>
        """
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_USER
        msg['To'] = formataddr((safe_display_name, email))
        msg['Subject'] = "Verify Your Standard Chartered Account"
        
        msg.attach(MIMEText(html_content, 'html'))
        
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")
        raise e
