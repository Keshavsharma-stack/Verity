import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CompliancePassport3D } from '../../components/3d/CompliancePassport3D';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, 
  LayoutDashboard, Users, Search,
  FileCheck, ArrowRight,
  HardHat, XCircle, FileText, Clock, Sparkles,
  Lock, Check, Filter, RefreshCw
} from 'lucide-react';

export function Landing() {
  const [activePreviewTab, setActivePreviewTab] = useState<'all' | 'compliant' | 'at-risk'>('all');

  const demoContractorRows = [
    { name: 'Apex Electrical Systems', trade: 'Electrical (High Voltage)', status: 'COMPLIANT', desc: 'All 8 COIs, OSHA-30 & State License active', tag: '180d remaining' },
    { name: 'Solid Foundations LLC', trade: 'Concrete & Masonry', status: 'EXPIRING', desc: 'Workers Comp Policy expires in 12 days', tag: 'Expiring in 12d' },
    { name: 'Skyline Plumbing Group', trade: 'Mechanical & Plumbing', status: 'NON_COMPLIANT', desc: 'Missing $2M General Liability renewal', tag: 'Action Required' },
    { name: 'Vanguard Steel Erectors', trade: 'Structural Steel', status: 'COMPLIANT', desc: 'Master Service Agreement & Umbrella verified', tag: '240d remaining' },
  ];

  const filteredRows = demoContractorRows.filter(row => {
    if (activePreviewTab === 'compliant') return row.status === 'COMPLIANT';
    if (activePreviewTab === 'at-risk') return row.status === 'EXPIRING' || row.status === 'NON_COMPLIANT';
    return true;
  });

  return (
    <div className="flex flex-col bg-[#050505] text-[#f4f4f5] overflow-hidden antialiased">
      {/* 1. HERO SECTION */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden border-b border-zinc-800/80">
        {/* Obsidian and Crimson Radial Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-red-600/15 via-red-950/5 to-transparent blur-[140px] pointer-events-none -z-0" />
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-red-600/10 blur-[130px] pointer-events-none -z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Copy */}
            <div className="lg:col-span-6 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/70 border border-red-800/60 text-red-300 text-xs font-semibold tracking-wider uppercase mb-6 shadow-sm shadow-red-950">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>Next-Gen Compliance Intelligence</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.12]">
                Know which contractors are <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-400 to-red-500">compliant</span> before they step onto your site.
              </h1>
              
              <p className="text-base sm:text-lg text-zinc-400 mb-8 leading-relaxed">
                Collect insurance certificates, automate expiration tracking, and verify trade credentials with instant risk visibility across all your commercial projects.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-8">
                <Button size="lg" className="w-full sm:w-auto" asChild>
                  <Link to="/signup">
                    <span>Start Free</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                  <a href="#product-preview">View Demo</a>
                </Button>
              </div>

              <div className="p-3 rounded-xl bg-[#09090d]/80 border border-zinc-800/80 inline-flex items-center gap-3 text-xs text-zinc-400">
                <div className="w-6 h-6 rounded-md bg-red-950/80 border border-red-600/50 flex items-center justify-center shrink-0">
                  <HardHat className="h-3.5 w-3.5 text-red-500" />
                </div>
                <span>Engineered for general contractors, safety directors, and project executives.</span>
              </div>
            </div>
            
            {/* Right Column: 3D Compliance Passport Visual */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <CompliancePassport3D />
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRODUCT PREVIEW SECTION (ACTUAL VERITY ENGINE) */}
      <section id="product-preview" className="py-24 bg-[#080808] border-b border-zinc-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <span>Interactive System Preview</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Real-time contractor compliance at your fingertips
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              Experience the centralized dashboard where risk indicators, automated OCR parsing, and gate access decisions happen synchronously.
            </p>
          </div>

          {/* Interactive Mock Dashboard */}
          <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0f] shadow-2xl shadow-black overflow-hidden relative">
            {/* Top Toolbar */}
            <div className="h-14 border-b border-zinc-800/90 bg-[#0d0d12] px-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-600/50 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-red-500" />
                </div>
                <span className="font-bold text-sm text-white tracking-tight">Verity Live Console</span>
                <span className="text-[10px] bg-red-950/70 border border-red-800/60 text-red-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider ml-2">
                  DEMO DATA
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-zinc-800 text-xs text-zinc-400">
                  <Search className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Search across 142 subcontractors...</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            {/* Main Preview Container */}
            <div className="p-4 sm:p-8 bg-[#060608]">
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-[#0e0e14] border border-zinc-800/80">
                  <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Total Subs</span>
                    <Users className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white mt-1">142</div>
                  <div className="text-[11px] text-zinc-500 mt-1">Across 8 job sites</div>
                </div>

                <div className="p-4 rounded-xl bg-[#0e0e14] border border-emerald-900/40">
                  <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Compliant</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">128</div>
                  <div className="text-[11px] text-emerald-500/80 mt-1">90.1% site-ready rate</div>
                </div>

                <div className="p-4 rounded-xl bg-[#0e0e14] border border-amber-900/40">
                  <div className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Expiring &lt;30d</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-amber-400 mt-1">9</div>
                  <div className="text-[11px] text-amber-500/80 mt-1">Renewal notices sent</div>
                </div>

                <div className="p-4 rounded-xl bg-[#0e0e14] border border-red-900/50">
                  <div className="text-xs text-red-400 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Non-Compliant</span>
                    <XCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-red-400 mt-1">5</div>
                  <div className="text-[11px] text-red-400 mt-1">Gate access barred</div>
                </div>
              </div>

              {/* Table Filter Tabs */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActivePreviewTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activePreviewTab === 'all'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    All Subcontractors (142)
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('compliant')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activePreviewTab === 'compliant'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Compliant (128)
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('at-risk')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activePreviewTab === 'at-risk'
                        ? 'bg-red-950 text-red-300 border border-red-800/60'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Risk Alerts (14)
                  </button>
                </div>
                <div className="text-xs text-zinc-500 hidden sm:flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filtered Live</span>
                </div>
              </div>

              {/* Contractor Rows */}
              <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800/80 bg-[#09090d] overflow-hidden">
                {filteredRows.map((row, idx) => (
                  <div key={idx} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-300 font-bold text-xs">
                        {row.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{row.name}</span>
                          <span className="text-[10px] text-zinc-500 bg-black px-2 py-0.5 rounded border border-zinc-800">
                            {row.trade}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{row.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="text-xs text-zinc-400 font-medium">{row.tag}</span>
                      <Badge
                        variant={row.status === 'COMPLIANT' ? 'success' : row.status === 'EXPIRING' ? 'warning' : 'danger'}
                        className="text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider"
                      >
                        {row.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. OPERATIONAL VULNERABILITIES */}
      <section className="py-24 bg-[#050505] border-b border-zinc-800/80 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3 block">
              Eliminate Operational Vulnerabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Compliance chaos stops before liability occurs.
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              Manual tracking via spreadsheets and email attachments guarantees lapsed insurance, delayed projects, and catastrophic liability.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: XCircle, title: 'Lapsed COI Coverage', desc: 'Subcontractors operating with expired policies expose your firm to full bodily injury and property damages.', color: 'text-red-500' },
              { icon: FileCheck, title: 'Missing W-9s & Licenses', desc: 'Unlicensed trades setting foot on job sites prior to submitting required state and OSHA certifications.', color: 'text-rose-500' },
              { icon: LayoutDashboard, title: 'Dispersed Folders', desc: 'Critical coverage limits hidden across inbox chains, desktop folders, and handwritten paper logs.', color: 'text-zinc-400' },
              { icon: Clock, title: 'Endless Administrative Chase', desc: 'Spending 20+ hours per week manually calling and emailing subcontractors for certificate updates.', color: 'text-red-400' },
            ].map((problem, i) => (
              <div key={i} className="p-6 rounded-xl border border-zinc-800/90 bg-[#0d0d12]/90 hover:border-red-500/40 hover:bg-[#121218] transition-all duration-200 group">
                <div className="w-10 h-10 rounded-lg bg-red-950/40 border border-red-900/40 flex items-center justify-center mb-4 group-hover:border-red-500/60 transition-colors">
                  <problem.icon className={`h-5 w-5 ${problem.color}`} />
                </div>
                <h3 className="text-base font-bold text-zinc-100 mb-2">{problem.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{problem.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. THE 4-STEP PASSPORT WORKFLOW */}
      <section className="py-24 border-b border-zinc-800/80 bg-[#080808] relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <span className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3 block">
                Standardized Intelligence
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 tracking-tight">
                The 4-Step Verity Passport Architecture
              </h2>
              <p className="text-zinc-400 text-base mb-8 leading-relaxed">
                Transform unpredictable subcontractor paperwork into an automated, tamper-evident gatekeeper for every active project.
              </p>
              
              <div className="space-y-4">
                {[
                  { step: '01', title: 'Collect & Digitize', desc: 'Securely ingest Certificates of Insurance, W-9s, Master Service Agreements, and OSHA-30 credentials.' },
                  { step: '02', title: 'Automated Rule Validation', desc: 'Verify required policy limits (e.g. $2M Aggregate, Additional Insured, Waiver of Subrogation) immediately.' },
                  { step: '03', title: 'Proactive Expiration Watch', desc: 'Automated 60/30/15-day notifications dispatched directly to subcontractors before coverage lapses.' },
                  { step: '04', title: 'Verified Gate Access', desc: 'Instant green/red verification credential for field supervisors and safety directors.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-red-900/60 transition-colors">
                    <div className="text-xs font-mono font-bold text-red-500 pt-0.5">{item.step}</div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 mb-1">{item.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Passport Detail Card */}
            <div className="lg:col-span-6 rounded-2xl border border-zinc-800 bg-[#0d0d12] shadow-2xl p-6 sm:p-7 relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
              
              <div className="border-b border-zinc-800 pb-5 mb-5 flex justify-between items-start">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Active Contractor</div>
                  <h3 className="text-lg font-bold text-white">Solid Foundations LLC</h3>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <Badge variant="warning" className="text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold">
                      EXPIRING
                    </Badge>
                    <span className="text-xs text-zinc-400 font-medium">Concrete & Structural</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Gate Pass</div>
                  <div className="text-xs font-bold text-amber-400 bg-amber-950/50 border border-amber-800/50 px-2.5 py-1 rounded">
                    Action Required
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Required Compliance Documents</div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-zinc-200">General Liability ($2,000,000 Aggregate)</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold">Valid (182d)</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-950/20 border border-amber-800/50">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-semibold text-zinc-200">Workers' Compensation & Employer Liability</span>
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold">Expiring in 12d</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-zinc-200">State Contractor License & Bond</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold">Verified Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="py-24 border-t border-zinc-800/80 bg-gradient-to-b from-[#080808] to-[#040406] text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-950">
            <ShieldCheck className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Stop guessing contractor compliance. Start knowing with Verity.
          </h2>
          <p className="text-base text-zinc-400 mb-8 max-w-xl mx-auto leading-relaxed">
            Protect your projects, reduce paperwork friction, and maintain audit-proof compliance records from day one.
          </p>
          <Button size="lg" className="px-8 py-3 text-base shadow-xl shadow-red-950 hover:shadow-red-600/30" asChild>
            <Link to="/signup">
              <span>Start Free</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
