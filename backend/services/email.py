import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import Optional
from html import escape
from config import settings
import logging
import os
import base64

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending verification codes and notifications"""
    
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM
        self.brand_primary = "#0073CF"
        self.brand_primary_dark = "#0059a6"
        self.brand_light = "#E6F2FF"
        self.text_primary = "#2C2C2C"
        self.text_secondary = "#6B6B6B"
        self.surface = "#FFFFFF"
        self.background = "#F8F9FA"
        self.border = "#E5E7EB"
        self.logo_url = f"{settings.FRONTEND_URL}/SCIB logo.svg" if getattr(settings, "FRONTEND_URL", None) else None
        self.logo_data_uri = None
        self.logo_file_path = None
        self.logo_cid = "brandlogo"
        candidates = []
        explicit_path = getattr(settings, "LOGO_PATH", None)
        if explicit_path:
            candidates.append(explicit_path)
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        # Prioritize "SCIB logo.svg" as requested
        candidates.append(os.path.abspath(os.path.join(base_dir, "..", "frontend", "public", "SCIB logo.svg")))
        candidates.append(os.path.abspath(os.path.join(base_dir, "public", "SCIB logo.svg")))
        candidates.append(os.path.abspath(os.path.join(base_dir, "..", "frontend", "public", "standardcharted.png")))
        candidates.append(os.path.abspath(os.path.join(base_dir, "public", "standardcharted.png")))
        for p in candidates:
            try:
                if os.path.exists(p):
                    self.logo_file_path = p
                    file_ext = os.path.splitext(p)[1].lower().replace('.', '')
                    mime_type = "image/svg+xml" if file_ext == "svg" else f"image/{file_ext}"
                    with open(p, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("ascii")
                        self.logo_data_uri = f"data:{mime_type};base64,{b64}"
                    break
            except Exception:
                continue
    
    def _wrap_html(self, title: str, inner_html: str) -> str:
        logo_html = f'<img src="cid:{self.logo_cid}" alt="SCIB Logo" style="height:40px;display:block;margin-bottom:8px;" />' if self.logo_file_path else ""
        header_brand = f"""
            <div style='display:flex;align-items:center;gap:12px;'>
                {logo_html}
                <div style='font-weight:700;font-size:24px;color:{self.brand_primary};letter-spacing:-0.02em;'>SCIB</div>
            </div>
        """
        return f"""
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <style>
              @media only screen and (max-width: 600px) {{
                .container {{ width: 100% !important; padding: 10px !important; }}
                .content {{ padding: 20px !important; }}
              }}
            </style>
          </head>
          <body style="margin:0;padding:0;background:{self.background};-webkit-font-smoothing:antialiased;">
            <div style="padding:40px 10px;" class="container">
              <div style="max-width:600px;margin:0 auto;background:{self.surface};border:1px solid {self.border};border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.03);overflow:hidden;">
                <div style="padding:24px 32px;border-bottom:1px solid {self.border};">
                  {header_brand}
                </div>
                <div style="padding:32px 32px 16px 32px;" class="content">
                  <h2 style="margin:0 0 16px 0;color:{self.text_primary};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.01em;">{title}</h2>
                  <div style="color:{self.text_secondary};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;font-size:16px;">
                    {inner_html}
                  </div>
                </div>
                <div style="padding:24px 32px;border-top:1px solid {self.border};text-align:left;color:#94A3B8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;background:#FAFAFA;">
                  <p style="margin:0;">&copy; 2026 SCIB International Banking. All rights reserved.</p>
                  <p style="margin:4px 0 0 0;">Secure Communication &bull; Confidential</p>
                </div>
              </div>
            </div>
          </body>
        </html>
        """
    
    def _build_message(self, subject: str, to_email: str, html_content: str) -> MIMEMultipart:
        root = MIMEMultipart('related')
        alt = MIMEMultipart('alternative')
        root.attach(alt)
        html_part = MIMEText(html_content, 'html')
        alt.attach(html_part)
        root['Subject'] = subject
        root['From'] = f"SCIB Bank <{self.from_email}>"
        root['To'] = to_email
        if self.logo_file_path:
            try:
                with open(self.logo_file_path, "rb") as f:
                    file_ext = os.path.splitext(self.logo_file_path)[1].lower().replace('.', '')
                    subtype = "svg+xml" if file_ext == "svg" else file_ext
                    img = MIMEImage(f.read(), _subtype=subtype)
                    img.add_header('Content-ID', f"<{self.logo_cid}>")
                    img.add_header('Content-Disposition', 'inline', filename=os.path.basename(self.logo_file_path))
                    root.attach(img)
            except Exception:
                pass
        return root
    
    def _create_connection(self) -> smtplib.SMTP | smtplib.SMTP_SSL:
        """Create SMTP or SMTP_SSL connection"""
        try:
            if str(self.smtp_port) == "465":
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10)
                server.starttls()
            
            server.login(self.smtp_user, self.smtp_password)
            return server
        except Exception as e:
            logger.error(f"Failed to create SMTP connection: {e}")
            raise
    
    def send_verification_email(self, to_email: str, verification_code: str) -> bool:
        """Send verification code email"""
        try:
            subject = "SCIB - Email Verification"
            code_html = f"""
              <p>Hello,</p>
              <p>Thank you for registering with SCIB Bank. Use the verification code below to verify your email address and complete your setup:</p>
              <div style="margin:16px 0;padding:16px;border:1px solid {self.border};background:{self.brand_light};border-radius:8px;text-align:center">
                <span style="font-size:24px;font-weight:700;letter-spacing:3px;color:{self.brand_primary}">{verification_code}</span>
              </div>
              <p style="margin:0 0 8px 0;"><strong>What happens next</strong></p>
              <ul style="margin:0 0 12px 18px;color:{self.text_primary}">
                <li>The code expires in 15 minutes.</li>
                <li>Once verified, you can access all features in your dashboard.</li>
                <li>If the code expires, you can request a new one from the login screen.</li>
              </ul>
              <p style="margin:0 0 8px 0;"><strong>Security tips</strong></p>
              <ul style="margin:0 0 12px 18px;color:{self.text_primary}">
                <li>Never share your verification code with anyone.</li>
                <li>Only enter codes on our official website.</li>
              </ul>
              <p>If you didn’t request this, please ignore this email. For assistance, visit your dashboard and go to Support, or contact us via the Support page.</p>
            """
            html_content = self._wrap_html("Email Verification", code_html)
            
            msg = self._build_message(subject, to_email, html_content)
            
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
            subject = "SCIB - Transfer PIN Reset Code"
            body = f"""
              <p>Hello,</p>
              <p>We received a request to reset your transfer PIN. Use the 6‑digit code below to continue:</p>
              <div style="margin:16px 0;padding:16px;border:1px solid {self.border};background:{self.brand_light};border-radius:8px;text-align:center">
                <span style="font-size:24px;font-weight:700;letter-spacing:3px;color:{self.brand_primary}">{reset_code}</span>
              </div>
              <p style="margin:0 0 8px 0;"><strong>Next steps</strong></p>
              <ul style="margin:0 0 12px 18px;color:{self.text_primary}">
                <li>Open your dashboard and navigate to Profile → Security.</li>
                <li>Enter the code above and create a new transfer PIN.</li>
                <li>This code expires in 15 minutes.</li>
              </ul>
              <p style="margin:0 0 8px 0;"><strong>Security tips</strong></p>
              <ul style="margin:0 0 12px 18px;color:{self.text_primary}">
                <li>If you did not request this, secure your account by changing your password.</li>
                <li>Never disclose your PIN or codes to anyone, including support agents.</li>
              </ul>
              <p>Need help? Go to Support in your dashboard and start a new ticket or chat.</p>
            """
            html_content = self._wrap_html("Transfer PIN Reset", body)

            msg = self._build_message(subject, to_email, html_content)
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
            subject = "Welcome to SCIB Bank"
            body = f"""
              <p>Hello {user_name},</p>
              <p>Welcome to SCIB. Your account is now active and ready to use.</p>
              <p style="margin:0 0 8px 0;"><strong>Get started</strong></p>
              <ul style="margin:0 0 12px 18px;color:{self.text_primary}">
                <li>View your balances and recent activity in Accounts.</li>
                <li>Set your transfer PIN and review security preferences.</li>
                <li>Enable two‑factor authentication for extra protection.</li>
              </ul>
              <div style="margin:16px 0;padding:16px;border:1px solid {self.border};background:{self.brand_light};border-radius:8px;">
                <p style="margin:0;color:{self.text_primary}"><strong>Quick links</strong></p>
                <ul style="margin:8px 0 0 18px;color:{self.text_primary}">
                  <li><a href="{settings.FRONTEND_URL}/dashboard/accounts" style="color:{self.brand_primary};text-decoration:none">Accounts</a></li>
                  <li><a href="{settings.FRONTEND_URL}/dashboard/transfers" style="color:{self.brand_primary};text-decoration:none">Transfers</a></li>
                  <li><a href="{settings.FRONTEND_URL}/dashboard/profile" style="color:{self.brand_primary};text-decoration:none">Profile & Security</a></li>
                </ul>
              </div>
              <a href="{settings.FRONTEND_URL}/dashboard" style="display:inline-block;background:{self.brand_primary};color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Go to Dashboard</a>
              <p style="margin-top:16px">Need assistance? Visit Support in your dashboard for help or to contact our team.</p>
            """
            html_content = self._wrap_html("Welcome", body)
            
            msg = self._build_message(subject, to_email, html_content)
            
            with self._create_connection() as server:
                server.send_message(msg)
            
            logger.info(f"Welcome email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {to_email}: {e}")
            return False

    def send_approval_email(self, to_email: str, first_name: str) -> bool:
        """Send account approval email to user"""
        try:
            subject = "Account Approved - Welcome to SCIB"
            body = f"""
              <p>Hello {first_name},</p>
              <p>Great news! Your registration with SCIB Bank has been reviewed and <strong>approved</strong>. Your account is now fully active and ready for use.</p>
              <p>You can now log in using your registered username and password. For your security, on your first login, you will be required to set a 4-digit transfer PIN to protect your transactions.</p>
              
              <div style="margin:24px 0; text-align:center">
                <a href="{settings.FRONTEND_URL}/auth/login" style="display:inline-block; background-color:{self.brand_primary}; color:#ffffff; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:700; font-size:16px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">Click here to Login</a>
              </div>

              <p style="margin:24px 0 8px 0;"><strong>What you can do now:</strong></p>
              <ul style="margin:0 0 24px 18px; color:{self.text_primary}">
                <li>Set your secure 4-digit transfer PIN.</li>
                <li>Fund your account and start making instant transfers.</li>
                <li>Apply for virtual cards and manageable loans.</li>
                <li>Experience seamless global banking at your fingertips.</li>
              </ul>

              <div style="padding:20px; background-color:#F1F5F9; border-radius:12px; border:1px solid {self.border}; margin-bottom:24px;">
                <p style="margin:0 0 12px 0; font-size:14px; color:{self.text_secondary};"><strong>Security Notice:</strong> If you did not register for an account with SCIB Bank using this email address, please contact our security team immediately by clicking the button below.</p>
                <div style="text-align:left">
                  <a href="mailto:support@standardcharteredibank.com" style="display:inline-block; background-color:#ffffff; color:{self.brand_primary}; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600; font-size:14px; border:1px solid {self.brand_primary};">Contact Support</a>
                </div>
              </div>

              <p style="font-size:14px; color:{self.text_secondary};">If you have any questions, our support team is available 24/7 through support@standardcharteredibank.com.</p>
              <p>Welcome to the future of banking!</p>
            """
            html_content = self._wrap_html("Account Approved", body)
            
            msg = self._build_message(subject, to_email, html_content)
            
            with self._create_connection() as server:
                server.send_message(msg)
            
            logger.info(f"Approval email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send approval email to {to_email}: {e}")
            return False
    
    def send_card_ready_email(self, to_email: str, card_name: str, card_type: str, expiry_month: int, expiry_year: int) -> bool:
        try:
            subject = "Your Virtual Card Is Ready"
            body = f"""
              <p>Hello,</p>
              <p>Your virtual card is now active and ready to use.</p>
              <div style="margin:16px 0;padding:16px;border:1px solid {self.border};background:{self.brand_light};border-radius:8px;">
                <p style="margin:0;color:{self.text_primary}">
                  <strong>Name:</strong> {card_name}<br/>
                  <strong>Type:</strong> {card_type.title()}<br/>
                  <strong>Expiry:</strong> {expiry_month:02d}/{expiry_year}
                </p>
              </div>
              <p style="margin:0 0 8px 0;"><strong>How to use</strong></p>
              <ul style="margin:0 0 12px 18px;color:{self.text_primary}">
                <li>Find your card details under Dashboard → Cards.</li>
                <li>Use for online purchases where virtual cards are accepted.</li>
                <li>Freeze or delete the card anytime from the dashboard.</li>
              </ul>
              <p>For security, we do not include card numbers in email. View full details in your dashboard.</p>
              <a href="{settings.FRONTEND_URL}/dashboard/virtual-cards" style="display:inline-block;background:{self.brand_primary};color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View Card</a>
              <p style="margin-top:16px">If you see unfamiliar activity, freeze the card immediately and contact Support.</p>
            """
            html_content = self._wrap_html("Virtual Card Ready", body)
            msg = self._build_message(subject, to_email, html_content)
            with self._create_connection() as server:
                server.send_message(msg)
            logger.info(f"Card ready email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send card ready email to {to_email}: {e}")
            return False
    
    def send_transfer_reversed_email(self, to_email: str, amount: float, currency: str, reference: str, reason: Optional[str] = None) -> bool:
        """Notify user by email that a transfer was reversed and funds credited back."""
        try:
            subject = "Transfer Reversed — Funds Credited Back"
            formatted_amount = f"{currency} {amount:,.2f}"
            body = f"""
              <p>Hello,</p>
              <p>We reversed your transfer with reference <strong>{reference}</strong>.</p>
              <div style="margin:12px 0;padding:12px;border:1px solid {self.border};background:{self.brand_light};border-radius:6px;">
                <p style="margin:0;color:{self.text_primary}">
                  <strong>Amount credited back:</strong> {formatted_amount}<br/>
                  <strong>Reference:</strong> {reference}
                </p>
              </div>
              {f"<div style='margin:12px 0;padding:12px;border:1px solid {self.border};background:#FFF;border-radius:6px;'><p style='margin:0;color:{self.text_primary}'><strong>Reason for reversal:</strong> {reason}</p></div>" if (reason or '').strip() else ""}
              <p style="margin:0 0 8px 0;"><strong>What this means</strong></p>
              <ul style="margin:0 0 12px 18px;color:{self.text_primary}">
                <li>Your available balance has been updated.</li>
                <li>You can view the updated transfer status in your dashboard.</li>
                <li>If this reversal was unexpected, review your recent activity and contact Support.</li>
              </ul>
              <a href="{settings.FRONTEND_URL}/dashboard/transfers" style="display:inline-block;background:{self.brand_primary};color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View Transfers</a>
              <p style="margin-top:16px">For questions or to dispute this reversal, open a ticket in Support from your dashboard.</p>
            """
            html_content = self._wrap_html("Transfer Reversed", body)
            msg = self._build_message(subject, to_email, html_content)
            with self._create_connection() as server:
                server.send_message(msg)
            logger.info(f"Transfer reversed email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send transfer reversed email to {to_email}: {e}")
            return False
    
    def send_profile_update_notice(
        self,
        to_email: str,
        user_name: str,
        changed_fields: list[str],
        old_email: str | None = None,
        new_email: str | None = None,
        acted_by: str | None = "Support"
    ) -> bool:
        try:
            subject = "Your Profile Was Updated"
            items = "".join([f"<li style='margin:6px 0'>{f.replace('_',' ').title()}</li>" for f in changed_fields]) or "<li>No fields listed</li>"
            emailNote = ""
            if old_email and new_email and old_email != new_email:
                emailNote = f"<div style='padding:12px 16px;border:1px solid {self.border};background:{self.brand_light};border-radius:6px;margin:12px 0;color:{self.text_primary}'><strong>Email changed:</strong> {old_email} → {new_email}</div>"
            actor_display = acted_by or "our team"
            if "@" in actor_display:
                actor_display = "our team"
            body = f"""
              <p>Hello {user_name or "Customer"},</p>
              <p>Your profile information was updated by {actor_display}.</p>
              <p style="margin:0 0 8px 0;"><strong>Changes recorded</strong></p>
              <ul style="padding-left:18px;color:{self.text_primary}">{items}</ul>
              {emailNote}
              <p style="margin:0 0 8px 0;"><strong>Review and security</strong></p>
              <ul style="margin:0 0 12px 18px;color:{self.text_primary}">
                <li>Review your profile details in your dashboard.</li>
                <li>If you did not request these changes, secure your account immediately.</li>
                <li>Open a Support ticket if you require assistance.</li>
              </ul>
              <a href="{settings.FRONTEND_URL}/dashboard/profile" style="display:inline-block;margin-top:12px;background:{self.brand_primary};color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View Profile</a>
              <div style="margin-top:16px;padding:12px 16px;border:1px solid {self.border};background:#FFF;border-radius:8px;">
                <p style="margin:0;color:{self.text_primary}">If you did not make this request, please <a href="mailto:support@standardcharteredibank.com" style="color:{self.brand_primary};text-decoration:none">contact Support immediately</a>.</p>
              </div>
            """
            html_content = self._wrap_html("Profile Updated", body)
            msg = self._build_message(subject, to_email, html_content)
            with self._create_connection() as server:
                server.send_message(msg)
            logger.info(f"Profile update notice sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send profile update notice to {to_email}: {e}")
            return False
    
    def send_support_ticket_reply(self, to_email: str, ticket_number: str, ticket_subject: str, reply_text: str) -> bool:
        """Notify user by email that an admin replied to their support ticket."""
        try:
            subject = f"Official Support Update: Ticket #{ticket_number}"
            safe_subject = escape(ticket_subject or "General Inquiry")
            safe_reply = escape(reply_text or "").replace("\n", "<br>")
            
            inner_html = f"""
              <p style="margin-top:0;">Dear Client,</p>
              <p>This is an official update regarding your support request <strong>#{ticket_number}</strong>.</p>
              
              <div style="margin:32px 0; padding:24px; background-color:#F8FAFC; border-left:4px solid {self.brand_primary}; border-radius:4px;">
                <p style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:{self.brand_primary}; text-transform:uppercase; letter-spacing:0.05em;">Inquiry Subject</p>
                <p style="margin:0 0 20px 0; font-weight:600; color:{self.text_primary};">{safe_subject}</p>
                
                <p style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:{self.brand_primary}; text-transform:uppercase; letter-spacing:0.05em;">Advisor's Response</p>
                <div style="margin:0; color:{self.text_primary}; line-height:1.6;">{safe_reply}</div>
              </div>

              <p>To provide further details or documentation, please access our secure client portal.</p>
              
              <div style="margin:32px 0;">
                <a href="{settings.FRONTEND_URL}/dashboard/support" style="display:inline-block; background-color:{self.brand_primary}; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:700; font-size:16px;">Access Secure Dashboard</a>
              </div>

              <p style="font-size:14px; color:#64748B;">For your protection, SCIB will never ask for your full credit card number, PIN, or secure access codes via email. Always ensure you are on our official domain before entering credentials.</p>
            """
            
            html_content = self._wrap_html("Support Update", inner_html)
            msg = self._build_message(subject, to_email, html_content)
            
            with self._create_connection() as server:
                server.send_message(msg)
            logger.info(f"Support reply email sent to {to_email} for ticket {ticket_number}")
            return True
        except Exception as e:
            logger.error(f"Failed to send support reply email to {to_email}: {e}")
            return False

    def send_loan_status_email(self, to_email: str, status: str, amount: float, reason: str = "") -> bool:
        """Notify user about loan application status"""
        try:
            subject = f"Loan Application {status}"
            formatted_amount = f"${amount:,.2f}"
            
            if status.lower() == "approved":
                title = "Loan Application Approved"
                message = f"""
                    <p>Great news! Your loan application for <strong>{formatted_amount}</strong> has been approved.</p>
                    <p>The funds have been disbursed to your selected account. You can now access them immediately.</p>
                    <div style="margin:16px 0;padding:16px;border:1px solid {self.border};background:{self.brand_light};border-radius:8px;">
                        <p style="margin:0;color:{self.text_primary}">
                            <strong>Approved Amount:</strong> {formatted_amount}<br/>
                            <strong>Status:</strong> Disbursement Completed
                        </p>
                    </div>
                """
            else:
                title = "Loan Application Update"
                message = f"""
                    <p>We have reviewed your loan application for <strong>{formatted_amount}</strong>.</p>
                    <p>Regrettably, we are unable to approve your application at this time.</p>
                    {f"<p><strong>Reason:</strong> {escape(reason)}</p>" if reason else ""}
                    <p>If you have any questions, our support team is available to help.</p>
                """
                
            body = f"""
                <p>Hello,</p>
                {message}
                <a href="{settings.FRONTEND_URL}/dashboard/loans" style="display:inline-block;background:{self.brand_primary};color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View Loan Details</a>
                <p style="margin-top:16px">Thank you for choosing SCIB Bank.</p>
            """
            
            html_content = self._wrap_html(title, body)
            msg = self._build_message(subject, to_email, html_content)
            with self._create_connection() as server:
                server.send_message(msg)
            logger.info(f"Loan status email ({status}) sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send loan status email to {to_email}: {e}")
            return False

    def send_custom_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send custom email with branding"""
        try:
            msg = self._build_message(subject, to_email, html_content)
            with self._create_connection() as server:
                server.send_message(msg)
            logger.info(f"Custom email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send custom email to {to_email}: {e}")
            return False

# Global email service instance
email_service = EmailService()
