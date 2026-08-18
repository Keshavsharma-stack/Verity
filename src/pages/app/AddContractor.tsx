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
    // In a real app, gather form data here
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
        <h1 className="text-2xl font-bold text-white tracking-tight">Add Contractor</h1>
        <p className="text-sm text-zinc-400 mt-1">Create a new contractor profile to start tracking compliance.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                >
                  <option value="Subcontractor">Subcontractor</option>
                  <option value="Independent">Independent Contractor</option>
                  <option value="Vendor">Vendor</option>
                </select>
              </div>
            </div>
          </CardContent>

          <CardHeader className="border-t border-zinc-800 mt-4">
            <CardTitle>Compliance Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400 mb-4">Select the documentation required for this contractor to be considered compliant.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: 'req_ins', label: 'General Liability Insurance' },
                { id: 'req_wc', label: 'Workers Compensation' },
                { id: 'req_bl', label: 'Business License' },
                { id: 'req_pl', label: 'Professional License' },
                { id: 'req_tax', label: 'Tax Documentation (W-9)' },
                { id: 'req_safe', label: 'Safety Certification' },
              ].map(req => (
                <label key={req.id} className="flex items-center space-x-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 cursor-pointer hover:bg-zinc-800/80 transition-colors">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-zinc-900" />
                  <span className="text-sm font-medium text-zinc-300">{req.label}</span>
                </label>
              ))}
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" isLoading={loading}>Save Contractor</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
