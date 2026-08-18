import React from 'react';

export function Terms() {
  return (
    <div className="py-20 bg-[#050505] min-h-screen text-[#f4f4f5] antialiased">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 tracking-tight">Terms of Service</h1>
        
        <div className="space-y-8 text-zinc-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Verity platform, you agree to be bound by these Terms of Service. Verity is a software platform designed for organizing, monitoring, and analyzing contractor compliance information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Account & Workspace Responsibility</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your workspace. You must ensure that you are authorized to process and upload all contractor information and documents into the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Acceptable Use & Uploaded Content</h2>
            <p>
              You retain ownership of the documents you upload. However, you are solely responsible for ensuring that the uploaded content complies with all applicable laws. You agree not to upload malicious software, illegal content, or information you are not authorized to share. Prohibited misuse of the service may result in immediate account termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. AI-Generated Extraction & Human Review</h2>
            <p>
              Verity utilizes AI and OCR technologies to assist in extracting information from documents. <strong>AI extraction may contain errors.</strong> Verity does not guarantee that an AI extraction is 100% correct. You are responsible for performing a human review of all extracted information before making compliance decisions. 
            </p>
            <p className="mt-2">
              Compliance status is determined using application rules and available evidence. Verity does not provide legal advice, guarantee regulatory compliance, or guarantee insurance approval.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Subscription, Billing & Cancellation</h2>
            <p>
              Access to certain features may require a paid subscription. Subscription provisions, including pricing and billing intervals, will be governed by the plan you select. You may cancel your subscription in accordance with our Refund & Cancellation Policy. Verity reserves the right to modify the service or subscription pricing with prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">6. Intellectual Property</h2>
            <p>
              Verity retains all intellectual property rights to the platform, its underlying technology, and its design. You are granted a limited, non-exclusive license to use the platform for its intended business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">7. Limitation of Liability</h2>
            <p>
              Verity is provided "as is" without any warranties, express or implied. In no event shall Verity or its operators be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to incorrect AI extractions, compliance failures, or data loss.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">8. Governing Law & Contact</h2>
            <p>
              These Terms shall be governed by the laws of <strong>[Jurisdiction to be Configured]</strong>.
            </p>
            <p className="mt-4">
              If you have any questions, please contact us at: <br/>
              <strong>[Contact Email to be Configured]</strong><br/>
              <strong>[Business Legal Entity Placeholder]</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
