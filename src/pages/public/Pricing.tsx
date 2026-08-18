import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Check, ShieldCheck, Zap, ArrowRight, HelpCircle } from 'lucide-react';

export function Pricing() {
  const plans = [
    {
      name: 'Starter',
      desc: 'Ideal for specialized trade contractors & boutique builders.',
      price: '$49',
      popular: false,
      features: [
        'Up to 50 Active Contractors',
        '500 Documents Storage',
        '3 Team Members',
        '60/30/15-day Expiration Alerts',
        'Verity Compliance Passports',
        'Standard Email Support',
      ],
    },
    {
      name: 'Pro',
      desc: 'For commercial general contractors with stringent project safety standards.',
      price: '$149',
      popular: true,
      features: [
        'Up to 250 Active Contractors',
        '2,500 Documents Storage',
        '10 Team Members',
        'Custom Compliance Requirements Matrix',
        'Automated Subcontractor Intake Links',
        'Real-Time Expiration Watch & Reminders',
        'Bulk Export & Audit Certificates',
        'Priority Technical Support',
      ],
    },
    {
      name: 'Enterprise',
      desc: 'Full enterprise governance, unlimited scale, and dedicated account management.',
      price: '$399',
      popular: false,
      features: [
        'Unlimited Active Contractors',
        'Unlimited Document Storage',
        'Unlimited Team Members',
        'Custom Multi-Project Trade Thresholds',
        'Full Immutable Audit Trail',
        'ERP / Procore Integration Ready',
        'Dedicated Compliance Account Manager',
        '99.9% Uptime SLA',
      ],
    },
  ];

  return (
    <div className="py-20 bg-[#050505] min-h-screen relative overflow-hidden text-[#f4f4f5] antialiased">
      {/* Ambient Red Glow */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-red-600/10 blur-[140px] pointer-events-none -z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/70 border border-red-800/60 text-red-300 text-xs font-semibold tracking-wider uppercase mb-4">
            <Zap className="w-3.5 h-3.5 text-red-400" />
            <span>Transparent Tiered Scale</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Enterprise compliance at predictable pricing
          </h1>
          <p className="text-base text-zinc-400 leading-relaxed">
            All plans include our automated expiration reminders, verified digital passports, and document intake workflows.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch mb-20">
          {plans.map((plan) => (
            <div 
              key={plan.name} 
              className={`rounded-2xl p-7 sm:p-8 flex flex-col transition-all duration-300 relative ${
                plan.popular 
                  ? 'bg-gradient-to-b from-[#141014] to-[#0a080d] border-2 border-red-500/80 shadow-[0_0_40px_rgba(239,68,68,0.2)] md:-translate-y-2' 
                  : 'bg-[#0a0a0f] border border-zinc-800/90 hover:border-zinc-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[11px] font-extrabold rounded-full uppercase tracking-wider shadow-lg shadow-red-950">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
                <p className="text-zinc-400 text-xs leading-relaxed min-h-[36px]">{plan.desc}</p>
              </div>

              <div className="mb-6 pb-6 border-b border-zinc-800">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                <span className="text-zinc-500 text-sm font-medium"> / month</span>
              </div>

              <ul className="space-y-3.5 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${plan.popular ? 'bg-red-950 border border-red-600/60 text-red-400' : 'bg-zinc-900 border border-zinc-700 text-zinc-300'}`}>
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-zinc-300 text-xs font-medium leading-normal">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.popular ? 'primary' : 'outline'} 
                className="w-full"
                asChild
              >
                <Link to="/signup">
                  <span>Choose {plan.name}</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* FAQ Preview */}
        <div className="max-w-3xl mx-auto rounded-2xl bg-[#09090d] border border-zinc-800/80 p-8">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-red-500" />
            Frequently Asked Questions
          </h3>

          <div className="space-y-5 text-xs text-zinc-400">
            <div>
              <div className="font-semibold text-zinc-200 text-sm mb-1">How does the 14-day free trial work?</div>
              <p>You get full unrestricted access to all Pro features with no credit card required upfront. Ingest contractor documents immediately.</p>
            </div>
            <div className="border-t border-zinc-800/80 pt-4">
              <div className="font-semibold text-zinc-200 text-sm mb-1">What happens when an insurance certificate is about to expire?</div>
              <p>Verity triggers automated multi-channel notifications at 60, 30, and 15 days directly to the contractor with a self-service upload link.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
