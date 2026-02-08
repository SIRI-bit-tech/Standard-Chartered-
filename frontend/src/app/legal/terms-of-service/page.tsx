'use client'

import { Card } from '@/components/ui/card'

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-xl text-muted-foreground mb-1">Standard Chartered Bank Online Banking Platform</p>
        <p className="text-sm text-muted-foreground mb-1">
          Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-sm text-muted-foreground mb-8">Version: 1.0</p>

        {/* Introduction & Acceptance */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction & Acceptance</h2>
          <p className="mb-4">
            These Terms of Service ("Terms") govern your use of Standard Chartered Bank's online banking platform ("Platform"). By accessing or using our Platform, you agree to be bound by these Terms, our Privacy Policy, and all applicable laws and regulations. If you do not agree to these Terms, you may not access or use our Platform.
          </p>
          <p>
            Standard Chartered Bank may update these Terms from time to time. We will notify you of any changes by posting the updated Terms on our Platform or sending you an email notification at least 30 days before the effective date of changes. Your continued use of the Platform after such notification constitutes your acceptance of the updated Terms.
          </p>
        </section>

        {/* Definitions */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Definitions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-2"><strong>"Account"</strong> means your banking account with Standard Chartered Bank, including all associated services and features.</p>
              <p className="mb-2"><strong>"User"</strong> means any individual or entity that accesses or uses the Platform.</p>
              <p className="mb-2"><strong>"Services"</strong> includes all banking products and services offered through the Platform.</p>
              <p><strong>"Platform"</strong> refers to Standard Chartered Bank's online banking website and mobile applications.</p>
            </div>
            <div>
              <p className="mb-2"><strong>"Transaction"</strong> means any transfer of funds or financial activity conducted through the Platform.</p>
              <p className="mb-2"><strong>"Personal Data"</strong> means any information relating to an identified or identifiable individual.</p>
              <p className="mb-2"><strong>"Business Day"</strong> means Monday through Friday, excluding banking holidays.</p>
              <p><strong>"We/Us/Our"</strong> refers to Standard Chartered Bank.</p>
            </div>
          </div>
        </section>

          {/* Eligibility & Account Creation */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Eligibility & Account Creation</h2>
          <p className="mb-4">To be eligible to use our Platform, you must:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Be at least 18 years of age or the legal age of majority in your jurisdiction</li>
            <li>Be a resident of a country where our services are legally available</li>
            <li>Provide valid, government-issued identification documents</li>
            <li>Complete our identity verification (KYC/AML) process</li>
            <li>Have a valid email address and bank account where applicable</li>
          </ul>
          <p>You may not create more than one personal account. We reserve the right to refuse service to anyone at our sole discretion.</p>
        </section>

        {/* Account Types & Services */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Account Types & Services</h2>
          <p className="mb-4">Our Platform offers the following banking services:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-lg font-semibold mb-2">Core Banking</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>Checking Accounts</li>
                <li>Savings Accounts</li>
                <li>Cryptocurrency Accounts</li>
                <li>Money Transfers (ACH, SWIFT)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2">Additional Services</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>Bill Payment Services</li>
                <li>Loan Products</li>
                <li>Document Management</li>
                <li>Customer Support</li>
              </ul>
            </div>
          </div>
        </section>

        {/* User Responsibilities */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. User Responsibilities</h2>
          <p className="mb-4">As a User, you are responsible for:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Maintaining accurate and complete account information</li>
            <li>Keeping your login credentials confidential and secure</li>
            <li>Notifying us immediately of any unauthorized access or suspicious activity</li>
            <li>Ensuring sufficient funds are available before initiating transactions</li>
            <li>Complying with all applicable laws and regulations</li>
            <li>Not using our services for illegal purposes</li>
            <li>Being responsible for all activity conducted under your account</li>
          </ul>
        </section>

        {/* Account Security */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Account Security</h2>
          <p className="mb-4">You are solely responsible for maintaining the security of your account. We recommend:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Using strong, unique passwords</li>
            <li>Enabling two-factor authentication</li>
            <li>Regularly monitoring your account activity</li>
            <li>Logging out after each session</li>
            <li>Not sharing your credentials with anyone</li>
          </ul>
          <p>We will never ask for your password via email or phone. If you suspect unauthorized access, contact us immediately.</p>
        </section>

        {/* Fees & Charges */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Fees & Charges</h2>
          <p className="mb-4">Our services are subject to the following fees:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-lg font-semibold mb-2">Transaction Fees</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>Wire transfers: $25 domestic, $45 international</li>
                <li>ACH transfers: Free for standard, $3 for expedited</li>
                <li>Cryptocurrency trades: 1.5% of transaction value</li>
                <li>Foreign exchange: 0.5% above market rate</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2">Account Fees</h4>
              <ul className="list-disc pl-6 mb-4">
                <li>Monthly maintenance: $10 (waived with $5,000 balance)</li>
                <li>Overdraft: $35 per item</li>
                <li>Returned items: $30 per item</li>
                <li>Inactivity: $5 per month after 12 months</li>
              </ul>
            </div>
          </div>
          <p>All fees are subject to change with 30 days notice. Please refer to our Fee Schedule for complete details.</p>
        </section>

        {/* Cryptocurrency Services */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Cryptocurrency Services</h2>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <p className="font-semibold mb-2">⚠️ Cryptocurrency Risk Warning</p>
            <p>Cryptocurrencies are highly volatile and speculative investments. You may lose your entire investment. We are not responsible for market fluctuations or losses.</p>
          </div>
          <p className="mb-4">Our cryptocurrency services include:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Bitcoin, Ethereum, and major altcoin trading</li>
            <li>Crypto-to-fiat conversions</li>
            <li>Digital wallet services</li>
            <li>Blockchain transaction monitoring</li>
          </ul>
          <p>Cryptocurrency services are not FDIC insured and are not covered by traditional banking protections.</p>
        </section>

        {/* Liability & Disclaimers */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Liability & Disclaimers</h2>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="font-semibold mb-2">🚨 Limitation of Liability</p>
            <p>Our liability is limited to the maximum extent permitted by law. We are not liable for indirect, incidental, or consequential damages.</p>
          </div>
          <p className="mb-4">We are not liable for:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Losses due to unauthorized access if you failed to secure your account</li>
            <li>Market fluctuations in cryptocurrency values</li>
            <li>Delays caused by third-party payment processors</li>
            <li>System maintenance or downtime</li>
            <li>Losses from your investment decisions</li>
          </ul>
        </section>

        {/* Contact Information */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
          <p className="mb-4">For questions about these Terms, please contact us:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Email:</strong> legal@standardchartered.com</li>
            <li><strong>Phone:</strong> 1-800-LEGAL (1-800-53425)</li>
            <li><strong>Mail:</strong> Standard Chartered Bank, Legal Department, 425 Market Street, 38th Floor, New York, NY 10004</li>
          </ul>
        </section>
      </Card>
    </div>
  )
}
