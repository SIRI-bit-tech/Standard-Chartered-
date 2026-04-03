"""
Statement Generation Service
Handles generation, storage, and delivery of account statements
"""
import io
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import cloudinary
import cloudinary.uploader
from config import settings
from models.user import User
from models.account import Account, Statement
from models.transaction import Transaction
from utils.pdf_generator import generate_statement_pdf
from utils.email import send_statement_email
from utils.logger import logger


# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)


class StatementService:
    """Service for generating and managing account statements"""
    
    @staticmethod
    async def generate_user_statement(
        db: AsyncSession,
        user_id: str,
        start_date: datetime,
        end_date: datetime,
        send_email: bool = False
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive statement for all user accounts
        
        Args:
            db: Database session
            user_id: User ID
            start_date: Statement period start
            end_date: Statement period end
            send_email: Whether to email the statement to user
            
        Returns:
            Dict with statement URLs and metadata
        """
        try:
            # Get user data
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise ValueError(f"User {user_id} not found")
            
            # Get all user accounts
            accounts_result = await db.execute(
                select(Account).where(
                    and_(
                        Account.user_id == user_id,
                        Account.status == 'active'
                    )
                )
            )
            accounts = accounts_result.scalars().all()
            
            if not accounts:
                raise ValueError(f"No active accounts found for user {user_id}")
            
            # Prepare user data for PDF
            user_data = {
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'user_id': user.id
            }
            
            # Prepare accounts data with transactions
            accounts_data = []
            statement_records = []
            
            for account in accounts:
                # Get transactions for this account in the period
                trans_result = await db.execute(
                    select(Transaction).where(
                        and_(
                            Transaction.account_id == account.id,
                            Transaction.created_at >= start_date,
                            Transaction.created_at <= end_date,
                            Transaction.status == 'completed'
                        )
                    ).order_by(Transaction.created_at.asc())
                )
                transactions = trans_result.scalars().all()
                
                # Calculate opening balance (balance before first transaction)
                opening_balance = account.balance
                if transactions:
                    opening_balance = transactions[0].balance_before
                
                # Calculate totals
                total_credits = sum(t.amount for t in transactions if t.amount > 0)
                total_debits = sum(abs(t.amount) for t in transactions if t.amount < 0)
                closing_balance = account.balance
                
                # Prepare account data
                account_data = {
                    'id': account.id,
                    'type': account.account_type.value if hasattr(account.account_type, 'value') else str(account.account_type),
                    'account_number': account.account_number,
                    'currency': account.currency,
                    'opening_balance': opening_balance,
                    'closing_balance': closing_balance,
                    'total_credits': total_credits,
                    'total_debits': total_debits,
                    'transactions': [
                        {
                            'date': t.created_at,
                            'description': t.description,
                            'reference_number': t.reference_number,
                            'amount': t.amount,
                            'balance_after': t.balance_after,
                            'type': t.type.value if hasattr(t.type, 'value') else str(t.type)
                        }
                        for t in transactions
                    ]
                }
                
                accounts_data.append(account_data)
                
                # Create statement record for this account
                statement_id = str(uuid.uuid4())
                statement_records.append({
                    'id': statement_id,
                    'account_id': account.id,
                    'opening_balance': opening_balance,
                    'closing_balance': closing_balance,
                    'total_credits': total_credits,
                    'total_debits': total_debits
                })
            
            # Generate PDF
            pdf_bytes = generate_statement_pdf(
                user_data=user_data,
                accounts_data=accounts_data,
                start_date=start_date,
                end_date=end_date
            )
            
            # Upload to Cloudinary
            statement_filename = f"statement_{user_id}_{start_date.strftime('%Y%m')}_{uuid.uuid4().hex[:8]}.pdf"
            
            upload_result = cloudinary.uploader.upload(
                io.BytesIO(pdf_bytes),
                resource_type="raw",
                folder="statements",
                public_id=statement_filename,
                overwrite=True,
                invalidate=True
            )
            
            document_url = upload_result.get('secure_url')
            
            # Save statement records to database
            for stmt_data in statement_records:
                statement = Statement(
                    id=stmt_data['id'],
                    account_id=stmt_data['account_id'],
                    statement_date=datetime.utcnow(),
                    start_date=start_date,
                    end_date=end_date,
                    document_url=document_url,
                    opening_balance=stmt_data['opening_balance'],
                    closing_balance=stmt_data['closing_balance'],
                    total_credits=stmt_data['total_credits'],
                    total_debits=stmt_data['total_debits']
                )
                db.add(statement)
            
            await db.commit()
            
            # Send email if requested
            if send_email and user.email:
                try:
                    await send_statement_email(
                        email=user.email,
                        first_name=user.first_name,
                        statement_url=document_url,
                        start_date=start_date,
                        end_date=end_date
                    )
                    logger.info(f"Statement email sent to {user.email}")
                except Exception as e:
                    logger.error(f"Failed to send statement email: {e}")
            
            return {
                'success': True,
                'document_url': document_url,
                'statement_date': datetime.utcnow().isoformat(),
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'accounts_count': len(accounts_data),
                'email_sent': send_email
            }
            
        except Exception as e:
            logger.error(f"Failed to generate statement for user {user_id}: {e}")
            raise
    
    @staticmethod
    async def generate_monthly_statements(db: AsyncSession) -> Dict[str, Any]:
        """
        Generate monthly statements for all active users
        Called by scheduled job at end of month
        
        Returns:
            Dict with generation statistics
        """
        try:
            # Calculate previous month date range
            today = datetime.utcnow()
            first_day_this_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_day_last_month = first_day_this_month - timedelta(days=1)
            first_day_last_month = last_day_last_month.replace(day=1)
            
            start_date = first_day_last_month
            end_date = last_day_last_month.replace(hour=23, minute=59, second=59)
            
            # Get all active users with accounts
            users_result = await db.execute(
                select(User).where(User.is_active == True)
            )
            users = users_result.scalars().all()
            
            success_count = 0
            error_count = 0
            errors = []
            
            for user in users:
                try:
                    # Check if user has any accounts
                    accounts_result = await db.execute(
                        select(Account).where(
                            and_(
                                Account.user_id == user.id,
                                Account.status == 'active'
                            )
                        )
                    )
                    accounts = accounts_result.scalars().all()
                    
                    if not accounts:
                        continue
                    
                    # Generate statement with email
                    await StatementService.generate_user_statement(
                        db=db,
                        user_id=user.id,
                        start_date=start_date,
                        end_date=end_date,
                        send_email=True
                    )
                    
                    success_count += 1
                    logger.info(f"Generated monthly statement for user {user.id}")
                    
                except Exception as e:
                    error_count += 1
                    error_msg = f"User {user.id}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(f"Failed to generate statement for user {user.id}: {e}")
            
            return {
                'success': True,
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'total_users': len(users),
                'success_count': success_count,
                'error_count': error_count,
                'errors': errors[:10]  # Limit error list
            }
            
        except Exception as e:
            logger.error(f"Failed to generate monthly statements: {e}")
            raise
