# Monthly Statement Generation Job

## Overview
This job generates monthly account statements for all active users and emails them automatically.

## Setup

### Option 1: Heroku Scheduler
```bash
# Add Heroku Scheduler addon
heroku addons:create scheduler:standard

# Open scheduler dashboard
heroku addons:open scheduler

# Add job:
# Command: python jobs/generate_monthly_statements.py
# Frequency: Monthly (1st day at 00:00)
```

### Option 2: Render Cron Jobs
Add to `render.yaml`:
```yaml
- type: cron
  name: monthly-statements
  env: python
  schedule: "0 0 1 * *"  # 1st day of month at midnight
  buildCommand: "pip install -r requirements.txt"
  startCommand: "python jobs/generate_monthly_statements.py"
```

### Option 3: Manual Execution
```bash
cd backend
python jobs/generate_monthly_statements.py
```

## What It Does
1. Calculates previous month date range
2. For each active user:
   - Fetches all accounts (checking, savings, crypto)
   - Retrieves transactions for the period
   - Generates comprehensive PDF statement
   - Uploads to Cloudinary
   - Saves statement records to database
   - Emails statement link to user
3. Logs success/error statistics

## Environment Variables Required
- DATABASE_URL
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- SMTP_SERVER / RESEND_API_KEY (for email)
