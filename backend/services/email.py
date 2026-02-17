import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from config import settings
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending verification codes and notifications"""
    
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM
    
    def _create_connection(self) -> smtplib.SMTP:
        """Create SMTP connection"""
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            return server
        except Exception as e:
            logger.error(f"Failed to create SMTP connection: {e}")
            raise
    
    def send_verification_email(self, to_email: str, verification_code: str) -> bool:
        """Send verification code email"""
        try:
            # Create email content
            subject = "Standard Chartered - Email Verification"
            
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #00875A; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Standard Chartered Bank</h1>
                    </div>
                    
                    <div style="padding: 30px; background-color: #f8f9fa;">
                        <h2 style="color: #333;">Email Verification</h2>
                        <p style="color: #666; line-height: 1.6;">
                            Thank you for registering with Standard Chartered Bank. 
                            Please use the verification code below to verify your email address:
                        </p>
                        
                        <div style="background-color: #e9ecef; padding: 20px; text-align: center; 
                                    border-radius: 8px; margin: 20px 0;">
                            <span style="font-size: 24px; font-weight: bold; color: #00875A; 
                                       letter-spacing: 3px;">{verification_code}</span>
                        </div>
                        
                        <p style="color: #666; line-height: 1.6;">
                            This code will expire in <strong>15 minutes</strong>. 
                            If you didn't request this verification, please ignore this email.
                        </p>
                        
                        <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; 
                                    border-left: 4px solid #ffc107; border-radius: 4px;">
                            <p style="margin: 0; color: #856404;">
                                <strong>Security Note:</strong> Never share this code with anyone.
                            </p>
                        </div>
                    </div>
                    
                    <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                        <p style="margin: 0; font-size: 12px;">
                            © 2026 Standard Chartered Bank. All rights reserved.
                        </p>
                    </div>
                </body>
            </html>
            """
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"Standard Chartered Bank <{self.from_email}>"
            msg['To'] = to_email
            
            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email
            with self._create_connection() as server:
                server.send_message(msg)
            
            logger.info(f"Verification email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send verification email to {to_email}: {e}")
            return False
    
    def send_pin_reset_email(self, to_email: str, reset_code: str) -> bool:
        """Send transfer PIN reset code email"""
        try:
            subject = "Standard Chartered - Transfer PIN Reset Code"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #00875A; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Standard Chartered Bank</h1>
                    </div>
                    <div style="padding: 30px; background-color: #f8f9fa;">
                        <h2 style="color: #333;">Transfer PIN Reset</h2>
                        <p style="color: #666; line-height: 1.6;">
                            You requested to reset your transfer PIN. Use the 6‑digit code below to continue:
                        </p>
                        <div style="background-color: #e9ecef; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                            <span style="font-size: 24px; font-weight: bold; color: #00875A; letter-spacing: 3px;">{reset_code}</span>
                        </div>
                        <p style="color: #666; line-height: 1.6;">
                            This code expires in 15 minutes. If you did not request this, please ignore this email.
                        </p>
                    </div>
                    <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                        <p style="margin: 0; font-size: 12px;">
                            © 2026 Standard Chartered Bank. All rights reserved.
                        </p>
                    </div>
                </body>
            </html>
            """

            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"Standard Chartered Bank <{self.from_email}>"
            msg['To'] = to_email
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            with self._create_connection() as server:
                server.send_message(msg)
            logger.info(f"PIN reset email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send PIN reset email to {to_email}: {e}")
            return False
    def send_welcome_email(self, to_email: str, user_name: str) -> bool:
        """Send welcome email after successful verification"""
        try:
            subject = "Welcome to Standard Chartered Bank"
            
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #00875A; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Standard Chartered Bank</h1>
                    </div>
                    
                    <div style="padding: 30px; background-color: #f8f9fa;">
                        <h2 style="color: #333;">Welcome, {user_name}!</h2>
                        <p style="color: #666; line-height: 1.6;">
                            Thank you for verifying your email address. 
                            Your Standard Chartered Bank account is now active and ready to use.
                        </p>
                        
                        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; 
                                    margin: 20px 0; border-left: 4px solid #28a745;">
                            <h3 style="color: #155724; margin-top: 0;">✅ Account Activated</h3>
                            <p style="color: #155724; margin-bottom: 0;">
                                You can now access all banking services including transfers, 
                                account management, and more.
                            </p>
                        </div>
                        
                        <p style="color: #666; line-height: 1.6;">
                            If you have any questions or need assistance, 
                            please don't hesitate to contact our support team.
                        </p>
                    </div>
                    
                    <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                        <p style="margin: 0; font-size: 12px;">
                            © 2026 Standard Chartered Bank. All rights reserved.
                        </p>
                    </div>
                </body>
            </html>
            """
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"Standard Chartered Bank <{self.from_email}>"
            msg['To'] = to_email
            
            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email
            with self._create_connection() as server:
                server.send_message(msg)
            
            logger.info(f"Welcome email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {to_email}: {e}")
            return False
    
    def send_card_ready_email(self, to_email: str, card_name: str, card_type: str, expiry_month: int, expiry_year: int) -> bool:
        try:
            subject = "Your Virtual Card Is Ready"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #00875A; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Standard Chartered Bank</h1>
                    </div>
                    <div style="padding: 30px; background-color: #f8f9fa;">
                        <h2 style="color: #333;">Virtual Card Generated</h2>
                        <p style="color: #666; line-height: 1.6;">
                            Your virtual card is now active and ready to use.
                        </p>
                        <div style="background-color: #E8F5E9; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #28a745;">
                            <p style="color: #155724; margin: 0;">
                                <strong>Name:</strong> {card_name}<br/>
                                <strong>Type:</strong> {card_type.title()}<br/>
                                <strong>Expiry:</strong> {expiry_month:02d}/{expiry_year}
                            </p>
                        </div>
                        <p style="color: #666; line-height: 1.6;">
                            For security, we do not include card numbers in email. View details in your dashboard.
                        </p>
                        <a href="{settings.FRONTEND_URL}/dashboard/virtual-cards" style="display:inline-block;background:#00875A;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">View Card</a>
                    </div>
                    <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
                        <p style="margin: 0; font-size: 12px;">
                            © 2026 Standard Chartered Bank. All rights reserved.
                        </p>
                    </div>
                </body>
            </html>
            """
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"Standard Chartered Bank <{self.from_email}>"
            msg['To'] = to_email
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            with self._create_connection() as server:
                server.send_message(msg)
            logger.info(f"Card ready email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send card ready email to {to_email}: {e}")
            return False
    
    def send_transfer_reversed_email(self, to_email: str, amount: float, currency: str, reference: str) -> bool:
        """Notify user by email that a transfer was reversed and funds credited back."""
        try:
            subject = "Transfer Reversed — Funds Credited Back"
            formatted_amount = f"{currency} {amount:,.2f}"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #00875A; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Standard Chartered Bank</h1>
                    </div>
                    <div style="padding: 30px; background-color: #f8f9fa;">
                        <h2 style="color: #333;">Transfer Reversed</h2>
                        <p style="color: #444; line-height: 1.6;">
                            Your transfer with reference <strong>{reference}</strong> has been <strong>reversed</strong>.
                        </p>
                        <p style="color: #444; line-height: 1.6;">
                            We have credited <strong>{formatted_amount}</strong> back to your funding account.
                        </p>
                        <p style="color: #666; line-height: 1.6; margin-top: 16px;">
                            Your balance has been updated. You can also view this in Transfers → History.
                        </p>
                    </div>
                    <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
                        © 2026 Standard Chartered Bank. All rights reserved.
                    </div>
                </body>
            </html>
            """
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"Standard Chartered Bank <{self.from_email}>"
            msg['To'] = to_email
            msg.attach(MIMEText(html_content, 'html'))
            with self._create_connection() as server:
                server.send_message(msg)
            logger.info(f"Transfer reversed email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send transfer reversed email to {to_email}: {e}")
            return False
# Global email service instance
email_service = EmailService()
