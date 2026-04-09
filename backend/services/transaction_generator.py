import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from decimal import Decimal
from data.names_database import (
    AMERICAN_MALE_FIRST_NAMES,
    AMERICAN_FEMALE_FIRST_NAMES,
    AMERICAN_LAST_NAMES,
    AMERICAN_MERCHANTS,
    P2P_DESCRIPTIONS,
    INCOME_DESCRIPTIONS
)


class TransactionGenerator:
    """Generate realistic transaction history with high amounts"""
    
    def __init__(self):
        self.used_names = set()  # Track used names to ensure uniqueness
    
    def get_unique_person_name(self) -> str:
        """Generate a unique person name (no duplicates)"""
        max_attempts = 1000
        for _ in range(max_attempts):
            # Randomly choose male or female first name
            if random.choice([True, False]):
                first_name = random.choice(AMERICAN_MALE_FIRST_NAMES)
            else:
                first_name = random.choice(AMERICAN_FEMALE_FIRST_NAMES)
            
            last_name = random.choice(AMERICAN_LAST_NAMES)
            full_name = f"{first_name} {last_name}"
            
            if full_name not in self.used_names:
                self.used_names.add(full_name)
                return full_name
        
        # Fallback: add middle initial if we somehow run out
        first_name = random.choice(AMERICAN_MALE_FIRST_NAMES + AMERICAN_FEMALE_FIRST_NAMES)
        middle_initial = random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        last_name = random.choice(AMERICAN_LAST_NAMES)
        full_name = f"{first_name} {middle_initial}. {last_name}"
        self.used_names.add(full_name)
        return full_name
    
    def get_merchant_name(self) -> str:
        """Get a random merchant name"""
        return random.choice(AMERICAN_MERCHANTS)
    
    def generate_high_amount(self, min_amount: float = 100, max_amount: float = 50000) -> Decimal:
        """
        Generate realistic high transaction amounts
        Distribution: Mix of small, medium, and large amounts
        - 30% small: $100-$1,000
        - 40% medium: $1,000-$10,000
        - 30% large: $10,000-$50,000
        """
        rand = random.random()
        
        if rand < 0.3:  # 30% small amounts
            amount = random.uniform(100, 1000)
        elif rand < 0.7:  # 40% medium amounts
            amount = random.uniform(1000, 10000)
        else:  # 30% large amounts
            amount = random.uniform(10000, max_amount)
        
        # Round to 2 decimal places
        return Decimal(str(round(amount, 2)))
    
    def distribute_timestamps(
        self,
        start_date: datetime,
        end_date: datetime,
        count: int
    ) -> List[datetime]:
        """Distribute timestamps evenly across date range"""
        if count == 0:
            return []
        
        if count == 1:
            return [start_date]
        
        total_seconds = (end_date - start_date).total_seconds()
        interval = total_seconds / count
        
        timestamps = []
        for i in range(count):
            # Add some randomness to make it more realistic
            random_offset = random.uniform(-interval * 0.3, interval * 0.3)
            timestamp = start_date + timedelta(seconds=(i * interval + random_offset))
            timestamps.append(timestamp)
        
        # Sort chronologically
        timestamps.sort()
        return timestamps
    
    def validate_generation_params(
        self,
        start_date: datetime,
        end_date: datetime,
        starting_balance: Decimal,
        closing_balance: Decimal,
        transaction_count: int
    ) -> Tuple[bool, str]:
        """Validate transaction generation parameters"""
        
        # Date validation
        if end_date < start_date:
            return False, "End date must be after start date"
        
        # Balance validation
        if starting_balance < 0:
            return False, "Starting balance cannot be negative"
        
        if closing_balance < 0:
            return False, "Closing balance cannot be negative"
        
        # Transaction count validation
        if transaction_count < 1:
            return False, "Must generate at least 1 transaction"
        
        if transaction_count > 1000:
            return False, "Cannot generate more than 1000 transactions at once"
        
        # Check if balance change is achievable
        balance_difference = abs(closing_balance - starting_balance)
        avg_per_transaction = balance_difference / transaction_count
        
        if avg_per_transaction < 5:
            return False, f"Average transaction amount (${avg_per_transaction:.2f}) is too small. Increase balance difference or reduce transaction count."
        
        if avg_per_transaction > 100000:
            return False, f"Average transaction amount (${avg_per_transaction:.2f}) is too large. This may look suspicious."
        
        return True, "Validation passed"
    
    def generate_transactions(
        self,
        start_date: datetime,
        end_date: datetime,
        starting_balance: Decimal,
        closing_balance: Decimal,
        transaction_count: int,
        account_id: str,
        currency: str = "USD"
    ) -> List[Dict]:
        """
        Generate realistic transactions with high amounts
        
        Returns list of transaction dictionaries ready for database insertion
        """
        
        # Validate parameters
        is_valid, message = self.validate_generation_params(
            start_date, end_date, starting_balance, closing_balance, transaction_count
        )
        if not is_valid:
            raise ValueError(message)
        
        # Calculate target balance change
        balance_change = closing_balance - starting_balance
        
        # Determine ratio of debits to credits
        if balance_change > 0:
            # Need more credits than debits
            credit_ratio = 0.6  # 60% credits
        elif balance_change < 0:
            # Need more debits than credits
            credit_ratio = 0.4  # 40% credits
        else:
            # Equal debits and credits
            credit_ratio = 0.5
        
        # Generate timestamps
        timestamps = self.distribute_timestamps(start_date, end_date, transaction_count)
        
        # Generate transactions
        transactions = []
        current_balance = starting_balance
        remaining_change = balance_change
        
        for i, timestamp in enumerate(timestamps):
            is_last = (i == transaction_count - 1)
            
            # Determine if this is a credit or debit
            if is_last:
                # Last transaction: use exact remaining amount to hit target
                amount = abs(remaining_change)
                is_credit = remaining_change > 0
            else:
                # Random transaction
                is_credit = random.random() < credit_ratio
                
                # Generate amount (leave some buffer for remaining transactions)
                remaining_transactions = transaction_count - i - 1
                if remaining_transactions > 0:
                    max_amount = abs(remaining_change) * 0.7  # Use max 70% of remaining
                    amount = self.generate_high_amount(min_amount=100, max_amount=min(max_amount, 50000))
                else:
                    amount = self.generate_high_amount()
            
            # Determine transaction type and description
            if is_credit:
                transaction_type = "credit"
                # 50% chance of person-to-person, 50% income/deposit
                if random.choice([True, False]):
                    person_name = self.get_unique_person_name()
                    description = random.choice([
                        f"Transfer from {person_name}",
                        f"Payment from {person_name}",
                        f"Zelle from {person_name}",
                        f"Wire transfer from {person_name}"
                    ])
                else:
                    description = random.choice(INCOME_DESCRIPTIONS)
                
                current_balance += amount
                remaining_change -= amount
            else:
                transaction_type = "debit"
                # 70% chance of merchant, 30% person-to-person
                if random.random() < 0.7:
                    merchant = self.get_merchant_name()
                    description = f"{merchant} Purchase"
                else:
                    person_name = self.get_unique_person_name()
                    description = random.choice([
                        f"Transfer to {person_name}",
                        f"Payment to {person_name}",
                        f"Zelle to {person_name}",
                        f"Wire transfer to {person_name}"
                    ])
                
                current_balance -= amount
                remaining_change += amount
            
            # Create transaction record
            transaction = {
                "account_id": account_id,
                "type": transaction_type,
                "amount": float(amount),
                "currency": currency,
                "description": description,
                "status": "completed",
                "created_at": timestamp.isoformat(),
                "posted_date": timestamp.isoformat()
            }
            
            transactions.append(transaction)
        
        return transactions
    
    def generate_preview(
        self,
        start_date: datetime,
        end_date: datetime,
        starting_balance: Decimal,
        closing_balance: Decimal,
        transaction_count: int,
        preview_count: int = 10
    ) -> Dict:
        """
        Generate a preview of transactions without saving to database
        
        Returns:
        - sample_transactions: List of preview transactions
        - summary: Statistics about the generation
        """
        
        # Generate full transaction list
        transactions = self.generate_transactions(
            start_date=start_date,
            end_date=end_date,
            starting_balance=starting_balance,
            closing_balance=closing_balance,
            transaction_count=transaction_count,
            account_id="preview",  # Dummy account ID for preview
            currency="USD"
        )
        
        # Calculate summary statistics
        total_debits = sum(t["amount"] for t in transactions if t["type"] == "debit")
        total_credits = sum(t["amount"] for t in transactions if t["type"] == "credit")
        debit_count = sum(1 for t in transactions if t["type"] == "debit")
        credit_count = sum(1 for t in transactions if t["type"] == "credit")
        
        # Get sample transactions (evenly distributed)
        sample_size = min(preview_count, len(transactions))
        if sample_size == len(transactions):
            sample_transactions = transactions
        else:
            step = len(transactions) // sample_size
            sample_transactions = [transactions[i * step] for i in range(sample_size)]
        
        # Add running balance to preview
        running_balance = starting_balance
        for txn in sample_transactions:
            if txn["type"] == "credit":
                running_balance += Decimal(str(txn["amount"]))
            else:
                running_balance -= Decimal(str(txn["amount"]))
            txn["running_balance"] = float(running_balance)
        
        return {
            "sample_transactions": sample_transactions,
            "summary": {
                "total_transactions": transaction_count,
                "debit_count": debit_count,
                "credit_count": credit_count,
                "total_debits": float(total_debits),
                "total_credits": float(total_credits),
                "starting_balance": float(starting_balance),
                "closing_balance": float(closing_balance),
                "net_change": float(closing_balance - starting_balance)
            }
        }
