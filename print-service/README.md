# POS Print Service

A lightweight Node.js print server for thermal receipt printing in POS systems.

## Features

- 🖨️ **Multi-Protocol Support**: USB, Serial, and Network thermal printers
- 🔌 **WebSocket Integration**: Real-time printing communication
- 📄 **Template Engine**: Handlebars-based receipt templates
- 🚀 **Lightweight**: Minimal dependencies and fast startup
- 🔧 **Easy Integration**: Simple HTTP API and WebSocket interface
- 📱 **POS Ready**: Designed for POS system integration

## Quick Start

### Installation

```bash
cd print-service
npm install
```

### Start the Service

```bash
npm start
```

The service will start on `http://localhost:8251` by default.

### Test the Service

```bash
npm test
```

## API Endpoints

### Health Check
```bash
GET /health
```

### List Printers
```bash
GET /print/printers
```

### Print Receipt
```bash
POST /print/receipt
Content-Type: application/json

{
  "printerId": "usb_1234_5678",
  "lines": [
    { "text": "RECEIPT", "align": "center", "bold": true },
    { "text": "Item 1 x2", "align": "left" },
    { "text": "Total: $10.00", "align": "right" }
  ],
  "options": {
    "width": 32,
    "showTimestamp": true
  }
}
```

### Test Printer
```bash
POST /print/test/{printerId}
```

### Service Status
```bash
GET /print/status
```

## WebSocket API

Connect to `ws://localhost:8251/ws/print` for real-time printing.

### Messages

#### Print Receipt
```json
{
  "type": "print_receipt",
  "data": {
    "printerId": "usb_1234_5678",
    "lines": [...],
    "options": {...}
  }
}
```

#### List Printers
```json
{
  "type": "list_printers"
}
```

#### Ping
```json
{
  "type": "ping"
}
```

### Responses

#### Print Success
```json
{
  "type": "print_success",
  "result": {
    "success": true,
    "printerId": "usb_1234_5678",
    "jobId": "uuid-here",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Print Error
```json
{
  "type": "print_error",
  "error": "Error message"
}
```

## Printer Types

### USB Printers
- Automatically detected via USB vendor IDs
- Common brands: Epson, Brother, HP, Star Micronics
- Vendor IDs: 0x04b8, 0x04f9, 0x03f0, 0x0fe6, 0x0519, 0x04e8

### Serial Printers
- Detected via serial port enumeration
- Common baud rates: 9600, 19200, 38400
- Auto-detection of thermal printer ports

### Network Printers
- Pre-configured IP addresses
- Common ports: 9100
- IP ranges: 192.168.x.x, 10.0.x.x

## Receipt Templates

### Line-based Format
```json
{
  "lines": [
    { "text": "STORE NAME", "align": "center", "bold": true },
    { "text": "==================", "align": "center" },
    { "text": "Item 1", "align": "left" },
    { "text": "$10.00", "align": "right" },
    { "text": "==================", "align": "center" },
    { "text": "TOTAL: $10.00", "align": "center", "bold": true }
  ]
}
```

### HTML Template
```html
<div style="text-align: center;">
  <strong>{{storeName}}</strong><br>
  {{storeAddress}}<br>
  Tel: {{storePhone}}
