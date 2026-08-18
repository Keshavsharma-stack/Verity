import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, 
  LayoutDashboard, Users, Search,
  FileCheck, ShieldAlert, ArrowRight,
  HardHat, XCircle, FileText, Clock
} from 'lucide-react';

export function Landing() {
  return (
    <div className="flex flex-col bg-zinc-950">
      {/* HERO SECTION */}
      <section className="pt-20 pb-24 lg:pt-28 lg:pb-32 overflow-hidden border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Copy */}
            <div className="max-w-xl">
              <p className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase mb-5">
                Contractor Compliance Management
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-100 mb-6 leading-[1.15]">
                Know which contractors are compliant before they step onto your site.
              </h1>
              <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
                Collect documents, track expiration dates, and see contractor compliance status from one centralized workspace.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link to="/signup">Start Free Trial</Link>
                </Button>
                <Button variant="secondary" size="lg" className="w-full sm:w-auto text-zinc-300 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800">
                  See How It Works
                </Button>
              </div>
              <p className="text-[13px] text-zinc-500 flex items-center gap-2 font-medium">
                <HardHat className="h-4 w-4 text-zinc-400" /> Built for teams managing contractors and subcontractors.
              </p>
            </div>
            
            {/* Right Column: Real UI Preview */}
            <div className="relative w-full max-w-[640px] mx-auto lg:ml-auto mt-8 lg:mt-0">
              {/* Removed absolute rotated background to flatten the design and increase directness */}
              <div className="relative rounded-xl border border-zinc-800 bg-[#09090b] shadow-2xl overflow-hidden flex flex-col w-full h-[520px] text-left select-none ring-1 ring-white/5">
                 {/* Preview Header */}
                 <div className="h-14 border-b border-zinc-800/80 flex items-center justify-between px-4 bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                      <span className="font-semibold text-sm text-zinc-100 tracking-tight">Verity</span>
                    </div>
                    <div className="ml-auto h-8 w-40 sm:w-48 bg-zinc-950 border border-zinc-800/80 rounded-md px-3 hidden sm:flex items-center shadow-inner mr-3">
                       <Search className="h-3.5 w-3.5 text-zinc-600" />
                       <span className="text-[11px] text-zinc-600 ml-2 font-medium">Search...</span>
                    </div>
                    <div className="text-[10px] font-bold tracking-widest text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">DEMO DATA</div>
                 </div>
                 
                 {/* Preview Body */}
                 <div className="flex flex-1 overflow-hidden bg-zinc-950">
                    {/* Sidebar Mock */}
                    <div className="w-14 sm:w-48 border-r border-zinc-800/80 bg-zinc-900/20 p-3 space-y-1.5 hidden sm:block">
                       <div className="h-8 rounded-md bg-zinc-800/60 flex items-center px-2.5 gap-2.5 text-zinc-100">
                          <LayoutDashboard className="h-4 w-4 text-emerald-500" /> 
                          <span className="text-xs font-medium">Dashboard</span>
                       </div>
                       <div className="h-8 rounded-md flex items-center px-2.5 gap-2.5 text-zinc-500">
                          <Users className="h-4 w-4" /> 
                          <span className="text-xs font-medium">Contractors</span>
                       </div>
                       <div className="h-8 rounded-md flex items-center px-2.5 gap-2.5 text-zinc-500">
                          <FileText className="h-4 w-4" /> 
                          <span className="text-xs font-medium">Documents</span>
                       </div>
                    </div>
                    
                    {/* Content Mock */}
                    <div className="flex-1 p-5 flex flex-col gap-5 overflow-hidden">
                       <div>
                          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Compliance Overview</h2>
                          <p className="text-[11px] font-medium text-zinc-500 mt-0.5">Monitor contractor documentation.</p>
                       </div>
                       
                       {/* KPIs */}
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="border border-zinc-800/80 rounded-lg p-3.5 bg-zinc-900/40 shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1 h-full bg-zinc-700"></div>
                             <div className="pl-2">
                               <div className="text-[10px] font-semibold text-zinc-500 mb-1 flex items-center justify-between uppercase tracking-wider">
                                  Total
                                  <Users className="h-3 w-3 text-zinc-600 hidden sm:block" />
                               </div>
                               <div className="text-xl text-zinc-100 font-semibold mt-1">142</div>
                             </div>
                          </div>
                          <div className="border border-zinc-800/80 rounded-lg p-3.5 bg-zinc-900/40 shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                             <div className="pl-2">
                               <div className="text-[10px] font-semibold text-zinc-500 mb-1 flex items-center justify-between uppercase tracking-wider">
                                  Compliant
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500/80 hidden sm:block" />
                               </div>
                               <div className="text-xl text-emerald-500 font-semibold mt-1">128</div>
                             </div>
                          </div>
                          <div className="border border-zinc-800/80 rounded-lg p-3.5 bg-zinc-900/40 shadow-sm relative overflow-hidden hidden sm:block">
                             <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                             <div className="pl-2">
                               <div className="text-[10px] font-semibold text-zinc-500 mb-1 flex items-center justify-between uppercase tracking-wider">
                                  Action Req.
                                  <AlertTriangle className="h-3 w-3 text-amber-500/80" />
                               </div>
                               <div className="text-xl text-amber-500 font-semibold mt-1">14</div>
                             </div>
                          </div>
                       </div>
                       
                       {/* Table Mock */}
                       <div className="border border-zinc-800/80 rounded-lg bg-zinc-900/20 flex-1 flex flex-col overflow-hidden shadow-sm">
                          <div className="h-9 border-b border-zinc-800/80 flex items-center px-4 bg-zinc-900/50">
                             <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Contractor</span>
                             <span className="text-[11px] font-semibold text-zinc-500 ml-auto uppercase tracking-wider">Status</span>
                          </div>
                          <div className="flex-1 p-0 flex flex-col divide-y divide-zinc-800/40">
                             <div className="p-3.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                                <div className="flex flex-col">
                                   <span className="text-[13px] font-semibold text-zinc-200">Apex Electrical</span>
                                   <span className="text-[11px] text-zinc-500 font-medium mt-0.5">All documents verified</span>
                                </div>
                                <Badge variant="success" className="text-[9px] px-2 py-0.5 uppercase tracking-wider font-semibold">COMPLIANT</Badge>
                             </div>
                             <div className="p-3.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors bg-amber-950/5">
                                <div className="flex flex-col">
                                   <span className="text-[13px] font-semibold text-zinc-200">Solid Foundations LLC</span>
                                   <span className="text-[11px] text-zinc-500 font-medium mt-0.5">Workers Comp exp. in 12 days</span>
                                </div>
                                <Badge variant="warning" className="text-[9px] px-2 py-0.5 uppercase tracking-wider font-semibold">EXPIRING</Badge>
                             </div>
                             <div className="p-3.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors bg-red-950/5">
                                <div className="flex flex-col">
                                   <span className="text-[13px] font-semibold text-zinc-200">Skyline Plumbing</span>
                                   <span className="text-[11px] text-zinc-500 font-medium mt-0.5">Missing W-9 Form</span>
                                </div>
                                <Badge variant="danger" className="text-[9px] px-2 py-0.5 uppercase tracking-wider font-semibold">NON-COMPLIANT</Badge>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section className="py-24 bg-[#0a0a0c]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-zinc-100 mb-4 tracking-tight">
              Contractor compliance shouldn't live in spreadsheets and inboxes.
            </h2>
            <p className="text-zinc-400 text-lg">
              Manual tracking introduces operational risk and delays projects.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: XCircle, title: 'Expired Documents', desc: 'Working with lapsed insurance policies introduces massive liability.' },
              { icon: FileCheck, title: 'Missing Documents', desc: 'Contractors starting work before submitting required certifications.' },
              { icon: LayoutDashboard, title: 'Scattered Files', desc: 'Documents lost across shared drives, emails, and physical folders.' },
              { icon: Clock, title: 'Manual Follow-ups', desc: 'Wasting hours chasing subcontractors for updated paperwork.' },
            ].map((problem, i) => (
              <div key={i} className="p-5 rounded-lg border border-zinc-800/80 bg-zinc-900/40">
                <problem.icon className="h-5 w-5 text-zinc-500 mb-4" />
                <h3 className="text-sm font-semibold text-zinc-200 mb-2">{problem.title}</h3>
                <p className="text-[13px] text-zinc-400 leading-relaxed">{problem.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW SECTION */}
      <section className="py-24 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-semibold text-zinc-100 mb-6 tracking-tight">The Compliance Workflow</h2>
              <p className="text-zinc-400 text-lg mb-10">A systematic approach to managing contractor risk.</p>
              
              <div className="space-y-8">
                {[
                  { step: '01', title: 'Collect', desc: 'Securely store insurance policies, licenses, and safety certifications.' },
                  { step: '02', title: 'Verify', desc: 'Review submitted documents against custom compliance requirements.' },
                  { step: '03', title: 'Monitor', desc: 'Track expiration dates across your entire contractor base automatically.' },
                  { step: '04', title: 'Act', desc: 'Identify non-compliant contractors before they enter the job site.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="text-sm font-bold text-zinc-600 pt-0.5">{item.step}</div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-200 mb-1">{item.title}</h3>
                      <p className="text-[14px] text-zinc-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Passport Showcase Mock */}
            <div className="rounded-xl border border-zinc-800 bg-[#09090b] shadow-2xl p-6 relative">
              <div className="border-b border-zinc-800/80 pb-5 mb-5 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">Solid Foundations LLC</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="warning" className="text-[10px] px-2 py-0.5">EXPIRING</Badge>
                    <span className="text-xs text-zinc-500 font-medium">Concrete Trade</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">Status</div>
                  <div className="text-sm text-amber-500 font-medium">Action Required</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Required Documents</div>
                
                <div className="flex items-center justify-between p-3 rounded-md bg-zinc-900/50 border border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-zinc-300 font-medium">General Liability</span>
                  </div>
                  <span className="text-xs text-zinc-500">Valid</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-amber-950/10 border border-amber-900/30">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-zinc-200 font-medium">Workers Compensation</span>
                  </div>
                  <span className="text-xs text-amber-500 font-medium">Expiring in 12 days</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-zinc-900/50 border border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-zinc-300 font-medium">Business License</span>
                  </div>
                  <span className="text-xs text-zinc-500">Valid</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-24 bg-[#0a0a0c] border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6">
              <h3 className="text-base font-semibold text-zinc-100 mb-3">One Source of Truth</h3>
              <p className="text-[14px] text-zinc-400 leading-relaxed">Centralize all contractor information, contacts, and documents in a single, accessible database.</p>
            </div>
            <div className="p-6">
              <h3 className="text-base font-semibold text-zinc-100 mb-3">Expiration Visibility</h3>
              <p className="text-[14px] text-zinc-400 leading-relaxed">Never be caught off guard. Anticipate expiring documents before they lapse and halt work.</p>
            </div>
            <div className="p-6">
              <h3 className="text-base font-semibold text-zinc-100 mb-3">Faster Onboarding</h3>
              <p className="text-[14px] text-zinc-400 leading-relaxed">Standardize the compliance review process to get verified contractors onto the job site faster.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-zinc-900 bg-zinc-950 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-100 mb-6 tracking-tight">
            Know what's current. Know what's missing. Know what needs attention.
          </h2>
          <p className="text-lg text-zinc-400 mb-8">
            Take control of your contractor compliance workflow today.
          </p>
          <Button size="lg" asChild>
            <Link to="/signup">Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
