---
name: skills
description: A brief description, shown to the model to help it understand when to use this skill
---

Instructions for the skill go here. Provide relative paths to other resources in the skill directory as needed.

SKILLS

Standard Chartered Banking Platform Skills

Account Number Generation: Automatically generate country-specific account numbers with correct digit lengths (SG: 10, HK: 12, US: 12, GB: 8, KE: 13, IN: 14, UAE: 14, etc.). Store as String to preserve leading zeros. Ensure uniqueness across all accounts.
Multi-Currency Assignment: Assign primary currency based on user's selected country during registration (US→USD, GB→GBP, EU→EUR, KW→KWD, AE→AED, SG→SGD, HK→HKD, IN→INR, NG→NGN, ZA→ZAR, KE→KES). Allow users to open additional accounts in other supported currencies.
Transfer Processing: Handle internal transfers (instant, $0 fee), domestic transfers (instant, $0 fee, limits by tier), international wires (1-3 days, SWIFT, fees and exchange markup by tier), ACH transfers (1-3 days, US only), and wire transfers (same day, domestic). Validate beneficiary details, enforce daily limits, generate receipts.
Real-time Notifications via Ably: Publish events to Ably channels (user:{user_id}, account:{account_id}, transfers:{user_id}) for balance updates, transaction posts, transfer completions/failures, security alerts, loan approvals. Frontend subscribes to channels and displays toast notifications.
Loan Application Processing: Support personal loans ($1K-$50K, 12-60 months), auto loans ($5K-$100K, 24-72 months), mortgages ($50K-$1M, 15-30 years), balance transfers (0% for 12 months), and tax season loans ($500-$5K, 3-6 months). Calculate monthly payments, generate amortization schedules, process approvals based on tier (instant for Premium pre-qualified amounts).
Cryptocurrency Operations: Support BTC, ETH, USDT, USDC trading. Buy crypto with fiat from checking/savings accounts, sell crypto to fiat accounts, transfer to external wallets, receive from external wallets. Real-time price updates every 30 seconds. Trading fees: 2% (Standard), 1% (Priority), 0% (Premium).
Document Generation: Generate monthly account statements (PDF), tax documents (1099-INT, 1099-MISC, 1098), transaction receipts, loan schedules. Store securely in Cloudinary with authenticated URLs and watermarks. Enable eStatements for paperless delivery.
Session Management: Implement 15-minute session timeout with warning at 13 minutes. Store sessions in Redis with TTL. Track device fingerprints, IP addresses, locations. Require device authorization for new devices or different countries. Send email alerts for new device logins.
Tier-Based Features: Standard tier (basic features, standard fees/rates), Priority tier (50% reduced fees, better exchange rates, live chat support, relationship manager), Premium tier (zero fees, best rates, instant loan approval, concierge services, SMS notifications).
Audit Logging: Log all state-changing operations (user_id, action, entity_type, entity_id, old_values, new_values, IP, user_agent, timestamp) to audit_logs table. Retain for 7 years for regulatory compliance.