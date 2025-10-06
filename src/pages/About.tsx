import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  Shield, 
  Building2, 
  Calendar, 
  Key, 
  Info,
  ExternalLink,
  Lock
} from 'lucide-react';
import { licenseService } from '../services/licenseService';
import { LicenseInfo, CompanyProfile } from '../types';

export default function About() {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [license, company] = await Promise.all([
        licenseService.getLicenseInfo(),
        licenseService.getCompanyProfile()
      ]);

      setLicenseInfo(license);
      setCompanyProfile(company);
    } catch (error) {
      console.error('Error loading about data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">About viRtual POS</h1>
        <p className="text-gray-600">Product information and licensing details</p>
      </div>

      {/* Product Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Product Information
          </CardTitle>
          <CardDescription>
            Details about the viRtual POS system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-700">Product Name:</span>
              <p className="text-lg font-semibold text-gray-900">
                {licenseInfo?.productName || 'viRtual POS'}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Version:</span>
              <p className="text-lg text-gray-900">1.0.0</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Build Type:</span>
              <Badge variant="secondary">Production</Badge>
            </div>
            <div>
              <span className="font-medium text-gray-700">License Status:</span>
              <Badge variant={licenseInfo?.locked ? "danger" : "default"}>
                {licenseInfo?.locked ? "Locked" : "Unlocked"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            License Information
          </CardTitle>
          <CardDescription>
            Licensing and legal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Licensed to:</span>
              <p className="text-lg font-semibold text-gray-900">
                {licenseInfo?.licensee || 'Virtual Software Pvt Ltd'}
              </p>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Full Company Name:</span>
              <p className="text-gray-900">
                {licenseInfo?.fullName || 'Visual Interface Resource Technology Unified Analytics Labs'}
              </p>
            </div>

            <div>
              <span className="font-medium text-gray-700">License Issued:</span>
              <p className="text-gray-900">
                {licenseInfo?.issuedAt ? new Date(licenseInfo.issuedAt).toLocaleDateString() : 'Not available'}
              </p>
            </div>

            <div>
              <span className="font-medium text-gray-700">License Status:</span>
              <div className="flex items-center gap-2 mt-1">
                <Lock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-900">
                  {licenseInfo?.locked ? 'Settings are locked' : 'Settings are unlocked'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Copyright Notice</h4>
            <p className="text-sm text-gray-700">
              © 2024 Virtual Software Pvt Ltd. All rights reserved.
            </p>
            <p className="text-sm text-gray-700 mt-1">
              This software is proprietary and confidential. Unauthorized copying, distribution, 
              or modification is strictly prohibited.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Company Profile */}
      {companyProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Profile
            </CardTitle>
            <CardDescription>
              Your company information as configured in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Company Name:</span>
                <p className="text-gray-900">{companyProfile.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tax ID:</span>
                <p className="text-gray-900">{companyProfile.taxId || 'Not set'}</p>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-gray-700">Address:</span>
                <p className="text-gray-900 whitespace-pre-line">{companyProfile.address}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Contact Email:</span>
                <p className="text-gray-900">{companyProfile.contactEmail || 'Not set'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Contact Phone:</span>
                <p className="text-gray-900">{companyProfile.contactPhone || 'Not set'}</p>
              </div>
              <div className="md:col-span-2">
                <span className="font-medium text-gray-700">Last Updated:</span>
                <p className="text-gray-900">{new Date(companyProfile.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Technical Information
          </CardTitle>
          <CardDescription>
            System and technical details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Framework:</span>
              <p className="text-gray-900">React + TypeScript + Vite</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Database:</span>
              <p className="text-gray-900">LocalStorage (Development)</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">UI Library:</span>
              <p className="text-gray-900">Tailwind CSS + Lucide Icons</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Build Tool:</span>
              <p className="text-gray-900">Vite 4.5.0</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-4">
        <p>viRtual POS © 2024 Virtual Software Pvt Ltd</p>
        <p className="mt-1">Visual Interface Resource Technology Unified Analytics Labs</p>
      </div>
    </div>
  );
}
