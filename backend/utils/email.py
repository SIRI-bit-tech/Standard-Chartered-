import logging
import asyncio
import html
import socket
from urllib.parse import quote
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from email.utils import formataddr
from config import settings

logger = logging.getLogger(__name__)


def mask_email(email: str) -> str:
    """Return a masked version of an email address for safe logging.

    Example: 'john.doe@example.com' -> 'j***@example.com'
    """
    try:
        local, domain = email.rsplit("@", 1)
        return f"{local[0]}***@{domain}"
    except Exception:
        return "***"


def _send_blocking_email(msg: MIMEMultipart) -> None:
    """Standardized SMTP connection for high-reliability services like Resend."""
    timeout = 30
    server = None
    try:
        logger.info(f"Connecting to Resend SMTP ({settings.SMTP_SERVER}:{settings.SMTP_PORT})")
        
        # Use SMTP_SSL for Port 465 (Implicit SSL), standard SMTP with STARTTLS for 587
        if int(settings.SMTP_PORT) == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=timeout)
        else:
            server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=timeout)
            server.starttls()
            
        server.set_debuglevel(0)
        # For Resend, username is always 'resend' and password is the API key
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        logger.error(f"SMTP Authentication failed for user {settings.SMTP_USER}. Check App Password.")
        raise
    except (socket.timeout, TimeoutError) as e:
        logger.error(f"SMTP timeout after {timeout}s: {e}")
        raise
    except Exception as e:
        logger.error(f"Failed to send email via {settings.SMTP_SERVER}: {e}")
        raise
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass


async def send_verification_email(email: str, verification_token: str, first_name: str) -> None:
    """Send verification email with 6-digit code to user"""
    try:
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
                  <p>Please use the following 6-digit verification code to activate your account:</p>
                  <div style="margin:24px 0;padding:20px;border:1px solid {border};background:{brand_light};border-radius:12px;text-align:center">
                    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:{brand_primary};font-family:monospace">{verification_token}</span>
                  </div>
                  <p>This code will expire in 24 hours. If you did not request this code, please ignore this email.</p>
                  <p style="margin:12px 0 8px 0;"><strong>What happens next</strong></p>
                  <ul style="margin:0 0 12px 18px;color:{text_primary}">
                    <li>Enter this code on the verification page to unlock your account features.</li>
                    <li>If you don't verify your account, you won't be able to access your dashboard.</li>
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
        msg['From'] = formataddr(("Standard Chartered Bank", settings.SMTP_FROM))
        msg['To'] = formataddr((safe_display_name, email))
        msg['Subject'] = "Verify Your Standard Chartered Account"
        
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send using the blocking function in a separate thread/task
        await asyncio.to_thread(_send_blocking_email, msg)
        logger.info(f"Verification email sent to {mask_email(email)}")
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {mask_email(email)}: {e}")
        raise e

async def send_login_alert(email: str, first_name: str, device_name: str, ip_address: str, location: str) -> None:
    """Send alert about login from new device"""
    try:
        escaped_first_name = html.escape(first_name or "Valued Customer")
        safe_display_name = (first_name or "Valued Customer").replace('\r', '').replace('\n', '').strip()
        brand_primary = "#0073CF"
        text_primary = "#2C2C2C"
        text_secondary = "#6B6B6B"
        
        html_content = f"""
        <html>
          <body style="margin:0;padding:0;background:#F8F9FA;font-family:Arial,sans-serif;">
            <div style="max-width:640px;margin:20px auto;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
              <div style="background:{brand_primary};padding:24px;text-align:center;color:#FFFFFF;">
                <h1 style="margin:0;font-size:24px;">Security Alert</h1>
              </div>
              <div style="padding:32px;color:{text_primary};">
                <p style="font-size:16px;">Hello {escaped_first_name},</p>
                <p style="line-height:1.6;">We detected a login to your Standard Chartered account from a new device.</p>
                
                <div style="background:#F3F4F6;padding:20px;border-radius:8px;margin:24px 0;">
                  <table style="width:100%;font-size:14px;border-collapse:collapse;">
                    <tr>
                      <td style="padding:4px 0;color:{text_secondary};width:100px;"><strong>Device:</strong></td>
                      <td style="padding:4px 0;">{html.escape(device_name)}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:{text_secondary};"><strong>IP Address:</strong></td>
                      <td style="padding:4px 0;">{html.escape(ip_address)}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:{text_secondary};"><strong>Location:</strong></td>
                      <td style="padding:4px 0;">{html.escape(location)}</td>
                    </tr>
                  </table>
                </div>
                
                <p style="margin-top:24px;line-height:1.6;">If this was you, you can safely ignore this email. You may be asked to verify this device again in the future.</p>
                
                <div style="margin-top:32px;padding-top:24px;border-top:1px solid #E5E7EB;color:{text_secondary};font-size:14px;">
                  <p><strong>Wasn't you?</strong></p>
                  <p>Please change your password immediately and contact our fraud department if you see any suspicious activity.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
        """
        
        msg = MIMEMultipart()
        msg['From'] = formataddr(("Standard Chartered Bank", settings.SMTP_FROM))
        msg['To'] = formataddr((safe_display_name, email))
        msg['Subject'] = "Security Alert: New Device Login Detected"
        msg.attach(MIMEText(html_content, 'html'))
        
        await asyncio.to_thread(_send_blocking_email, msg)
        logger.info(f"Login alert sent to {mask_email(email)}")
    except Exception as e:
        logger.error(f"Failed to send login alert to {mask_email(email)}: {e}")
