import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FormLabel, Textarea } from '../components/ui/Form';
import { ArrowLeft, Save } from 'lucide-react';
import { shiftService } from '../services/shiftService';
import { useSettingsStore } from '../store/settingsStore';

export default function NewShift() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  
  const [terminalName, setTerminalName] = useState('Terminal 1');
  const [cashierId, setCashierId] = useState(1);
  const [openingCash, setOpeningCash] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreateShift = async () => {
    if (!openingCash || parseFloat(openingCash) < 0) {
      return;
    }

    try {
      setSaving(true);
      const shiftId = await shiftService.openShift({
        terminal_name: terminalName,
        cashier_id: cashierId,
        opening_cash: parseFloat(openingCash),
        note: note || undefined
      });
      
      navigate(`/shifts/${shiftId}`);
    } catch (error) {
      console.error('Error creating shift:', error);
      alert('Failed to create shift. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/shifts')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Open New Shift</h1>
          <p className="text-gray-600">Start a new cashier shift</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <h3 >Shift Details</h3 >
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <FormLabel htmlFor="terminal-name">Terminal Name</FormLabel>
            <Input
              id="terminal-name"
              name="terminal-name"
              value={terminalName}
              onChange={(e) => setTerminalName(e.target.value)}
              placeholder="Enter terminal name"
            />
          </div>
          
          <div>
            <FormLabel htmlFor="cashier-id">Cashier ID</FormLabel>
            <Input
              id="cashier-id"
              name="cashier-id"
              type="number"
              value={cashierId}
              onChange={(e) => setCashierId(parseInt(e.target.value) || 1)}
              placeholder="Enter cashier ID"
            />
          </div>
          
          <div>
            <FormLabel htmlFor="opening-cash">Opening Cash Amount *</FormLabel>
            <Input
              id="opening-cash"
              name="opening-cash"
              type="number"
              step="0.01"
              min="0"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0.00"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the amount of cash in the drawer at the start of the shift
            </p>
          </div>
          
          <div>
            <FormLabel htmlFor="shift-note">Note (Optional)</FormLabel>
            <Textarea
              id="shift-note"
              name="shift-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter any notes about this shift..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleCreateShift}
              disabled={saving || !openingCash || parseFloat(openingCash) < 0}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Opening...' : 'Open Shift'}
            </Button>
            <Button
              onClick={() => navigate('/shifts')}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
