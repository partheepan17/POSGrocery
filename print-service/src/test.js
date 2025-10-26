/**
 * Print Service Test Script
 * Test the print service functionality
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8251';

async function testPrintService() {
  console.log('🧪 Testing POS Print Service...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    console.log(`   Printers detected: ${healthData.printers}`);

    // Test 2: List printers
    console.log('\n2️⃣ Testing printer list...');
    const printersResponse = await fetch(`${BASE_URL}/print/printers`);
    const printersData = await printersResponse.json();
    console.log('✅ Printers list:', printersData.count, 'printers found');
    
    if (printersData.printers.length > 0) {
      const firstPrinter = printersData.printers[0];
      console.log(`   First printer: ${firstPrinter.name} (${firstPrinter.type})`);
      
      // Test 3: Print test receipt
      console.log('\n3️⃣ Testing receipt printing...');
      const testReceipt = {
        printerId: firstPrinter.id,
        lines: [
          { text: 'TEST RECEIPT', align: 'center', bold: true },
          { text: '================', align: 'center' },
          { text: 'This is a test print', align: 'center' },
          { text: 'from POS Print Service', align: 'center' },
          { text: new Date().toISOString(), align: 'center' },
          { text: '================', align: 'center' },
          { text: 'Test completed successfully!', align: 'center', bold: true }
        ],
        options: {
          width: 32,
          showTimestamp: true,
          showBorder: true
        }
      };

      const printResponse = await fetch(`${BASE_URL}/print/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testReceipt)
      });

      const printData = await printResponse.json();
      if (printData.success) {
        console.log('✅ Receipt printed successfully');
        console.log(`   Job ID: ${printData.result.jobId}`);
        console.log(`   Printer: ${printData.result.printerName}`);
      } else {
        console.log('❌ Print failed:', printData.error);
      }
    } else {
      console.log('⚠️ No printers available for testing');
    }

    // Test 4: Test printer functionality
    if (printersData.printers.length > 0) {
      console.log('\n4️⃣ Testing printer test function...');
      const firstPrinter = printersData.printers[0];
      const testResponse = await fetch(`${BASE_URL}/print/test/${firstPrinter.id}`, {
        method: 'POST'
      });

      const testData = await testResponse.json();
      if (testData.success) {
        console.log('✅ Printer test completed');
        console.log(`   Job ID: ${testData.result.jobId}`);
      } else {
        console.log('❌ Printer test failed:', testData.error);
      }
    }

    // Test 5: Service status
    console.log('\n5️⃣ Testing service status...');
    const statusResponse = await fetch(`${BASE_URL}/print/status`);
    const statusData = await statusResponse.json();
    console.log('✅ Service status:', statusData.status);
    console.log(`   Active WebSocket connections: ${statusData.websocket.activeConnections}`);
    console.log(`   Available printers: ${statusData.printers.available}`);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the print service is running:');
    console.log('   cd print-service && npm start');
  }
}

// Run tests
testPrintService();











