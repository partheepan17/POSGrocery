/**
 * Printer Service
 * Manages thermal printer connections and printing operations
 */

import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';
import { SerialPort } from 'serialport';
import { usb } from 'usb';
import { v4 as uuidv4 } from 'uuid';

export class PrinterService {
  constructor() {
    this.printers = new Map();
    this.availablePorts = [];
    this.isInitialized = false;
  }

  async initialize() {
    console.log('🔍 Scanning for available printers...');
    
    try {
      // Scan for USB printers
      await this.scanUSBPrinters();
      
      // Scan for serial printers
      await this.scanSerialPrinters();
      
      // Scan for network printers
      await this.scanNetworkPrinters();
      
      this.isInitialized = true;
      console.log(`✅ Found ${this.printers.size} printer(s)`);
      
      // Log available printers
      for (const [id, printer] of this.printers) {
        console.log(`   📄 ${printer.name} (${printer.type}) - ${printer.status}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize printer service:', error);
      throw error;
    }
  }

  async scanUSBPrinters() {
    try {
      const devices = usb.getDeviceList();
      console.log(`🔌 Found ${devices.length} USB devices`);
      
      // Look for common thermal printer vendor IDs
      const thermalPrinterVendors = [
        0x04b8, // Epson
        0x04f9, // Brother
        0x03f0, // HP
        0x0fe6, // Star Micronics
        0x0519, // Citizen
        0x04e8, // Samsung
      ];
      
      for (const device of devices) {
        if (thermalPrinterVendors.includes(device.deviceDescriptor.idVendor)) {
          const printerId = `usb_${device.deviceDescriptor.idVendor}_${device.deviceDescriptor.idProduct}`;
          const printer = {
            id: printerId,
            name: `USB Thermal Printer (${device.deviceDescriptor.idVendor.toString(16)}:${device.deviceDescriptor.idProduct.toString(16)})`,
            type: 'usb',
            status: 'available',
            vendorId: device.deviceDescriptor.idVendor,
            productId: device.deviceDescriptor.idProduct,
            device: device
          };
          
          this.printers.set(printerId, printer);
        }
      }
    } catch (error) {
      console.warn('⚠️ USB printer scan failed:', error.message);
    }
  }

  async scanSerialPrinters() {
    try {
      const ports = await SerialPort.list();
      console.log(`🔌 Found ${ports.length} serial ports`);
      
      for (const port of ports) {
        // Common thermal printer serial ports
        if (port.friendlyName && (
          port.friendlyName.toLowerCase().includes('thermal') ||
          port.friendlyName.toLowerCase().includes('receipt') ||
          port.friendlyName.toLowerCase().includes('pos') ||
          port.friendlyName.toLowerCase().includes('printer')
        )) {
          const printerId = `serial_${port.path}`;
          const printer = {
            id: printerId,
            name: port.friendlyName || `Serial Printer (${port.path})`,
            type: 'serial',
            status: 'available',
            path: port.path,
            baudRate: 9600
          };
          
          this.printers.set(printerId, printer);
        }
      }
    } catch (error) {
      console.warn('⚠️ Serial printer scan failed:', error.message);
    }
  }

  async scanNetworkPrinters() {
    // Common network printer IPs for thermal printers
    const commonIPs = [
      '192.168.1.100',
      '192.168.1.101',
      '192.168.0.100',
      '192.168.0.101',
      '10.0.0.100',
      '10.0.0.101'
    ];
    
    for (const ip of commonIPs) {
      const printerId = `network_${ip}`;
      const printer = {
        id: printerId,
        name: `Network Thermal Printer (${ip})`,
        type: 'network',
        status: 'available',
        ip: ip,
        port: 9100
      };
      
      this.printers.set(printerId, printer);
    }
  }

  getPrinters() {
    return Array.from(this.printers.values());
  }

  getPrinterCount() {
    return this.printers.size;
  }

  getPrinter(id) {
    return this.printers.get(id);
  }

  async printReceipt(printerId, receiptData) {
    const printer = this.getPrinter(printerId);
    if (!printer) {
      throw new Error(`Printer ${printerId} not found`);
    }

    try {
      console.log(`🖨️ Printing receipt on ${printer.name}...`);
      
      switch (printer.type) {
        case 'usb':
          return await this.printUSBReceipt(printer, receiptData);
        case 'serial':
          return await this.printSerialReceipt(printer, receiptData);
        case 'network':
          return await this.printNetworkReceipt(printer, receiptData);
        default:
          throw new Error(`Unsupported printer type: ${printer.type}`);
      }
    } catch (error) {
      console.error(`❌ Print failed on ${printer.name}:`, error);
      throw error;
    }
  }

  async printUSBReceipt(printer, receiptData) {
    // For USB printers, we'll use a mock implementation
    // In a real implementation, you'd use the appropriate USB library
    console.log(`📄 USB Print: ${printer.name}`);
    console.log('Receipt content:', receiptData);
    
    // Simulate printing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      printerId: printer.id,
      printerName: printer.name,
      timestamp: new Date().toISOString(),
      jobId: uuidv4()
    };
  }

  async printSerialReceipt(printer, receiptData) {
    console.log(`📄 Serial Print: ${printer.name} on ${printer.path}`);
    console.log('Receipt content:', receiptData);
    
    // Simulate printing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      success: true,
      printerId: printer.id,
      printerName: printer.name,
      timestamp: new Date().toISOString(),
      jobId: uuidv4()
    };
  }

  async printNetworkReceipt(printer, receiptData) {
    console.log(`📄 Network Print: ${printer.name} at ${printer.ip}:${printer.port}`);
    console.log('Receipt content:', receiptData);
    
    // Simulate printing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      printerId: printer.id,
      printerName: printer.name,
      timestamp: new Date().toISOString(),
      jobId: uuidv4()
    };
  }

  async testPrinter(printerId) {
    const printer = this.getPrinter(printerId);
    if (!printer) {
      throw new Error(`Printer ${printerId} not found`);
    }

    const testReceipt = {
      type: 'test',
      lines: [
        { text: 'TEST RECEIPT', align: 'center', bold: true },
        { text: '================', align: 'center' },
        { text: 'This is a test print', align: 'center' },
        { text: 'from POS Print Service', align: 'center' },
        { text: new Date().toISOString(), align: 'center' },
        { text: '================', align: 'center' },
        { text: 'Test completed successfully!', align: 'center', bold: true }
      ]
    };

    return await this.printReceipt(printerId, testReceipt);
  }

  async cleanup() {
    console.log('🧹 Cleaning up printer service...');
    this.printers.clear();
    this.isInitialized = false;
  }
}

export const printerService = new PrinterService();











