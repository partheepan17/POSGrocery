export interface PricingComputeInput {
  product_id: number;
  qty: number;
  base_price: number;
  customer_type?: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
}

export interface PricingComputeResult {
  unit_price: number;
  reason: string; // e.g., 'tier:10+' or 'customer-type:wholesale' or 'base'
}

export const pricingService = {
  async compute(input: PricingComputeInput): Promise<PricingComputeResult> {
    const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8100';
    const res = await fetch(`${apiBaseUrl}/api/pricing/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    if (!res.ok) {
      throw new Error('Failed to compute price');
    }
    return res.json();
  }
};





