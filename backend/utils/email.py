import logging
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from email.utils import formataddr
from config import settings

logger = logging.getLogger(__name__)


async def send_verification_email(email: str, verification_token: str, first_name: str) -> None:
    """Send verification email to user"""
    try:
        # Create email message
        verification_url = f"{settings.FRONTEND_URL}/dashboard/verify-email?token={verification_token}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
                <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome to Standard Chartered</h2>
                    <p style="color: #666; font-size: 16px;">Dear {first_name},</p>
                    <p style="color: #666; font-size: 16px;">Thank you for registering with Standard Chartered. Your account has been created successfully.</p>
                    <p style="color: #666; font-size: 16px;">To complete your registration, please verify your email address by clicking the link below:</p>
                    <p style="color: #666; font-size: 16px;"><a href="{verification_url}" style="color: #007bff; text-decoration: none; font-weight: bold;">Verify Email Address</a></p>
                    <p style="color: #666; font-size: 16px;">This verification link will expire in 24 hours.</p>
                    <p style="color: #999; font-size: 14px;">If you did not request this verification, please contact our support team.</p>
                    <p style="color: #666; font-size: 16px;">Best regards,<br>Standard Chartered Team</p>
                </div>
            </body>
        </html>
        """
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_USER
        msg['To'] = formataddr((email,))
        msg['Subject'] = "Verify Your Standard Chartered Account"
        
        # Attach HTML content
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send email
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            
        logger.info(f"Verification email sent to {email}")
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")
        raise e
