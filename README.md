# Standard Chartered Banking Platform

A comprehensive, production-ready full-stack online banking platform built with Next.js 16 (Frontend) and FastAPI (Backend).

## 📋 Project Overview

Standard Chartered Banking Platform is a secure, professional digital banking solution that enables users to:

- **Manage Multiple Accounts**: Checking, Savings, and Crypto accounts in different currencies
- **Transfer Money**: Internal, domestic, and international transfers with real-time processing
- **Apply for Loans**: Browse loan products and manage applications and active loans
- **Pay Bills**: Schedule and manage recurring bill payments
- **Real-time Notifications**: Live updates via Ably for transactions and alerts
- **Customer Support**: Live chat with relationship managers and support tickets
- **Multi-currency Support**: 15+ currencies with competitive exchange rates
- **Bank-Grade Security**: 128-bit SSL encryption, JWT authentication, and device authorization

## 🏗️ Architecture

### Backend (FastAPI)
Located in `/backend` directory
- **Framework**: Python FastAPI with async/await
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: Better Auth (primary) + Clerk (fallback)
- **Real-time**: Ably SDK for live notifications
- **File Storage**: Cloudinary for document management
- **Background Jobs**: Celery for async tasks
- **Caching**: Redis for session and data caching

### Frontend (Next.js 16)
Located in `/frontend` directory
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **UI Framework**: React with Tailwind CSS v4
- **State Management**: Zustand for global state
- **Data Fetching**: SWR for client-side caching
- **Real-time**: Ably client SDK
- **API Client**: Axios for HTTP requests

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 12+
- Redis 6+

### Backend Setup

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database**
   ```bash
   # FastAPI will auto-create tables on startup
   python main.py
   ```

6. **Start the server**
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   python main.py
   taskkill /F /IM python.exe
   ```

### Frontend Setup

1. **Navigate to frontend**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API URL and keys
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

### Backend Structure
```
backend/
├── main.py                 # FastAPI application entry point
├── config.py              # Configuration management
├── database.py            # Database connection and session
├── models/                # SQLAlchemy database models
│   ├── user.py           # User model
│   ├── account.py        # Account models
│   ├── transaction.py    # Transaction model
│   ├── transfer.py       # Transfer and beneficiary models
│   ├── loan.py           # Loan-related models
│   ├── notification.py   # Notification models
│   ├── document.py       # Document model
│   ├── support.py        # Support ticket and chat models
│   └── bill_payment.py   # Bill payment models
├── routers/               # API route handlers
│   ├── auth.py           # Authentication endpoints
│   ├── accounts.py       # Account management endpoints
│   ├── transfers.py      # Transfer endpoints
│   ├── loans.py          # Loan endpoints
│   ├── notifications.py  # Notification endpoints
│   ├── support.py        # Support endpoints
│   ├── profile.py        # Profile endpoints
│   ├── documents.py      # Document endpoints
│   └── bill_payments.py  # Bill payment endpoints
└── requirements.txt      # Python dependencies

```

### Frontend Structure
```
frontend/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   ├── auth/         # Authentication pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   └── dashboard/    # Protected dashboard pages
│   │       ├── page.tsx
│   │       ├── accounts/
│   │       ├── transfers/
│   │       ├── loans/
│   │       ├── bills/
│   │       ├── profile/
│   │       ├── support/
│   │       └── layout.tsx
│   ├── components/       # Reusable React components
│   ├── lib/             # Utility functions and helpers
│   │   ├── api-client.ts      # Axios API client
│   │   ├── store.ts           # Zustand stores
│   │   └── utils.ts           # Helper functions
│   ├── styles/          # Global CSS and Tailwind config
│   ├── types/           # TypeScript type definitions
│   ├── constants/       # Application constants
│   └── hooks/           # Custom React hooks
├── public/              # Static assets
├── next.config.js       # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Node.js dependencies

