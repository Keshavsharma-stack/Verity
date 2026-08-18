import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { ArrowLeft } from 'lucide-react';
import { contractorService } from '../../services/api';

export function AddContractor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await contractorService.addContractor({
      companyName: 'New Contractor Ltd',
      primaryContact: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-0000',
      address: '123 Test St',
      contractorType: 'Subcontractor',
      trade: 'General',
      requirements: {
        insuranceRequired: true,
        businessLicenseRequired: true,
        professionalLicenseRequired: false,
        safetyDocumentationRequired: false,
        taxDocumentationRequired: true,
        workersCompRequired: true,
      }
    });
    setLoading(false);
    navigate('/contractors');
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

      <form onSubmit={handleSubmit}>
        <Card className="bg-[#0a0a0f] border-zinc-800/80 shadow-2xl">
          <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80">
            <CardTitle className="text-sm font-bold text-zinc-200">Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" required placeholder="e.g. Apex Electrical" />
              </div>
              <div>
                <Label htmlFor="trade">Primary Trade</Label>
                <Input id="trade" required placeholder="e.g. Electrical, Plumbing" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="contactName">Primary Contact Name</Label>
                <Input id="contactName" required placeholder="e.g. Jane Doe" />
              </div>
              <div>
                <Label htmlFor="contactEmail">Email Address</Label>
                <Input id="contactEmail" type="email" required placeholder="jane@example.com" />
              </div>
              <div>
                <Label htmlFor="contactPhone">Phone Number</Label>
                <Input id="contactPhone" type="tel" placeholder="(555) 123-4567" />
              </div>
              <div>
                <Label htmlFor="contractorType">Contractor Type</Label>
                <select 
                  id="contractorType" 
                  className="flex h-10 w-full rounded-lg border border-zinc-800 bg-[#09090c] px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/80 focus:border-red-500/60 transition-colors"
                >
                  <option value="Subcontractor">Subcontractor</option>
                  <option value="Independent">Independent Contractor</option>
                  <option value="Vendor">Vendor</option>
                </select>
              </div>
            </div>
          </CardContent>

          <CardHeader className="border-t border-zinc-800/80 bg-zinc-950/60">
            <CardTitle className="text-sm font-bold text-zinc-200">Mandatory Compliance Passports</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-400 mb-4">Select the verification criteria required for this contractor to work on active job sites.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { id: 'req_ins', label: 'General Liability Insurance ($2M)' },
                { id: 'req_wc', label: 'Workers Compensation Policy' },
                { id: 'req_bl', label: 'State Business License' },
                { id: 'req_pl', label: 'Professional Trade License' },
                { id: 'req_tax', label: 'Tax Documentation (W-9 Form)' },
                { id: 'req_safe', label: 'OSHA-30 Safety Certification' },
              ].map(req => (
                <label key={req.id} className="flex items-center space-x-3 p-3 rounded-lg border border-zinc-800 bg-zinc-950/80 cursor-pointer hover:bg-zinc-900/60 hover:border-red-950 transition-colors">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-800 bg-black text-red-600 focus:ring-red-600 focus:ring-offset-black cursor-pointer" />
                  <span className="text-xs font-semibold text-zinc-300">{req.label}</span>
                </label>
              ))}
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-3 bg-zinc-950/60 border-t border-zinc-800/80">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" isLoading={loading}>Save Contractor</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
