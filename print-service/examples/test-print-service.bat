@echo off
REM POS Print Service - Windows Test Script
REM Make sure the print service is running on localhost:8251

set BASE_URL=http://localhost:8251

echo 🧪 Testing POS Print Service with PowerShell...
echo ==========================================

REM Test 1: Health Check
echo.
echo 1️⃣ Health Check
echo GET %BASE_URL%/health
powershell -Command "Invoke-RestMethod -Uri '%BASE_URL%/health' -Method GET | ConvertTo-Json"

REM Test 2: List Printers
echo.
echo 2️⃣ List Printers
echo GET %BASE_URL%/print/printers
powershell -Command "Invoke-RestMethod -Uri '%BASE_URL%/print/printers' -Method GET | ConvertTo-Json"

REM Test 3: Print Simple Receipt
echo.
echo 3️⃣ Print Simple Receipt
echo POST %BASE_URL%/print/receipt
powershell -Command "$body = @{
    printerId = 'usb_1234_5678'
    lines = @(
        @{text='SALE RECEIPT'; align='center'; bold=$true},
        @{text='================'; align='center'},
        @{text='Item: Apple'; align='left'},
        @{text='Qty: 2'; align='left'},
        @{text='Price: $5.00'; align='right'},
        @{text='================'; align='center'},
        @{text='TOTAL: $10.00'; align='center'; bold=$true},
        @{text='================'; align='center'},
        @{text='Thank you!'; align='center'}
    )
    options = @{
        width = 32
        showTimestamp = $true
        showBorder = $true
    }
} | ConvertTo-Json -Depth 3; Invoke-RestMethod -Uri '%BASE_URL%/print/receipt' -Method POST -Body $body -ContentType 'application/json' | ConvertTo-Json"

REM Test 4: Test Printer
echo.
echo 4️⃣ Test Printer
echo POST %BASE_URL%/print/test/usb_1234_5678
powershell -Command "Invoke-RestMethod -Uri '%BASE_URL%/print/test/usb_1234_5678' -Method POST | ConvertTo-Json"

REM Test 5: Service Status
echo.
echo 5️⃣ Service Status
echo GET %BASE_URL%/print/status
powershell -Command "Invoke-RestMethod -Uri '%BASE_URL%/print/status' -Method GET | ConvertTo-Json"

echo.
echo ✅ All tests completed!
echo Check your thermal printer for printed receipts.
pause











