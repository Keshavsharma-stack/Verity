import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Check } from 'lucide-react';

export function Pricing() {
  const plans = [
    {
      name: 'Starter',
      desc: 'Perfect for small teams managing a few contractors.',
      price: '$49',
      features: ['Up to 50 Contractors', '500 Documents', '3 Team Members', 'Basic Email Alerts', 'Standard Support'],
    },
    {
      name: 'Pro',
      desc: 'For growing companies with rigorous compliance needs.',
      price: '$149',
      popular: true,
      features: ['Up to 250 Contractors', '2,500 Documents', '10 Team Members', 'Advanced Reporting', 'Automated Reminders', 'Priority Support'],
    },
    {
      name: 'Business',
      desc: 'Enterprise-grade controls and unlimited scale.',
      price: '$399',
      features: ['Unlimited Contractors', 'Unlimited Documents', '50 Team Members', 'Custom Requirements', 'API Access', 'Dedicated Account Manager'],
    }
  ];

  return (
    <div className="py-24 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h1>
          <p className="text-xl text-zinc-400">Start managing compliance today. No hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name} 
              className={`rounded-2xl p-8 bg-zinc-900 border ${plan.popular ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-zinc-800'} flex flex-col`}
            >
              {plan.popular && (
                <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full mb-4 w-fit">
                  Most Popular
                </span>
              )}
              <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
              <p className="text-zinc-400 text-sm mb-6 h-10">{plan.desc}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-zinc-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mr-3" />
                    <span className="text-zinc-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                variant={plan.popular ? 'primary' : 'outline'} 
                className="w-full"
                asChild
              >
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
