import React from 'react';

export function RefundPolicy() {
  return (
    <div className="py-20 bg-[#050505] min-h-screen text-[#f4f4f5] antialiased">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 tracking-tight">Refund & Cancellation Policy</h1>
        
        <div className="space-y-8 text-zinc-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Cancellation of Subscription</h2>
            <p>
              You may cancel your Verity subscription at any time. When you cancel, your subscription will remain active until the end of your current billing period. After the current billing period ends, your workspace will be downgraded, and you will not be charged for the subsequent period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Refunds</h2>
            <p>
              <strong>[Specific refund window to be confirmed by business]</strong>. Generally, payments are non-refundable, and there are no refunds or credits for partially used periods. Exceptions may be considered on a case-by-case basis at our sole discretion, such as in the event of a significant service failure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Failed Payments</h2>
            <p>
              If a payment fails to process, we will attempt to notify you and retry the payment. If the payment remains unresolved, your workspace subscription may be automatically downgraded to the Free tier, and paid features will become restricted until a valid payment method is provided.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Future Payment Processing</h2>
            <p>
              Note: Automated payment gateways are not yet fully active. Once activated, all transactions, cancellations, and refunds will be processed securely via our designated payment provider.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Contact Information</h2>
            <p>
              To request assistance with billing or cancellations, please contact us at: <br/>
              <strong>[Contact Email to be Configured]</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