</div>
<hr>
{{#each items}}
  {{this.name}} x{{this.quantity}} - {{currency this.total}}<br>
{{/each}}
<hr>
<strong>Total: {{currency total}}</strong>
```

## Configuration

### Environment Variables

```bash
PRINT_PORT=8251          # Print service port
NODE_ENV=development     # Environment mode
```

### Printer Options

```json
{
  "width": 32,           // Receipt width in characters
  "showTimestamp": true, // Show print timestamp
  "showBorder": true,    // Show decorative borders
  "centerText": true     // Center-align text by default
}
```

## Integration Examples

### cURL Examples

#### List Printers
```bash
curl http://localhost:8251/print/printers
```

#### Print Simple Receipt
```bash
curl -X POST http://localhost:8251/print/receipt \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "usb_1234_5678",
    "lines": [
      {"text": "SALE RECEIPT", "align": "center", "bold": true},
      {"text": "Item: Apple", "align": "left"},
      {"text": "Qty: 2", "align": "left"},
      {"text": "Price: $5.00", "align": "right"},
      {"text": "Total: $10.00", "align": "center", "bold": true}
    ]
  }'
```

#### Test Printer
```bash
curl -X POST http://localhost:8251/print/test/usb_1234_5678
```

### JavaScript Integration

```javascript
// WebSocket connection
const ws = new WebSocket('ws://localhost:8251/ws/print');

ws.onopen = () => {
  console.log('Connected to print service');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Print service message:', message);
};

// Print receipt
function printReceipt(printerId, receiptData) {
  ws.send(JSON.stringify({
    type: 'print_receipt',
    data: {
      printerId,
      lines: receiptData.lines,
      options: receiptData.options
    }
  }));
}

// List printers
function listPrinters() {
  ws.send(JSON.stringify({
    type: 'list_printers'
  }));
}
```

### POS System Integration

```javascript
// In your POS system
class PrintService {
  constructor() {
    this.ws = new WebSocket('ws://localhost:8251/ws/print');
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handlePrintResponse(message);
    };
  }

  printSaleReceipt(saleData) {
    const receiptLines = [
      { text: 'SALE RECEIPT', align: 'center', bold: true },
      { text: '================', align: 'center' },
      { text: `Date: ${new Date().toLocaleDateString()}`, align: 'left' },
      { text: `Time: ${new Date().toLocaleTimeString()}`, align: 'left' },
      { text: '================', align: 'center' }
    ];

    // Add items
    saleData.items.forEach(item => {
      receiptLines.push({ text: `${item.name} x${item.quantity}`, align: 'left' });
      receiptLines.push({ text: `$${item.total.toFixed(2)}`, align: 'right' });
    });

    receiptLines.push(
      { text: '================', align: 'center' },
      { text: `TOTAL: $${saleData.total.toFixed(2)}`, align: 'center', bold: true },
      { text: '================', align: 'center' },
      { text: 'Thank you!', align: 'center' }
    );

    this.ws.send(JSON.stringify({
      type: 'print_receipt',
      data: {
        printerId: 'default_printer',
        lines: receiptLines,
        options: {
          width: 32,
          showTimestamp: true,
          showBorder: true
        }
      }
    }));
  }

  handlePrintResponse(message) {
    switch (message.type) {
      case 'print_success':
        console.log('Receipt printed successfully:', message.result);
        break;
      case 'print_error':
        console.error('Print failed:', message.error);
        break;
      case 'printers_list':
        console.log('Available printers:', message.printers);
        break;
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **No printers detected**
   - Check USB connections
   - Verify printer drivers are installed
   - Try refreshing: `POST /print/refresh`

2. **Print fails**
   - Check printer is powered on
   - Verify paper is loaded
   - Check printer status in printer list

3. **WebSocket connection fails**
   - Verify print service is running
   - Check firewall settings
   - Ensure correct WebSocket URL

### Debug Mode

Set `NODE_ENV=development` for detailed logging.

### Logs

The service logs all operations to console. Check the terminal output for detailed information.

## Development

### Project Structure

```
print-service/
├── src/
│   ├── index.js              # Main server file
│   ├── routes/
│   │   └── print.js          # HTTP API routes
│   ├── services/
│   │   ├── printerService.js # Printer management
│   │   ├── websocketService.js # WebSocket handling
│   │   └── templateService.js # Template rendering
│   └── test.js               # Test script
├── package.json
└── README.md
```

### Adding New Printer Types

1. Extend `PrinterService` class
2. Add detection logic in `scan*Printers()` methods
3. Implement printing logic in `print*Receipt()` methods
4. Update printer type handling

### Custom Templates

1. Add template to `TemplateService`
2. Register Handlebars helpers as needed
3. Use in receipt rendering

## License

MIT License - see LICENSE file for details.











