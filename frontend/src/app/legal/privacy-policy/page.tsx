'use client'
import { Card } from '@/components/ui/card'

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-xl text-muted-foreground mb-1">Standard Chartered Bank Online Banking Platform</p>
        <p className="text-sm text-muted-foreground mb-1">
          Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-sm text-muted-foreground mb-8">Version: 1.0</p>

        {/* Introduction */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="mb-4">
            Standard Chartered Bank ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use our online banking platform ("Platform").
          </p>
          <p className="mb-4">
            This policy applies to all users of our Platform and governs all data collection and processing activities. By using our Platform, you agree to the collection and use of information as described in this policy.
          </p>
          <p>
            This policy should be read together with our Terms of Service, which govern your use of our Platform.
          </p>
        </section>

        {/* How We Collect Information */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold mb-3">Personal Information</h3>
          <p className="mb-4">
            We collect the following types of personal information to provide and maintain your banking services:
          </p>
          
          <h4 className="text-lg font-semibold mb-2">Account Information</h4>
          <ul className="list-disc pl-6 mb-4">
            <li>Name, Email, Phone Number, Physical Address</li>
            <li>Date of Birth, Social Security Number</li>
            <li>Government-Issued ID Documents</li>
          </ul>

          <h4 className="text-lg font-semibold mb-2">Technical Information</h4>
          <ul className="list-disc pl-6 mb-4">
            <li>IP Address, Device Type, Operating System, Browser Type</li>
            <li>Cookies and Tracking Technologies</li>
            <li>Login Timestamps, Session Data</li>
            <li>Device Fingerprints</li>
          </ul>

          <h4 className="text-lg font-semibold mb-2">Transaction Information</h4>
          <ul className="list-disc pl-6 mb-4">
            <li>Account Numbers (sender and recipient)</li>
            <li>Transfer Amounts, Dates, Purposes</li>
            <li>Beneficiary Details</li>
            <li>Payment History</li>
          </ul>

          <h4 className="text-lg font-semibold mb-2">Communication Information</h4>
          <ul className="list-disc pl-6 mb-4">
            <li>Support Chat Logs</li>
            <li>Email Correspondence</li>
            <li>Phone Call Recordings</li>
          </ul>

          <h4 className="text-lg font-semibold mb-2">Automatically Collected Information</h4>
          <ul className="list-disc pl-6 mb-4">
            <li>Usage Data</li>
            <li>Performance Data</li>
            <li>Location Data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. How We Collect Information</h2>
          
          <h3 className="text-xl font-semibold mb-3">Direct Collection</h3>
          <p className="mb-2">We collect information directly from you when you:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Apply for banking products or services</li>
            <li>Initiate transactions or transfers</li>
            <li>Contact customer support</li>
            <li>Use Platform features and services</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Automatic Collection</h3>
          <p className="mb-2">We automatically collect information through:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Cookies and similar tracking technologies</li>
            <li>Server logs and analytics data</li>
            <li>Device and browser information</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Third-Party Collection</h3>
          <p className="mb-2">We may collect information from third parties, including:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Credit bureaus for loan applications and identity verification</li>
            <li>Identity verification services for KYC/AML compliance</li>
            <li>Government databases for regulatory compliance</li>
            <li>Payment processors for transaction processing</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. How We Use Your Information</h2>
          
          <h3 className="text-xl font-semibold mb-3">Account Management</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Create and maintain your banking accounts</li>
            <li>Verify your identity and prevent fraud</li>
            <li>Process transactions and transfers</li>
            <li>Generate account statements and reports</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Legal & Regulatory Compliance</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Comply with KYC/AML requirements</li>
            <li>Generate tax reporting (1099 forms)</li>
            <li>Prevent and detect fraud</li>
            <li>Respond to legal requests and court orders</li>
            <li>Comply with banking regulations (GLBA, FDIC requirements)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Service Improvement</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Personalize your user experience</li>
            <li>Analyze platform usage and performance</li>
            <li>Develop new features and services</li>
            <li>Conduct market research and analysis</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Communication</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Send transaction confirmations and receipts</li>
            <li>Provide customer support and assistance</li>
            <li>Send account notifications and alerts</li>
            <li>Marketing communications (with opt-out option)</li>
            <li>Service updates and policy changes</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Security</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Detect and prevent fraud and unauthorized access</li>
            <li>Monitor suspicious activities</li>
            <li>Protect against security threats</li>
            <li>Enforce Terms of Service</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Legal Bases for Processing (GDPR Compliance)</h2>
          <p className="mb-2">For users in the European Union, we process personal data based on the following legal bases:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Contract Performance:</strong> Processing necessary to provide our banking services</li>
            <li><strong>Legal Obligation:</strong> Compliance with KYC/AML, tax reporting, and regulatory requirements</li>
            <li><strong>Legitimate Interests:</strong> Fraud prevention, service improvement, security</li>
            <li><strong>Consent:</strong> Marketing communications and optional features where consent is obtained</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. How We Share Your Information</h2>
          
          <h3 className="text-xl font-semibold mb-3">Service Providers</h3>
          <p className="mb-2">We share information with service providers that help us operate our Platform:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Cloud Hosting Providers:</strong> AWS, Google Cloud for data storage</li>
            <li><strong>Payment Processors:</strong> Stripe, wire transfer networks</li>
            <li><strong>Identity Verification Services:</strong> Third-party KYC/AML providers</li>
            <li><strong>Email Service Providers:</strong> SendGrid for communications</li>
            <li><strong>Analytics Providers:</strong> Google Analytics, similar services</li>
            <li><strong>Customer Support Tools:</strong> Help desk and chat platforms</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Financial Institutions</h3>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Other Banks:</strong> For wire transfers and ACH transactions</li>
            <li><strong>Credit Bureaus:</strong> For loan applications and credit checks</li>
            <li><strong>Cryptocurrency Exchanges:</strong> For crypto services integration</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Legal & Regulatory</h3>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Government Agencies:</strong> IRS, FinCEN, law enforcement</li>
            <li><strong>Regulators:</strong> FDIC, Federal Reserve, OCC</li>
            <li><strong>Courts:</strong> In response to subpoenas or court orders</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Business Transfers</h3>
          <p className="mb-4">
            In case of merger, acquisition, or sale of our assets, your information may be transferred to the acquiring entity.
          </p>

          <h3 className="text-xl font-semibold mb-3">With Your Consent</h3>
          <p className="mb-2">We may share information with your explicit consent for:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Marketing communications from third parties</li>
            <li>Specialized financial products and services</li>
            <li>Research and analytics purposes</li>
          </ul>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p className="font-semibold">🔒 We Do NOT Sell Your Information</p>
            <p className="mt-2">
              We do not sell your personal information to third parties. We do not share your information for third-party marketing without your consent.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
          <p className="mb-2">We retain your information for different periods based on legal requirements and business needs:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Account Information:</strong> Duration of account + 7 years after closure (legal requirement)</li>
            <li><strong>Transaction Records:</strong> 7 years (IRS and banking regulations)</li>
            <li><strong>Tax Documents:</strong> 7 years</li>
            <li><strong>Communication Logs:</strong> 3 years</li>
            <li><strong>Marketing Consent Records:</strong> Until consent withdrawn + 2 years</li>
          </ul>
          <p>You have the right to request deletion of your information, subject to legal retention obligations.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Your Privacy Rights</h2>
          
          <h3 className="text-xl font-semibold mb-3">All Users</h3>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Access:</strong> Request access to your personal information</li>
            <li><strong>Correction:</strong> Request correction of inaccurate information</li>
            <li><strong>Deletion:</strong> Request account closure and data deletion (subject to legal retention)</li>
            <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
            <li><strong>Portable Format:</strong> Receive copy of your data in portable format</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">GDPR Rights (EU Users)</h3>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p className="font-semibold mb-2">🇪🇺 Additional Rights for European Union Users</p>
            <ul className="list-disc pl-6">
              <li><strong>Right to Erasure:</strong> "Right to be forgotten"</li>
              <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Transfer data to other services</li>
              <li><strong>Right to Object:</strong> Object to certain types of processing</li>
              <li><strong>Right to Withdraw Consent:</strong> Change your mind about consent</li>
              <li><strong>Right to Complain:</strong> Lodge complaint with supervisory authority</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mb-3">CCPA Rights (California Users)</h3>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <p className="font-semibold mb-2">🌉 Additional Rights for California Users</p>
            <ul className="list-disc pl-6">
              <li><strong>Right to Know:</strong> What personal information is collected and used</li>
              <li><strong>Right to Delete:</strong> Request deletion of personal information</li>
              <li><strong>Right to Opt-Out:</strong> Opt out of sale of personal information</li>
              <li><strong>Right to Non-Discrimination:</strong> Not be discriminated against for exercising rights</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mb-3">How to Exercise Rights</h3>
          <p className="mb-2">To exercise any of these rights, please contact us at:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Email:</strong> privacy@standardchartered.com</li>
            <li><strong>Response Time:</strong> 30 days (GDPR) or 45 days (CCPA)</li>
            <li><strong>Verification:</strong> Identity verification required before processing requests</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Cookies & Tracking Technologies</h2>
          
          <h3 className="text-xl font-semibold mb-3">Types of Cookies</h3>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Essential:</strong> Required for platform functionality (authentication, security)</li>
            <li><strong>Functional:</strong> Remember preferences and settings</li>
            <li><strong>Analytics:</strong> Track usage and performance (Google Analytics)</li>
            <li><strong>Advertising:</strong> Deliver relevant ads (if applicable)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Managing Cookies</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Use browser settings to block or delete cookies</li>
            <li>Some features may not work if cookies are blocked</li>
            <li>Third-party opt-out tools available (e.g., Network Advertising Initiative)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Do Not Track</h3>
          <p>Our platform responds to Do Not Track browser signals where applicable.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Data Security</h2>
          
          <h3 className="text-xl font-semibold mb-3">Security Measures</h3>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Encryption:</strong> 128-bit SSL/TLS for data in transit, AES-256 for data at rest</li>
            <li><strong>Secure Data Centers:</strong> Physical access controls, environmental security</li>
            <li><strong>Regular Audits:</strong> Security audits and penetration testing</li>
            <li><strong>Employee Access Controls:</strong> Background checks, training, access logging</li>
            <li><strong>Multi-Factor Authentication:</strong> Required for sensitive operations</li>
            <li><strong>Intrusion Detection:</strong> Real-time monitoring and alerting</li>
            <li><strong>Regular Backups:</strong> Automated backup systems and disaster recovery</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">User Responsibilities</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Keep login credentials confidential and secure</li>
            <li>Use strong, unique passwords</li>
            <li>Enable two-factor authentication</li>
            <li>Log out after each session</li>
            <li>Report suspicious activity immediately</li>
          </ul>

          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="font-semibold mb-2">🚨 Data Breach Notification</p>
            <p className="mb-2">We will notify you within 72 hours of discovering a data breach, including:</p>
            <ul className="list-disc pl-6">
              <li>Description of the breach and data affected</li>
              <li>Potential impact on users</li>
              <li>Steps we have taken to mitigate the breach</li>
              <li>Recommended actions for users to protect themselves</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. International Data Transfers</h2>
          <p className="mb-2">
            Your data may be transferred to and processed in countries outside your country of residence. We ensure appropriate safeguards are in place.
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Standard Contractual Clauses:</strong> EU data transfers use approved SCCs</li>
            <li><strong>Adequacy Decisions:</strong> European Commission assessments where applicable</li>
            <li><strong>Privacy Shield:</strong> Framework participation (if valid and applicable)</li>
            <li><strong>User Consent:</strong> Required for international transfers</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Children's Privacy</h2>
          <p className="mb-4">
            Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from minors.
          </p>
          <p>
            If we discover we have collected information from a minor, we will delete it immediately.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Third-Party Links & Services</h2>
          <p className="mb-4">
            Our Platform may contain links to third-party websites. We are not responsible for the privacy practices of third-party services.
          </p>
          <p>
            We encourage you to review the privacy policies of any third-party services you use.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. Changes to Privacy Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time. Material changes will be communicated via email and Platform notice.
          </p>
          <p className="mb-4">
            Continued use of our Platform constitutes acceptance of the updated policy.
          </p>
          <p>
            You have the right to close your account if you disagree with changes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
          
          <h3 className="text-xl font-semibold mb-3">Privacy Officer</h3>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Email:</strong> privacy@standardchartered.com</li>
            <li><strong>Phone:</strong> 1-800-PRIVACY (1-800-774-8229)</li>
            <li><strong>Mail:</strong> Standard Chartered Bank, Privacy Officer, 425 Market Street, 38th Floor, New York, NY 10004</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Data Protection Officer (GDPR)</h3>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Email:</strong> dpo@standardchartered.com</li>
            <li><strong>Mail:</strong> Standard Chartered Bank, DPO, 425 Market Street, 38th Floor, New York, NY 10004</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Customer Support</h3>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Email:</strong> support@standardchartered.com</li>
            <li><strong>Phone:</strong> 1-800-SC-BANK (1-800-722-2655)</li>
            <li><strong>Hours:</strong> 24/7 availability</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">16. Regulatory Information</h2>
          
          <h3 className="text-xl font-semibold mb-3">Banking Licenses & Regulation</h3>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Regulatory Authorities:</strong> FDIC, Federal Reserve, OCC</li>
            <li><strong>FDIC Insurance:</strong> Member FDIC - deposits insured up to $250,000 per depositor</li>
            <li><strong>Equal Housing Lender:</strong> We comply with fair lending laws</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Privacy Notices</h3>
          <p>
            We comply with GLBA privacy notice requirements and provide annual privacy notices to all customers.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">17. State-Specific Disclosures</h2>
          
          <h3 className="text-xl font-semibold mb-3">California Privacy Rights</h3>
          <p className="mb-4">
            We comply with the California Consumer Privacy Act (CCPA) and provide required disclosures to California residents.
          </p>

          <h3 className="text-xl font-semibold mb-3">Other States</h3>
          <p>
            Additional disclosures are provided as required by state law for residents of other states.
          </p>
        </section>
      </Card>
    </div>
  )
}