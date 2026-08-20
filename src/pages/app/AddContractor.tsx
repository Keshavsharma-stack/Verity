import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { contractorService } from '../../services/contractorService';
import { authService } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';

export function AddContractor() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [trade, setTrade] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contractorType, setContractorType] = useState('Subcontractor');
  const [notes, setNotes] = useState('');

  // Passports / Compliance Requirements
  const [requirements, setRequirements] = useState({
    insuranceRequired: true,
    workersCompRequired: true,
    businessLicenseRequired: true,
    professionalLicenseRequired: false,
    taxDocumentationRequired: true,
    safetyDocumentationRequired: false,
  });

  const [status, setStatus] = useState<'IDLE' | 'ADDING' | 'ADDED' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let activeWorkspaceId = user?.workspaceId;
    if (!activeWorkspaceId) {
      const { user: freshUser } = await authService.getSession();
      if (freshUser?.workspaceId) {
        activeWorkspaceId = freshUser.workspaceId;
      }
    }

    if (!activeWorkspaceId) {
      setErrorMessage('Active workspace not found. Please log in again.');
      return;
    }

    if (!companyName.trim()) {
      setErrorMessage('Company name is required.');
      return;
    }

    if (!trade.trim()) {
      setErrorMessage('Primary trade is required.');
      return;
    }

    if (!contactName.trim()) {
      setErrorMessage('Primary representative name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid email address is required.');
      return;
    }

    setStatus('ADDING');

    const res = await contractorService.createContractor(activeWorkspaceId, {
      companyName: companyName.trim(),
      trade: trade.trim(),
      primaryContact: contactName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      contractorType,
      notes: notes.trim() || undefined,
      requirements,
    });

    if (res.error || !res.data) {
      setStatus('ERROR');
      setErrorMessage(res.error || 'Failed to save contractor profile. Please verify your inputs and try again.');
      return;
    }

    setStatus('ADDED');
    const createdId = res.data.id;
    setTimeout(() => {
      navigate(`/contractors/${createdId}`);
    }, 600);
  };

  const toggleReq = (key: keyof typeof requirements) => {
    setRequirements(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white px-0">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Add Contractor Profile</h1>
        <p className="text-xs text-zinc-400 mt-1">Register a new contractor profile to track required compliance passports.</p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-950/50 border border-red-900/80 rounded-xl flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl">
          <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80">
            <CardTitle className="text-sm font-bold text-zinc-200">Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input 
                  id="companyName" 
                  required 
                  placeholder="e.g. Apex Electrical Contracting"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="trade">Primary Trade *</Label>
                <Input 
                  id="trade" 
                  required 
                  placeholder="e.g. Electrical, Plumbing, HVAC"
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="contactName">Primary Representative *</Label>
                <Input 
                  id="contactName" 
                  required 
                  placeholder="e.g. Jane Doe"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">Email Address *</Label>
                <Input 
                  id="contactEmail" 
                  type="email" 
                  required 
                  placeholder="representative@contractor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Phone Number</Label>
                <Input 
                  id="contactPhone" 
                  type="tel" 
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contractorType">Contractor Type</Label>
                <select 
                  id="contractorType" 
                  value={contractorType}
                  onChange={(e) => setContractorType(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-zinc-800 bg-[#09090c] px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/80 focus:border-red-500/60 transition-colors"
                >
                  <option value="Subcontractor">Subcontractor</option>
                  <option value="Independent Contractor">Independent Contractor</option>
                  <option value="Material Supplier">Material Supplier</option>
                  <option value="Equipment Vendor">Equipment Vendor</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Operating Address</Label>
              <Input 
                id="address" 
                placeholder="100 Builder Way, Suite 200, City, ST 00000"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </CardContent>

          <CardHeader className="border-t border-zinc-800/80 bg-zinc-950/60">
            <CardTitle className="text-sm font-bold text-zinc-200">Mandatory Compliance Passports</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-400 mb-4">Select the verification criteria required for this contractor to work on active job sites.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { id: 'insuranceRequired', label: 'General Liability Insurance ($2M)' },
                { id: 'workersCompRequired', label: 'Workers Compensation Policy' },
                { id: 'businessLicenseRequired', label: 'State Business License' },
                { id: 'professionalLicenseRequired', label: 'Professional Trade License' },
                { id: 'taxDocumentationRequired', label: 'Tax Documentation (W-9 Form)' },
                { id: 'safetyDocumentationRequired', label: 'OSHA-30 Safety Certification' },
              ].map(req => {
                const key = req.id as keyof typeof requirements;
                const isChecked = requirements[key];
                return (
                  <label 
                    key={req.id} 
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isChecked 
                        ? 'border-red-900/60 bg-red-950/20' 
                        : 'border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900/60'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleReq(key)}
                      className="h-4 w-4 rounded border-zinc-800 bg-black text-red-600 focus:ring-red-600 focus:ring-offset-black cursor-pointer" 
                    />
                    <span className="text-xs font-semibold text-zinc-300">{req.label}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-3 bg-zinc-950/60 border-t border-zinc-800/80">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={status === 'ADDING'}>
              Cancel
            </Button>
            <Button type="submit" disabled={status === 'ADDING' || status === 'ADDED'}>
              {status === 'ADDING' ? (
                'Adding...'
              ) : status === 'ADDED' ? (
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Added
                </span>
              ) : (
                'Add Contractor'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
