# Daily Business Summary Sample Messages

## Email Sample

### Subject: Daily Business Summary - 2024-01-15

### HTML Content:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 24px; font-weight: bold; color: #27ae60; }
        .metric-label { font-size: 14px; color: #7f8c8d; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th, .table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background-color: #f8f9fa; font-weight: bold; }
        .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Daily Business Summary</h1>
        <p>Monday, January 15, 2024</p>
    </div>
    
    <div class="content">
        <!-- Totals Section -->
        <div class="section">
            <h2>💰 Daily Totals</h2>
            <div class="metric">
                <div class="metric-value">LKR 45,000.00</div>
                <div class="metric-label">Net Sales</div>
            </div>
            <div class="metric">
                <div class="metric-value">25</div>
                <div class="metric-label">Transactions</div>
            </div>
            <div class="metric">
                <div class="metric-value">LKR 1,800.00</div>
                <div class="metric-label">Avg Basket</div>
            </div>
            <div class="metric">
                <div class="metric-value">LKR 2,000.00</div>
                <div class="metric-label">Discounts</div>
            </div>
        </div>

        <!-- Margin Section -->
        <div class="section">
            <h2>📈 Profit Margin</h2>
            <div class="metric">
                <div class="metric-value">LKR 15,000.00</div>
                <div class="metric-label">Total Margin</div>
            </div>
            <div class="metric">
                <div class="metric-value">33.3%</div>
                <div class="metric-label">Margin %</div>
            </div>
            <div class="metric">
                <div class="metric-value">LKR 30,000.00</div>
                <div class="metric-label">Total Cost</div>
            </div>
        </div>

        <!-- Top SKUs Section -->
        <div class="section">
            <h2>🏆 Top 5 SKUs</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>Qty Sold</th>
                        <th>Revenue</th>
                        <th>Margin</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>MILK-001</td>
                        <td>Fresh Milk 1L</td>
                        <td>15</td>
                        <td>LKR 1,800.00</td>
                        <td>LKR 540.00</td>
                    </tr>
                    <tr>
                        <td>BREAD-001</td>
                        <td>White Bread Loaf</td>
                        <td>12</td>
                        <td>LKR 1,440.00</td>
                        <td>LKR 432.00</td>
                    </tr>
                    <tr>
                        <td>RICE-001</td>
                        <td>Basmati Rice 1kg</td>
                        <td>8</td>
                        <td>LKR 1,200.00</td>
                        <td>LKR 240.00</td>
                    </tr>
                    <tr>
                        <td>COOK-001</td>
                        <td>Chocolate Cookies</td>
                        <td>20</td>
                        <td>LKR 1,000.00</td>
                        <td>LKR 300.00</td>
                    </tr>
                    <tr>
                        <td>JUICE-001</td>
                        <td>Orange Juice 1L</td>
                        <td>6</td>
                        <td>LKR 900.00</td>
                        <td>LKR 270.00</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Low Stock Section -->
        <div class="section">
            <h2>⚠️ Low Stock Alert</h2>
            <div class="alert">
                <strong>3 products need attention!</strong>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>Current Qty</th>
                        <th>Reorder Level</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>MILK-001</td>
                        <td>Fresh Milk 1L</td>
                        <td>0</td>
                        <td>10</td>
                    </tr>
                    <tr>
                        <td>BREAD-001</td>
                        <td>White Bread Loaf</td>
                        <td>5</td>
                        <td>15</td>
                    </tr>
                    <tr>
                        <td>COOK-001</td>
                        <td>Chocolate Cookies</td>
                        <td>8</td>
                        <td>20</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Performance Section -->
        <div class="section">
            <h2>👥 Performance</h2>
            <h3>Top Cashiers</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Cashier</th>
                        <th>Transactions</th>
                        <th>Total Sales</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>John Doe</td>
                        <td>15</td>
                        <td>LKR 27,000.00</td>
                    </tr>
                    <tr>
                        <td>Jane Smith</td>
                        <td>10</td>
                        <td>LKR 18,000.00</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <div class="footer">
        <p>Generated at 1/15/2024, 7:30:45 PM | POS System</p>
    </div>
</body>
</html>
```

## WhatsApp Sample

```
📊 *Daily Business Summary - Mon, Jan 15*

💰 *TOTALS*
• Net Sales: LKR 45,000
• Transactions: 25
• Avg Basket: LKR 1,800
• Discounts: LKR 2,000

📈 *MARGIN*
• Total Margin: LKR 15,000
• Margin %: 33.3%
• Total Cost: LKR 30,000

🏆 *TOP 5 SKUs*
1. MILK-001 - Fresh Milk 1L
   Qty: 15 | Revenue: LKR 1,800
2. BREAD-001 - White Bread Loaf
   Qty: 12 | Revenue: LKR 1,440
3. RICE-001 - Basmati Rice 1kg
   Qty: 8 | Revenue: LKR 1,200
4. COOK-001 - Chocolate Cookies
   Qty: 20 | Revenue: LKR 1,000
5. JUICE-001 - Orange Juice 1L
   Qty: 6 | Revenue: LKR 900

⚠️ *LOW STOCK*
3 products need attention!

👥 *TOP CASHIER*
John Doe: 15 transactions (LKR 27,000)

---
Generated: 1/15/2024, 7:30:45 PM
```

## Sample Data Structure

### Daily Summary Data
```json
{
  "date": "2024-01-15",
  "totals": {
    "gross_sales": 50000,
    "net_sales": 45000,
    "total_discount": 2000,
    "total_tax": 3000,
    "transaction_count": 25,
    "average_basket": 1800
  },
  "margin": {
    "total_cost": 30000,
    "total_margin": 15000,
    "margin_percentage": 33.3
  },
  "top_skus": [
    {
      "product_id": 1,
      "sku": "MILK-001",
      "name_en": "Fresh Milk 1L",
      "quantity_sold": 15,
      "revenue": 1800,
      "margin": 540
    },
    {
      "product_id": 2,
      "sku": "BREAD-001",
      "name_en": "White Bread Loaf",
      "quantity_sold": 12,
      "revenue": 1440,
      "margin": 432
    }
  ],
  "low_stock": {
    "count": 3,
    "products": [
      {
        "product_id": 1,
        "sku": "MILK-001",
        "name_en": "Fresh Milk 1L",
        "current_quantity": 0,
        "reorder_level": 10
      },
      {
        "product_id": 2,
        "sku": "BREAD-001",
        "name_en": "White Bread Loaf",
        "current_quantity": 5,
        "reorder_level": 15
      }
    ]
  },
  "performance": {
    "cashier_performance": [
      {
        "cashier_id": 1,
        "cashier_name": "John Doe",
        "transaction_count": 15,
        "total_sales": 27000
      },
      {
        "cashier_id": 2,
        "cashier_name": "Jane Smith",
        "transaction_count": 10,
        "total_sales": 18000
      }
    ],
    "terminal_performance": [
      {
        "terminal_name": "Terminal-01",
        "transaction_count": 20,
        "total_sales": 36000
      },
      {
        "terminal_name": "Terminal-02",
        "transaction_count": 5,
        "total_sales": 9000
      }
    ]
  }
}
```

## Configuration Examples

### Environment Variables
```bash
# Daily Summary Configuration
DAILY_SUMMARY_ENABLED=true
DAILY_SUMMARY_SEND_TIME=19:30
DAILY_SUMMARY_EMAIL_ENABLED=true
DAILY_SUMMARY_EMAIL_SMTP_HOST=smtp.gmail.com
DAILY_SUMMARY_EMAIL_SMTP_PORT=587
DAILY_SUMMARY_EMAIL_SMTP_USER=your-email@gmail.com
DAILY_SUMMARY_EMAIL_SMTP_PASS=your-app-password
DAILY_SUMMARY_EMAIL_FROM=daily-summary@yourstore.com
DAILY_SUMMARY_EMAIL_TO=manager@yourstore.com,admin@yourstore.com
DAILY_SUMMARY_WHATSAPP_ENABLED=true
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_WHATSAPP_TO=+94771234567,+94771234568
```

### Cron Schedule
```typescript
// Daily business summary - every day at 7:30 PM local time
this.scheduleJob('daily-summary', '30 19 * * *', async () => {
  try {
    this.logger.info('Running daily business summary');
    await dailySummaryService.generateAndSendTodaysSummary();
  } catch (error) {
    this.logger.error('Daily summary job failed', { error: error.message });
  }
});
```

## Features

### Email Features
- **HTML Formatting**: Rich HTML emails with CSS styling
- **Responsive Design**: Works on desktop and mobile devices
- **Color Coding**: Different colors for different sections
- **Tables**: Well-formatted tables for data display
- **Alerts**: Highlighted sections for important information
- **Professional Layout**: Clean, business-ready design

### WhatsApp Features
- **Markdown Formatting**: Bold text and emojis for better readability
- **Compact Format**: Optimized for mobile viewing
- **Key Metrics**: Essential business metrics at a glance
- **Quick Overview**: Perfect for quick daily check-ins
- **Mobile-Friendly**: Designed for mobile-first viewing

### Data Sources
- **Sales Data**: From `invoices` and `invoice_lines` tables
- **Product Data**: From `products` and `product_stock` tables
- **User Data**: From `users` table for cashier information
- **Real-time Calculations**: Margin, averages, and percentages
- **Low Stock Detection**: Products below reorder level

### Scheduling
- **Local Time**: Runs at 7:30 PM local time (configurable)
- **Timezone Support**: Respects system timezone settings
- **Error Handling**: Graceful failure handling with logging
- **Retry Logic**: Automatic retry for failed sends
- **Multiple Channels**: Email and WhatsApp simultaneously










