import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormLabel } from '../../components/ui/Form';
import { Textarea } from '../../components/ui/Form';
import { AlertBanner } from '../../components/ui/AlertDialog';
import { Lock, Building2, Mail, Phone, MapPin, FileText, Image, CheckCircle, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { licenseService } from '../../services/licenseService';
import { CompanyProfile } from '../../types';
import toast from 'react-hot-toast';

export default function CompanySettings() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    taxId: '',
    contactEmail: '',
    contactPhone: '',
    logoUrl: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, locked] = await Promise.all([
        licenseService.getCompanyProfile(),
        licenseService.isLicenseLocked()
      ]);

      if (profileData) {
        setProfile(profileData);
        setFormData({
          name: profileData.name,
          address: profileData.address,
          taxId: profileData.taxId || '',
          contactEmail: profileData.contactEmail || '',
          contactPhone: profileData.contactPhone || '',
          logoUrl: profileData.logoUrl || ''
        });
      }

      setIsLocked(locked);
    } catch (error) {
      console.error('Error loading company data:', error);
      toast.error('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await licenseService.updateCompanyProfile(formData);
      toast.success('Company settings updated successfully');
      setHasChanges(false);
      await loadData(); // Reload to get updated data
    } catch (error: any) {
      console.error('Error saving company settings:', error);
      toast.error(error.message || 'Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (profile) {
      setFormData({
        name: profile.name,
        address: profile.address,
        taxId: profile.taxId || '',
        contactEmail: profile.contactEmail || '',
        contactPhone: profile.contactPhone || '',
        logoUrl: profile.logoUrl || ''
      });
      setHasChanges(false);
      toast.success('Form reset to saved values');
    }
  };

  const isFormValid = formData.name.trim() && formData.address.trim();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading company settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
            <p className="text-gray-600 text-lg mt-1">Manage your company information and branding</p>
          </div>
        </div>
      </div>

      {/* Lock Warning */}
      {isLocked && (
        <AlertBanner type="warning" className="border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Settings Locked</p>
              <p className="text-amber-700">Settings are locked under Virtual Software Pvt Ltd license. Contact administrator for changes.</p>
            </div>
          </div>
        </AlertBanner>
      )}

      {/* Main Form Card */}
      <Card className="bg-white shadow-xl border border-gray-200">
        <CardHeader className="pb-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <Building2 className="h-7 w-7 text-blue-600" />
            Company Information
          </CardTitle>
          <CardDescription className="text-gray-600 text-lg">
            Basic company details that appear on receipts and reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          {/* Company Name and Tax ID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
              <FormLabel htmlFor="name" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <span className="text-red-500 text-lg">*</span>
                Company Name
              </FormLabel>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isLocked}
                placeholder="Enter your company name"
                className="h-14 text-lg font-medium"
                variant="default"
              />
              {!formData.name && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Company name is required
                </p>
              )}
            </div>

            <div className="space-y-3">
              <FormLabel htmlFor="taxId" className="text-sm font-bold text-gray-800">
                Tax ID
              </FormLabel>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                disabled={isLocked}
                placeholder="Enter your tax identification number"
                className="h-14 text-lg"
                variant="default"
              />
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                Optional - used for tax reporting
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <FormLabel htmlFor="address" className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="text-red-500 text-lg">*</span>
              Address
            </FormLabel>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              disabled={isLocked}
              placeholder="Enter your complete company address"
              rows={4}
              className="text-lg resize-none"
              variant="default"
            />
            {!formData.address && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Address is required
              </p>
            )}
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
              <FormLabel htmlFor="contactEmail" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Contact Email
              </FormLabel>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                disabled={isLocked}
                placeholder="contact@yourcompany.com"
                className="h-14 text-lg"
                variant="default"
              />
              {formData.contactEmail ? (
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Valid email format
                </p>
              ) : (
                <p className="text-sm text-amber-600 flex items-center gap-2">
                  <span className="w-1 h-1 bg-amber-600 rounded-full"></span>
                  Optional - used for receipts and reports
                </p>
              )}
            </div>

            <div className="space-y-3">
              <FormLabel htmlFor="contactPhone" className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                Contact Phone
              </FormLabel>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                disabled={isLocked}
                placeholder="+94 XX XXX XXXX"
                className="h-14 text-lg"
                variant="default"
              />
              {formData.contactPhone ? (
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Phone number added
                </p>
              ) : (
                <p className="text-sm text-amber-600 flex items-center gap-2">
                  <span className="w-1 h-1 bg-amber-600 rounded-full"></span>
                  Optional - used for receipts and reports
                </p>
              )}
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-3">
            <FormLabel htmlFor="logoUrl" className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Image className="h-5 w-5 text-blue-600" />
              Logo URL
            </FormLabel>
            <Input
              id="logoUrl"
              value={formData.logoUrl}
              onChange={(e) => handleInputChange('logoUrl', e.target.value)}
              disabled={isLocked}
              placeholder="https://example.com/logo.png"
              className="h-14 text-lg"
              variant="default"
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Image className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">Logo Guidelines</p>
                  <p className="text-sm text-blue-700">
                    Your logo will appear on receipts and reports. Use a high-quality image URL (PNG, JPG) for best results. 
                    Recommended size: 200x100 pixels or similar aspect ratio.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isLocked && (
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <Button
                onClick={handleReset}
                disabled={!hasChanges || saving}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={saving || !isFormValid || !hasChanges}
                className="flex items-center gap-2 min-w-[140px] h-12 text-lg font-semibold"
                variant="primary"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Information Preview */}
      {profile && (
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 shadow-lg border border-gray-200">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
              <FileText className="h-6 w-6 text-green-600" />
              Current Information
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Preview of your current company settings
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Company Name</div>
                  <div className="text-lg font-medium text-gray-900">{profile.name}</div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Address</div>
                  <div className="text-base text-gray-900 whitespace-pre-line">{profile.address}</div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Contact Email</div>
                  <div className="text-base text-gray-900">
                    {profile.contactEmail ? (
                      <span className="text-blue-600 font-medium">{profile.contactEmail}</span>
                    ) : (
                      <span className="text-amber-600 italic">Not set</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Tax ID</div>
                  <div className="text-base text-gray-900">
                    {profile.taxId ? (
                      <span className="font-medium">{profile.taxId}</span>
                    ) : (
                      <span className="text-amber-600 italic">Not set</span>
                    )}
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Contact Phone</div>
                  <div className="text-base text-gray-900">
                    {profile.contactPhone ? (
                      <span className="text-blue-600 font-medium">{profile.contactPhone}</span>
                    ) : (
                      <span className="text-amber-600 italic">Not set</span>
                    )}
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Last Updated</div>
                  <div className="text-base text-gray-600">
                    {new Date(profile.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}