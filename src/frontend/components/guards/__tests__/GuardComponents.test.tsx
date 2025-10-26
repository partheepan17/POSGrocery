/**
 * Guard Components Tests
 * Basic tests for guard component rendering behavior
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, test } from 'vitest';
import { IfFeature, IfManager, IfCashier } from '../index';

// Mock the useFeatures hook
vi.mock('@/frontend/state/features/useFeatures', () => ({
  useFeatures: vi.fn()
}));

// Import the mocked hook after declaring the mock
import { useFeatures } from '@/frontend/state/features/useFeatures';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn()
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; userRole?: string }> = ({ 
  children, 
  userRole = 'cashier'
}) => {
  // Mock the useFeatures hook
  vi.mocked(useFeatures).mockReturnValue({
    features: {
      enabled: { 'sales.view': true, 'inventory.view': false },
      permissions: { 'sales.create': true, 'admin.all': false },
      dependencies: { 'inventory.view': [], 'sales.view': [] },
      user: { id: 1, username: 'test', role: userRole, isActive: true },
      tenant: 'test-tenant',
      summary: { totalFeatures: 2, enabledFeatures: 1, totalPermissions: 2, enabledPermissions: 1, featureCategories: [] },
      timestamp: new Date().toISOString()
    },
    loading: false,
    error: null,
    connected: true,
    refresh: vi.fn(),
    hasFeature: (code: string) => code === 'sales.view',
    can: (code: string) => code === 'sales.create',
    listEnabled: () => ['sales.view'],
    listEnabledPermissions: () => ['sales.create'],
    connect: vi.fn(),
    disconnect: vi.fn(),
    hasAllFeatures: (codes: string[]) => codes.every(code => code === 'sales.view'),
    hasAnyFeature: (codes: string[]) => codes.some(code => code === 'sales.view'),
    canAll: (codes: string[]) => Object.fromEntries(codes.map(code => [code, code === 'sales.create'])),
    canAnyPermission: (codes: string[]) => codes.some(code => code === 'sales.create'),
    isAdmin: () => userRole === 'admin',
    isManager: () => ['admin', 'manager', 'supervisor'].includes(userRole),
    isCashier: () => userRole === 'cashier',
    getUserRole: () => userRole,
    isLoaded: () => true,
    // Provide no-op implementations for any additional methods expected by the hook type
    hasFeatures: (codes: string[]) => Object.fromEntries(codes.map(code => [code, code === 'sales.view'])),
    canAllPermissions: (codes: string[]) => Object.fromEntries(codes.map(code => [code, code === 'sales.create'])),
    checkFeature: () => ({ allowed: true, reasons: [] }),
    checkPermission: () => ({ allowed: true, reasons: [] })
  } as unknown as ReturnType<typeof useFeatures>);

  return <>{children}</>;
};

describe('IfFeature Component', () => {
  test('renders children when feature is enabled', () => {
    render(
      <TestWrapper>
        <IfFeature code="sales.view">
          <div data-testid="feature-content">Sales View</div>
        </IfFeature>
      </TestWrapper>
    );

    expect(screen.getByTestId('feature-content')).toBeInTheDocument();
    expect(screen.getByText('Sales View')).toBeInTheDocument();
  });

  test('renders fallback when feature is disabled', () => {
    render(
      <TestWrapper>
        <IfFeature code="inventory.view" fallback={<div data-testid="fallback">Feature Disabled</div>}>
          <div data-testid="feature-content">Inventory View</div>
        </IfFeature>
      </TestWrapper>
    );

    expect(screen.queryByTestId('feature-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.getByText('Feature Disabled')).toBeInTheDocument();
  });
});

describe('IfManager Component', () => {
  test('renders children when user is manager', () => {
    render(
      <TestWrapper userRole="manager">
        <IfManager>
          <div data-testid="manager-content">Manager Content</div>
        </IfManager>
      </TestWrapper>
    );

    expect(screen.getByTestId('manager-content')).toBeInTheDocument();
    expect(screen.getByText('Manager Content')).toBeInTheDocument();
  });

  test('renders fallback when user is not manager', () => {
    render(
      <TestWrapper>
        <IfManager fallback={<div data-testid="fallback">Manager Required</div>}>
          <div data-testid="manager-content">Manager Content</div>
        </IfManager>
      </TestWrapper>
    );

    expect(screen.queryByTestId('manager-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.getByText('Manager Required')).toBeInTheDocument();
  });
});

describe('IfCashier Component', () => {
  test('renders children when user is cashier', () => {
    render(
      <TestWrapper>
        <IfCashier>
          <div data-testid="cashier-content">Cashier Content</div>
        </IfCashier>
      </TestWrapper>
    );

    expect(screen.getByTestId('cashier-content')).toBeInTheDocument();
    expect(screen.getByText('Cashier Content')).toBeInTheDocument();
  });

  test('renders fallback when user is not cashier', () => {
    render(
      <TestWrapper userRole="admin">
        <IfCashier fallback={<div data-testid="fallback">Cashier Required</div>}>
          <div data-testid="cashier-content">Cashier Content</div>
        </IfCashier>
      </TestWrapper>
    );

    expect(screen.queryByTestId('cashier-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.getByText('Cashier Required')).toBeInTheDocument();
  });
});

