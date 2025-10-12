import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  Shield, 
  Building2, 
  Calendar, 
  Key, 
  Info,
  ExternalLink,
  Lock,
  Copy,
  Check
} from 'lucide-react';
import { licenseService } from '../services/licenseService';
import { LicenseInfo, CompanyProfile } from '../types';
import { toast } from 'react-hot-toast';

export default function About() {
  const { t } = useTranslation();
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const copySystemInfo = async () => {
    const systemInfo = {
      productName: licenseInfo?.productName || 'viRtual POS',
      version: '1.0.0',
      buildType: 'Production',
      licenseStatus: licenseInfo?.locked ? 'Locked' : 'Unlocked',
      licensee: licenseInfo?.licensee || 'Virtual Software Pvt Ltd',
      framework: 'React + TypeScript + Vite',
      database: 'SQLite + better-sqlite3',
      uiLibrary: 'Tailwind CSS + Lucide Icons',
      buildTool: 'Vite 4.5.0',
      environment: import.meta.env.MODE || 'production',
      nodeVersion: process.version || 'Unknown',
      timestamp: new Date().toISOString()
    };

    const infoText = `viRtual POS System Information
===============================

Product: ${systemInfo.productName}
Version: ${systemInfo.version}
Build Type: ${systemInfo.buildType}
License Status: ${systemInfo.licenseStatus}
Licensed to: ${systemInfo.licensee}

Technical Details:
- Framework: ${systemInfo.framework}
- Database: ${systemInfo.database}
- UI Library: ${systemInfo.uiLibrary}
- Build Tool: ${systemInfo.buildTool}
- Environment: ${systemInfo.environment}
- Node Version: ${systemInfo.nodeVersion}

Generated: ${systemInfo.timestamp}`;

    try {
      await navigator.clipboard.writeText(infoText);
      setCopied(true);
      toast.success('System information copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy system info:', error);
      toast.error('Failed to copy system information');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--card)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>About viRtual POS</h1>
          <p className="text-xl mb-6" style={{ color: 'var(--muted)' }}>Product information and licensing details</p>
          
          {/* Copy System Info Button */}
          <button
            onClick={copySystemInfo}
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ 
              backgroundColor: 'var(--primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary)';
            }}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy System Info
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Product Information */}
            <Card 
              className="shadow-sm transition-all duration-200 hover:shadow-lg"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <CardHeader className="pb-6">
                <h3 
                  className="text-2xl font-semibold flex items-center gap-3"
                  style={{ color: 'var(--text)' }}
                >
                  <Info className="h-7 w-7" style={{ color: 'var(--primary)' }} />
                  Product Information
                </h3>
                <p 
                  className="text-base mt-2"
                  style={{ color: 'var(--muted)' }}
                >
                  Details about the viRtual POS system
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 gap-8">
                  <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Product Name:</span>
                    <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                      {licenseInfo?.productName || 'viRtual POS'}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Version:</span>
                    <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>1.0.0</p>
                  </div>
                  
                  <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Build Type:</span>
                    <Badge 
                      variant="secondary" 
                      className="text-sm font-semibold px-3 py-1"
                      style={{ 
                        backgroundColor: 'var(--success)',
                        color: 'var(--success-foreground)'
                      }}
                    >
                      Production
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center py-4">
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>License Status:</span>
                    <Badge 
                      variant={licenseInfo?.locked ? "destructive" : "default"} 
                      className="text-sm font-semibold px-3 py-1"
                      style={{ 
                        backgroundColor: licenseInfo?.locked ? 'var(--destructive)' : 'var(--success)',
                        color: licenseInfo?.locked ? 'var(--destructive-foreground)' : 'var(--success-foreground)'
                      }}
                    >
                      {licenseInfo?.locked ? "Locked" : "Unlocked"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* License Information */}
            <Card 
              className="shadow-sm transition-all duration-200 hover:shadow-lg"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <CardHeader className="pb-6">
                <h3 
                  className="text-2xl font-semibold flex items-center gap-3"
                  style={{ color: 'var(--text)' }}
                >
                  <Shield className="h-7 w-7" style={{ color: 'var(--success)' }} />
                  License Information
                </h3>
                <p 
                  className="text-base mt-2"
                  style={{ color: 'var(--muted)' }}
                >
                  Licensing and legal information
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Licensed to:</span>
                    <p className="text-xl font-bold mt-2" style={{ color: 'var(--text)' }}>
                      {licenseInfo?.licensee || 'Virtual Software Pvt Ltd'}
                    </p>
                  </div>
                  
                  <div>
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Full Company Name:</span>
                    <p className="mt-2 break-words text-lg" style={{ color: 'var(--text)' }}>
                      {licenseInfo?.fullName || 'Visual Interface Resource Technology Unified Analytics Labs'}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>License Issued:</span>
                    <p className="mt-2 text-lg" style={{ color: 'var(--text)' }}>
                      {licenseInfo?.issuedAt ? new Date(licenseInfo.issuedAt).toLocaleDateString() : 'Not available'}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>License Status:</span>
                    <div className="flex items-center gap-3 mt-2">
                      <Lock className="h-5 w-5" style={{ color: 'var(--muted)' }} />
                      <span className="text-lg" style={{ color: 'var(--text)' }}>
                        {licenseInfo?.locked ? 'Settings are locked' : 'Settings are unlocked'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Copyright Notice - Now as a subdued card */}
            <Card 
              className="shadow-sm transition-all duration-200 hover:shadow-lg"
              style={{ 
                backgroundColor: 'var(--muted)',
                borderColor: 'var(--border)'
              }}
            >
              <CardHeader className="pb-6">
                <h3 
                  className="text-2xl font-semibold flex items-center gap-3"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <Calendar className="h-7 w-7" style={{ color: 'var(--muted-foreground)' }} />
                  Copyright Notice
                </h3>
              </CardHeader>
              <CardContent>
                <div 
                  className="p-6 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <h4 
                    className="font-bold text-xl mb-4"
                    style={{ color: 'var(--text)' }}
                  >
                    © 2024 Virtual Software Pvt Ltd
                  </h4>
                  <p 
                    className="mb-4 text-lg"
                    style={{ color: 'var(--text)' }}
                  >
                    All rights reserved.
                  </p>
                  <p 
                    className="text-base"
                    style={{ color: 'var(--muted)' }}
                  >
                    This software is proprietary and confidential. Unauthorized copying, distribution, 
                    or modification is strictly prohibited.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Company Profile */}
            {companyProfile && (
              <Card 
                className="shadow-sm transition-all duration-200 hover:shadow-lg"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
              >
                <CardHeader className="pb-6">
                  <h3 
                    className="text-2xl font-semibold flex items-center gap-3"
                    style={{ color: 'var(--text)' }}
                  >
                    <Building2 className="h-7 w-7" style={{ color: 'var(--primary)' }} />
                    Company Profile
                  </h3>
                  <p 
                    className="text-base mt-2"
                    style={{ color: 'var(--muted)' }}
                  >
                    Your company information as configured in the system
                  </p>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-6">
                    <div className="flex justify-between items-start py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Company Name:</span>
                      <p className="text-right max-w-xs text-lg" style={{ color: 'var(--text)' }}>{companyProfile.name}</p>
                    </div>
                    
                    <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Tax ID:</span>
                      <p className="text-lg" style={{ color: 'var(--text)' }}>{companyProfile.taxId || 'Not set'}</p>
                    </div>
                    
                    <div className="py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Address:</span>
                      <p className="mt-2 whitespace-pre-line text-lg" style={{ color: 'var(--text)' }}>{companyProfile.address}</p>
                    </div>
                    
                    <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Contact Email:</span>
                      <p className="text-lg" style={{ color: 'var(--text)' }}>{companyProfile.contactEmail || 'Not set'}</p>
                    </div>
                    
                    <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Contact Phone:</span>
                      <p className="text-lg" style={{ color: 'var(--text)' }}>{companyProfile.contactPhone || 'Not set'}</p>
                    </div>
                    
                    <div className="flex justify-between items-center py-4">
                      <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Last Updated:</span>
                      <p className="text-lg" style={{ color: 'var(--text)' }}>{new Date(companyProfile.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Technical Information */}
            <Card 
              className="shadow-sm transition-all duration-200 hover:shadow-lg"
              style={{ 
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
            >
              <CardHeader className="pb-6">
                <h3 
                  className="text-2xl font-semibold flex items-center gap-3"
                  style={{ color: 'var(--text)' }}
                >
                  <Key className="h-7 w-7" style={{ color: 'var(--warning)' }} />
                  Technical Information
                </h3>
                <p 
                  className="text-base mt-2"
                  style={{ color: 'var(--muted)' }}
                >
                  System and technical details
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Framework:</span>
                    <p className="text-lg" style={{ color: 'var(--text)' }}>React + TypeScript + Vite</p>
                  </div>
                  
                  <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Database:</span>
                    <p className="text-lg" style={{ color: 'var(--text)' }}>SQLite + better-sqlite3</p>
                  </div>
                  
                  <div className="flex justify-between items-center py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>UI Library:</span>
                    <p className="text-lg" style={{ color: 'var(--text)' }}>Tailwind CSS + Lucide Icons</p>
                  </div>
                  
                  <div className="flex justify-between items-center py-4">
                    <span className="font-semibold text-lg" style={{ color: 'var(--muted)' }}>Build Tool:</span>
                    <p className="text-lg" style={{ color: 'var(--text)' }}>Vite 4.5.0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="mt-16 pt-8"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="text-center">
            <p 
              className="text-base"
              style={{ color: 'var(--muted)' }}
            >
              viRtual POS © 2024 Virtual Software Pvt Ltd
            </p>
            <p 
              className="text-sm mt-2"
              style={{ color: 'var(--muted)' }}
            >
              Visual Interface Resource Technology Unified Analytics Labs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
