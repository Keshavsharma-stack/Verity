import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { ArrowLeft } from 'lucide-react';
import { contractorService } from '../../services/api';
import { Contractor } from '../../types';

export function EditContractor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contractor, setContractor] = useState<Contractor | null>(null);

  useEffect(() => {
    if (!id) return;
    contractorService.getContractorById(id).then(con => {
      setContractor(con || null);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Mock save, wait briefly then navigate back
    setTimeout(() => {
      setSaving(false);
      navigate(`/contractors/${id}`);
    }, 500);
  };

  if (loading) {
    return <div className="text-zinc-500 p-8">Loading...</div>;
  }

  if (!contractor) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-medium text-white mb-2">Contractor Not Found</h2>
        <Button variant="outline" onClick={() => navigate('/contractors')}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white px-0">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Edit Contractor</h1>
        <p className="text-sm text-zinc-400 mt-1">Update contractor profile details.</p>
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
                <Input id="companyName" required defaultValue={contractor.companyName} />
              </div>
              <div>
                <Label htmlFor="trade">Primary Trade</Label>
                <Input id="trade" required defaultValue={contractor.trade} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="contactName">Primary Contact Name</Label>
                <Input id="contactName" required defaultValue={contractor.primaryContact} />
              </div>
              <div>
                <Label htmlFor="contactEmail">Email Address</Label>
                <Input id="contactEmail" type="email" required defaultValue={contractor.email} />
              </div>
              <div>
                <Label htmlFor="contactPhone">Phone Number</Label>
                <Input id="contactPhone" type="tel" defaultValue={contractor.phone} />
              </div>
              <div>
                <Label htmlFor="contractorType">Contractor Type</Label>
                <select 
                  id="contractorType"
                  defaultValue={contractor.contractorType}
                  className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                >
                  <option value="Subcontractor">Subcontractor</option>
                  <option value="Independent Contractor">Independent Contractor</option>
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
                { id: 'insuranceRequired', label: 'General Liability Insurance', val: contractor.requirements.insuranceRequired },
                { id: 'workersCompRequired', label: 'Workers Compensation', val: contractor.requirements.workersCompRequired },
                { id: 'businessLicenseRequired', label: 'Business License', val: contractor.requirements.businessLicenseRequired },
                { id: 'professionalLicenseRequired', label: 'Professional License', val: contractor.requirements.professionalLicenseRequired },
                { id: 'taxDocumentationRequired', label: 'Tax Documentation (W-9)', val: contractor.requirements.taxDocumentationRequired },
                { id: 'safetyDocumentationRequired', label: 'Safety Certification', val: contractor.requirements.safetyDocumentationRequired },
              ].map(req => (
                <label key={req.id} className="flex items-center space-x-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 cursor-pointer hover:bg-zinc-800/80 transition-colors">
                  <input type="checkbox" defaultChecked={req.val} className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-zinc-900" />
                  <span className="text-sm font-medium text-zinc-300">{req.label}</span>
                </label>
              ))}
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Save Changes</Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
