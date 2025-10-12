import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FormLabel, Textarea } from '../components/ui/Form';
import { Select, SelectOption } from '../components/ui/Dropdown';
import { Badge } from '../components/ui/Badge';
// import { Alert, AlertDescription } from '../components/ui/alert'; // Component doesn't exist yet
import { 
  PackagePlus, 
  Search, 
  Save, 
  CheckCircle, 
  XCircle,
  Trash2,
  Plus,
  Minus,
  Printer,
  Tag,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { grnService } from '../services/grnService';
import { dataService } from '../services/dataService';
import { GRN, GRNLine, GRNStatus, Product, Supplier } from '../types';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';

interface GRNLineWithProduct extends GRNLine {
  product?: Product;
}

export default function GRNReceive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslation();
  const { settings } = useSettingsStore();
  
  const [grn, setGrn] = useState<GRN | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [lines, setLines] = useState<GRNLineWithProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Totals
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [other, setOther] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Settings
  const [costUpdatePolicy, setCostUpdatePolicy] = useState<'none' | 'average' | 'latest'>('latest');
  const [labelLanguage, setLabelLanguage] = useState<'EN' | 'SI' | 'TA'>('EN');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isNewGRN = id === 'new';

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, [id]);

  // Recalculate totals when lines change
  useEffect(() => {
    const newSubtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
    const newTotal = newSubtotal + tax + other;
    setSubtotal(newSubtotal);
    setTotal(newTotal);
  }, [lines, tax, other]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load suppliers
      const suppliersData = await dataService.getSuppliers();
      setSuppliers(suppliersData as any);
      
      // Load products
      const productsData = await dataService.getProducts();
      setProducts(productsData as any);
      
      if (isNewGRN) {
        // Create new GRN
        const newGRN: GRN = {
          supplier_id: 0,
          grn_no: '',
          datetime: new Date().toISOString(),
          received_by: null,
          note: '',
          status: 'OPEN',
          subtotal: 0,
          tax: 0,
          other: 0,
          total: 0
        };
        setGrn(newGRN);
        setLines([]);
      } else {
        // Load existing GRN
        const grnData = await grnService.getGRN(parseInt(id!));
        setGrn(grnData.header);
        setSupplier(grnData.supplier);
        setSelectedSupplier(grnData.header.supplier_id);
        setNote(grnData.header.note || '');
        setLines(grnData.lines);
      }
    } catch (err) {
      setError('Failed to load GRN data');
      console.error('Error loading GRN data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (isNewGRN) {
        // Create new GRN
        const grnId = await grnService.createGRN({
          supplier_id: selectedSupplier!,
          received_by: null,
          note: note
        });
        
        // Save lines
        for (const line of lines) {
          await grnService.upsertGRNLine({
            ...line,
            grn_id: grnId
          });
        }
        
        navigate(`/grn/${grnId}`);
      } else {
        // Update existing GRN
        await grnService.updateGRNHeader({
          id: grn!.id!,
          supplier_id: selectedSupplier!,
          note: note,
          subtotal,
          tax,
          other,
          total
        });
        
        // Update lines
        for (const line of lines) {
          await grnService.upsertGRNLine(line);
        }
      }
      
      setSuccess('GRN saved successfully');
    } catch (err) {
      setError('Failed to save GRN');
      console.error('Error saving GRN:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePostGRN = async () => {
    if (!grn || grn.status !== 'OPEN') {
      setError('Only OPEN GRNs can be posted');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Save first
      await handleSaveDraft();
      
      // Then post
      await grnService.postGRN(grn.id!, { updateCostPolicy: costUpdatePolicy });
      
      setSuccess('GRN posted successfully');
      await loadInitialData(); // Reload to get updated status
    } catch (err) {
      setError('Failed to post GRN');
      console.error('Error posting GRN:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    const existingLine = lines.find(line => line.product_id === parseInt(selectedProduct.id));
    
    if (existingLine) {
      // Update existing line
      const updatedLines = lines.map(line =>
        line.id === existingLine.id
          ? { ...line, qty: line.qty + 1, line_total: (line.qty + 1) * line.unit_cost }
          : line
      );
      setLines(updatedLines);
    } else {
      // Add new line
      const newLine: GRNLineWithProduct = {
        grn_id: grn?.id,
        product_id: parseInt(selectedProduct.id),
        qty: 1,
        unit_cost: selectedProduct.cost || 0,
        mrp: null,
        batch_no: null,
        expiry_date: null,
        line_total: selectedProduct.cost || 0,
        product: selectedProduct
      };
      setLines([...lines, newLine]);
    }
    
    setSelectedProduct(null);
    setSearchTerm('');
  };

  const handleUpdateLine = (lineId: number, field: keyof GRNLine, value: any) => {
    const updatedLines = lines.map(line => {
      if (line.id === lineId) {
        const updatedLine = { ...line, [field]: value };
        if (field === 'qty' || field === 'unit_cost') {
          updatedLine.line_total = updatedLine.qty * updatedLine.unit_cost;
        }
        return updatedLine;
      }
      return line;
    });
    setLines(updatedLines);
  };

  const handleDeleteLine = async (lineId: number) => {
    if (lineId) {
      await grnService.deleteGRNLine(lineId);
    }
    
    const updatedLines = lines.filter(line => line.id !== lineId);
    setLines(updatedLines);
  };

  const handlePrintLabels = async () => {
    if (!grn) return;
    
    try {
      const labelItems = await grnService.buildLabelItemsFromGRN(grn.id!, labelLanguage);
      // TODO: Open label preview modal with labelItems
      console.log('Label items:', labelItems);
    } catch (err) {
      setError('Failed to generate labels');
      console.error('Error generating labels:', err);
    }
  };

  const filteredProducts = products.filter(product =>
    (product.name || product.name_en || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm))
  );

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-LK');
  };

  const isExpired = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading GRN...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <PackagePlus className="h-8 w-8" />
          {isNewGRN ? 'New GRN' : `GRN ${grn?.grn_no}`}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/grn')}>
            Back to List
          </Button>
          {grn?.status === 'POSTED' && (
            <Badge variant="default" className="bg-green-600">Posted</Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - GRN Details */}
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <h3 >GRN Details</h3 >
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel htmlFor="supplier">Supplier</FormLabel>
                  <Select 
                    value={selectedSupplier?.toString() || ''} 
                    onChange={(value) => setSelectedSupplier(parseInt(value))}
                    disabled={grn?.status === 'POSTED'}
                    placeholder="Select supplier"
                    options={suppliers.map(supplier => ({
                      value: supplier.id.toString(),
                      label: supplier.name || supplier.supplier_name || 'Unknown'
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <FormLabel htmlFor="grnNo">GRN No</FormLabel>
                  <Input
                    id="grnNo"
                    value={grn?.grn_no || ''}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel htmlFor="date">Date</FormLabel>
                  <Input
                    id="date"
                    value={grn?.datetime ? formatDate(grn.datetime) : ''}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                
                <div className="space-y-2">
                  <FormLabel htmlFor="status">Status</FormLabel>
                  <Input
                    id="status"
                    value={grn?.status || 'OPEN'}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <FormLabel htmlFor="note">Note</FormLabel>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional notes..."
                  disabled={grn?.status === 'POSTED'}
                  textareaSize="md"
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Item */}
          <Card>
            <CardHeader>
              <h3 >Add Item</h3 >
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormLabel htmlFor="search">Search Product</FormLabel>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      id="search"
                      placeholder="Search by SKU, barcode, or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      disabled={grn?.status === 'POSTED'}
                    />
                  </div>
                  <Button 
                    onClick={handleAddProduct}
                    disabled={!selectedProduct || grn?.status === 'POSTED'}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {searchTerm && (
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {filteredProducts.slice(0, 10).map(product => (
                    <div
                      key={product.id}
                      className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        setSelectedProduct(product);
                        setSearchTerm(product.name || product.name_en || '');
                      }}
                    >
                      <div className="font-medium">{product.name || product.name_en || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">
                        SKU: {product.sku} | Cost: {formatCurrency(product.cost || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lines Table */}
          <Card>
            <CardHeader>
              <h3 >GRN Lines</h3 >
            </CardHeader>
            <CardContent>
              {lines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items added yet
                </div>
              ) : (
                <div className="space-y-2">
                  {lines.map((line, index) => (
                    <div key={line.id || index} className="p-3 border rounded-lg">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <div className="font-medium">{line.product?.name}</div>
                          <div className="text-sm text-muted-foreground">{line.product?.sku}</div>
                        </div>
                        
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={line.qty}
                            onChange={(e) => handleUpdateLine(line.id!, 'qty', parseFloat(e.target.value) || 0)}
                            disabled={grn?.status === 'POSTED'}
                            min="0"
                            step="0.001"
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={line.unit_cost}
                            onChange={(e) => handleUpdateLine(line.id!, 'unit_cost', parseFloat(e.target.value) || 0)}
                            disabled={grn?.status === 'POSTED'}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={line.mrp || ''}
                            onChange={(e) => handleUpdateLine(line.id!, 'mrp', parseFloat(e.target.value) || null)}
                            disabled={grn?.status === 'POSTED'}
                            min="0"
                            step="0.01"
                            placeholder="MRP"
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <Input
                            value={line.batch_no || ''}
                            onChange={(e) => handleUpdateLine(line.id!, 'batch_no', e.target.value || null)}
                            disabled={grn?.status === 'POSTED'}
                            placeholder="Batch"
                          />
                        </div>
                        
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLine(line.id!)}
                            disabled={grn?.status === 'POSTED'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-2 items-center mt-2">
                        <div className="col-span-3">
                          <Input
                            type="date"
                            value={line.expiry_date || ''}
                            onChange={(e) => handleUpdateLine(line.id!, 'expiry_date', e.target.value || null)}
                            disabled={grn?.status === 'POSTED'}
                            className={isExpired(line.expiry_date) ? 'border-red-500' : ''}
                          />
                          {isExpired(line.expiry_date) && (
                            <div className="text-xs text-red-500 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Expired
                            </div>
                          )}
                        </div>
                        
                        <div className="col-span-9 text-right">
                          <div className="font-medium">{formatCurrency(line.line_total)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <h3 >Totals</h3 >
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Tax:</span>
                <Input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                  disabled={grn?.status === 'POSTED'}
                  className="w-24 text-right"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="flex justify-between">
                <span>Other:</span>
                <Input
                  type="number"
                  value={other}
                  onChange={(e) => setOther(parseFloat(e.target.value) || 0)}
                  disabled={grn?.status === 'POSTED'}
                  className="w-24 text-right"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSaveDraft}
              disabled={saving || grn?.status === 'POSTED'}
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            
            <Button
              onClick={handlePostGRN}
              disabled={saving || grn?.status === 'POSTED' || lines.length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Post GRN
            </Button>
          </div>
        </div>

        {/* Right Column - Tools & Preview */}
        <div className="space-y-6">
          {/* Tools */}
          <Card>
            <CardHeader>
              <h3 >Tools</h3 >
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormLabel>Cost Update Policy</FormLabel>
                <Select 
                  value={costUpdatePolicy} 
                  onChange={(value: string) => setCostUpdatePolicy(value as 'none' | 'average' | 'latest')}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'average', label: 'Average' },
                    { value: 'latest', label: 'Latest' }
                  ]}
                />
              </div>
              
              <div className="space-y-2">
                <FormLabel>Label Language</FormLabel>
                <Select 
                  value={labelLanguage} 
                  onChange={(value: string) => setLabelLanguage(value as 'EN' | 'SI' | 'TA')}
                  options={[
                    { value: 'EN', label: 'English' },
                    { value: 'SI', label: 'Sinhala' },
                    { value: 'TA', label: 'Tamil' }
                  ]}
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print GRN
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handlePrintLabels}
                  disabled={lines.length === 0}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Print Labels
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <h3 >GRN Preview</h3 >
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg min-h-[400px]">
                <div className="text-center text-muted-foreground">
                  <Printer className="h-12 w-12 mx-auto mb-2" />
                  <p>GRN preview will appear here</p>
                  <p className="text-sm">After adding items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
