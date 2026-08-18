import React from 'react';

export function Privacy() {
  return (
    <div className="py-20 bg-[#050505] min-h-screen text-[#f4f4f5] antialiased">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 tracking-tight">Privacy Policy</h1>
        
        <div className="space-y-8 text-zinc-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Introduction</h2>
            <p>
              Welcome to Verity. We respect your privacy and are committed to protecting the information you share with us. This Privacy Policy explains how we collect, use, and safeguard information when you use our software platform for organizing, monitoring, and analyzing contractor compliance information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account and Workspace Information:</strong> Name, email address, and company details provided during registration.</li>
              <li><strong>Contractor Information:</strong> Data entered by our customers regarding their contractors, including contact details and compliance status.</li>
              <li><strong>Uploaded Documents:</strong> Insurance certificates, W-9s, and other compliance documents uploaded to the platform.</li>
              <li><strong>Authentication Data:</strong> Login credentials managed securely via our authentication provider (Supabase).</li>
              <li><strong>Usage Information:</strong> High-level application usage and activity records for security and enforcement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. How We Use Information</h2>
            <p className="mb-2">We use the collected information to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide and maintain the Verity platform functionality.</li>
              <li>Authenticate users and enforce workspace isolation.</li>
              <li>Extract document metadata using server-side AI processing to assist in compliance analysis.</li>
              <li>Enforce server-side usage limits according to your active subscription.</li>
              <li>Send automated expiration notifications to contractors (when configured).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. AI / OCR Processing</h2>
            <p>
              Verity uses AI extraction to assist in document analysis. The uploaded documents are processed securely on the server-side to extract relevant metadata (such as expiration dates and policy numbers). We do not use your documents to train public AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Data Sharing and Security</h2>
            <p className="mb-2">
              We employ workspace-level access controls, row-level security, and protected document storage to secure your data. We do not sell your personal information. Information may be shared with trusted third-party infrastructure providers necessary to operate the service, including:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Supabase:</strong> For database, storage, and authentication services.</li>
              <li><strong>Google Gemini (if applicable):</strong> For AI document extraction.</li>
            </ul>
            <p className="mt-4">
              <strong>User Responsibility:</strong> Users should not upload information they are not authorized to process.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">6. Data Retention</h2>
            <p>
              We retain your account and workspace data for as long as your account is active or as necessary to provide the services. If you choose to delete your account, we will securely delete or anonymize your data in accordance with our standard deletion procedures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">7. Contact Information</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at: <br/>
              <strong>[Contact Email to be Configured]</strong><br/>
              <strong>[Business Address to be Configured]</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
