#!/bin/bash

# POS Print Service - cURL Examples
# Make sure the print service is running on localhost:8251

BASE_URL="http://localhost:8251"

echo "🧪 Testing POS Print Service with cURL..."
echo "=========================================="

# Test 1: Health Check
echo -e "\n1️⃣ Health Check"
echo "GET $BASE_URL/health"
curl -s "$BASE_URL/health" | jq '.' || echo "Response received"

# Test 2: List Printers
echo -e "\n2️⃣ List Printers"
echo "GET $BASE_URL/print/printers"
curl -s "$BASE_URL/print/printers" | jq '.' || echo "Response received"

# Test 3: Print Simple Receipt
echo -e "\n3️⃣ Print Simple Receipt"
echo "POST $BASE_URL/print/receipt"
curl -s -X POST "$BASE_URL/print/receipt" \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "usb_1234_5678",
    "lines": [
      {"text": "SALE RECEIPT", "align": "center", "bold": true},
      {"text": "================", "align": "center"},
      {"text": "Item: Apple", "align": "left"},
      {"text": "Qty: 2", "align": "left"},
      {"text": "Price: $5.00", "align": "right"},
      {"text": "================", "align": "center"},
      {"text": "TOTAL: $10.00", "align": "center", "bold": true},
      {"text": "================", "align": "center"},
      {"text": "Thank you!", "align": "center"}
    ],
    "options": {
      "width": 32,
      "showTimestamp": true,
      "showBorder": true
    }
  }' | jq '.' || echo "Response received"

# Test 4: Print Detailed Receipt
echo -e "\n4️⃣ Print Detailed Receipt"
echo "POST $BASE_URL/print/receipt"
curl -s -X POST "$BASE_URL/print/receipt" \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "usb_1234_5678",
    "lines": [
      {"text": "GROCERY STORE", "align": "center", "bold": true},
      {"text": "123 Main Street", "align": "center"},
      {"text": "City, State 12345", "align": "center"},
      {"text": "Tel: (555) 123-4567", "align": "center"},
      {"text": "========================", "align": "center"},
      {"text": "Receipt #: 000001", "align": "left"},
      {"text": "Date: 2025-01-01", "align": "left"},
      {"text": "Time: 12:00:00", "align": "left"},
      {"text": "Cashier: John Doe", "align": "left"},
      {"text": "========================", "align": "center"},
      {"text": "Items:", "align": "left", "bold": true},
      {"text": "Apple (Red) x2", "align": "left"},
      {"text": "    $2.50 each = $5.00", "align": "right"},
      {"text": "Banana (Yellow) x3", "align": "left"},
      {"text": "    $1.00 each = $3.00", "align": "right"},
      {"text": "Milk (Whole) x1", "align": "left"},
      {"text": "    $3.50 each = $3.50", "align": "right"},
      {"text": "========================", "align": "center"},
      {"text": "Subtotal: $11.50", "align": "right"},
      {"text": "Tax (8.25%): $0.95", "align": "right"},
      {"text": "========================", "align": "center"},
      {"text": "TOTAL: $12.45", "align": "center", "bold": true},
      {"text": "========================", "align": "center"},
      {"text": "Payment: Cash", "align": "center"},
      {"text": "Change: $7.55", "align": "center"},
      {"text": "========================", "align": "center"},
      {"text": "Thank you for shopping!", "align": "center"},
      {"text": "Visit us again soon!", "align": "center"}
    ],
    "options": {
      "width": 32,
      "showTimestamp": true,
      "showBorder": true
    }
  }' | jq '.' || echo "Response received"

# Test 5: Test Printer
echo -e "\n5️⃣ Test Printer"
echo "POST $BASE_URL/print/test/usb_1234_5678"
curl -s -X POST "$BASE_URL/print/test/usb_1234_5678" | jq '.' || echo "Response received"

# Test 6: Service Status
echo -e "\n6️⃣ Service Status"
echo "GET $BASE_URL/print/status"
curl -s "$BASE_URL/print/status" | jq '.' || echo "Response received"

echo -e "\n✅ All tests completed!"
echo "Check your thermal printer for printed receipts."