```

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh access token

### Accounts
- `GET /api/v1/accounts` - Get user accounts
- `POST /api/v1/accounts` - Create new account
- `GET /api/v1/accounts/{id}` - Get account details
- `GET /api/v1/accounts/{id}/balance` - Get current balance
- `GET /api/v1/accounts/{id}/transactions` - Get transaction history
- `GET /api/v1/accounts/{id}/statements` - Get account statements

### Transfers
- `POST /api/v1/transfers/internal` - Internal transfer
- `POST /api/v1/transfers/domestic` - Domestic transfer
- `POST /api/v1/transfers/international` - International transfer
- `GET /api/v1/transfers/{id}` - Get transfer details
- `GET /api/v1/transfers/beneficiaries` - Get saved beneficiaries
- `POST /api/v1/transfers/beneficiaries` - Add beneficiary

### Loans
- `GET /api/v1/loans/products` - Get available loan products
- `POST /api/v1/loans/apply` - Apply for loan
- `GET /api/v1/loans/applications` - Get loan applications
- `GET /api/v1/loans/accounts` - Get active loans
- `POST /api/v1/loans/accounts/{id}/payment` - Make loan payment

### Bill Payments
- `GET /api/v1/bills/payees` - Get bill payees
- `POST /api/v1/bills/pay` - Pay bill
- `POST /api/v1/bills/schedule` - Schedule recurring payment
- `GET /api/v1/bills/scheduled` - Get scheduled payments

### Support
- `POST /api/v1/support/chat/start` - Start support chat
- `POST /api/v1/support/chat/{id}/message` - Send chat message
- `POST /api/v1/support/ticket` - Create support ticket
- `GET /api/v1/support/tickets` - Get support tickets

### Profile
- `GET /api/v1/profile` - Get user profile
- `PUT /api/v1/profile` - Update profile
- `POST /api/v1/profile/documents/upload` - Upload document
- `GET /api/v1/profile/login-history` - Get login history

## 🔐 Security Features

- **End-to-End Encryption**: 128-bit SSL/TLS for all communications
- **JWT Authentication**: Short-lived access tokens with refresh rotation
- **Device Authorization**: Device verification for new logins
- **Session Management**: 15-minute automatic timeout
- **Password Hashing**: Bcrypt for secure password storage
- **Input Validation**: Pydantic for API request validation
- **Row-Level Security**: Database-level access control
- **Audit Logging**: All sensitive operations logged
- **Rate Limiting**: API rate limiting to prevent abuse

## 💱 Multi-Currency Support

Supported currencies by country:
- 🇺🇸 United States → USD
- 🇬🇧 United Kingdom → GBP
- 🇪🇺 European Union → EUR
- 🇰🇼 Kuwait → KWD
- 🇦🇪 United Arab Emirates → AED
- 🇸🇬 Singapore → SGD
- 🇭🇰 Hong Kong → HKD
- 🇮🇳 India → INR
- 🇳🇬 Nigeria → NGN
- 🇿🇦 South Africa → ZAR
- 🇰🇪 Kenya → KES
- And 5+ more countries

## 📊 User Tiers

### Standard Account
- Basic checking and savings accounts
- Domestic transfers (ACH, wire)
- International transfers with standard fees
- Bill payment service
- Email support
- Standard exchange rates

### Priority Banking
- All Standard Account features
- Dedicated relationship manager
- Priority customer support with live chat
- Reduced transfer fees
- Better exchange rates
- Loan pre-approval
- Free cashier's checks

### Premium Account
- All Priority Banking features
- Zero transfer fees for international wires
- Best exchange rates
- Instant loan approval
- Concierge services
- Premium credit cards
- Investment advisory services

## 🔄 Real-time Features (Ably)

Channels:
- `account:{account_id}` - Balance updates, transactions
- `user:{user_id}` - General notifications, security alerts
- `transfers:{user_id}` - Transfer status updates
- `support:{chat_id}` - Live chat messages

Events:
- `balance_updated` - Account balance changed
- `transaction_posted` - New transaction posted
- `transfer_completed` - Transfer successfully completed
- `transfer_failed` - Transfer failed
- `loan_approved` - Loan application approved
- `security_alert` - Security alert triggered
- `message_received` - New support chat message

## 📱 Design System

### Color Palette
- **Primary**: #0073CF (Standard Chartered Blue)
- **Secondary**: #009A44 (Standard Chartered Green)
- **Accent**: #00AEEF (Light Blue)
- **Success**: #009A44
- **Warning**: #F39C12
- **Error**: #E74C3C
- **Background**: #FFFFFF
- **Text Primary**: #2C2C2C
- **Text Secondary**: #6B6B6B

### Typography
- **Font**: Inter (system fonts fallback)
- **Headings**: Semibold (600, 700)
- **Body**: Regular (400), Medium (500)
- **Monospace**: For account numbers and codes

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest tests/
```

### Frontend Testing
```bash
cd frontend
npm run test
```

## 🚢 Deployment

### Backend Deployment
```bash
# Build Docker image
docker build -t banking-api .

# Run container
docker run -p 8000:8000 --env-file .env banking-api
```

### Frontend Deployment
```bash
# Build Next.js project
npm run build

# Start production server
npm start
```

## 📚 Documentation

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org)
- [Better Auth Documentation](https://www.better-auth.com)

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 📄 License

This project is proprietary and confidential to Standard Chartered Bank.

## 📞 Support

For support, email support@standardcharteredibank.com or create a support ticket in the application.

## ✨ Features Summary

✅ Complete user authentication system
✅ Multi-account management (checking, savings, crypto)
✅ Real-time balance and transaction updates
✅ Internal, domestic, and international transfers
✅ Bill payment and recurring payments
✅ Loan application and management system
✅ Real-time notifications via Ably
✅ Document upload and management via Cloudinary
✅ Live chat with customer support
✅ Support tickets system
✅ Multi-currency support (15+ currencies)
✅ User tier system (Standard, Priority, Premium)
✅ Device authorization and login history
✅ Dark mode and responsive design
✅ Production-ready API with validation
✅ Comprehensive error handling
✅ Rate limiting and security middleware
✅ Audit logging for all transactions
✅ Session management with Redis
✅ 128-bit SSL/TLS encryption

---

**Version**: 1.0.0
**Last Updated**: 2024
**Status**: Production Ready
