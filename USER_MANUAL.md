# POS Grocery System - User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [Sales Operations](#sales-operations)
3. [Product Management](#product-management)
4. [Customer Management](#customer-management)
5. [Inventory Management](#inventory-management)
6. [GRN System](#grn-system)
7. [Returns Processing](#returns-processing)
8. [Reporting](#reporting)
9. [System Settings](#system-settings)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### System Login
1. Open your web browser and navigate to the POS system URL
2. Enter your username and password
3. Click "Login" to access the system
4. The system will remember your login for the session

### Main Dashboard
After logging in, you'll see the main dashboard with:
- **Sales**: Point of sale interface
- **Products**: Product management
- **Customers**: Customer management
- **Suppliers**: Supplier management
- **Inventory**: Inventory management
- **GRN**: Goods Received Note system
- **Returns**: Product returns
- **Reports**: Reports and analytics
- **Settings**: System configuration

### Navigation
- Use the sidebar menu to navigate between different sections
- Click on any menu item to access that feature
- Use the search bar at the top to quickly find products or customers
- Use keyboard shortcuts for faster navigation (shown in tooltips)

## Sales Operations

### Making a Sale
1. **Start New Sale**: Click "New Sale" or press Ctrl+N
2. **Add Products**:
   - Scan barcode or search for product
   - Enter quantity
   - Product will be added to cart
3. **Apply Discounts** (if needed):
   - Select line item and click "Discount"
   - Enter discount amount or percentage
4. **Select Customer** (optional):
   - Click "Select Customer"
   - Search and select customer
5. **Process Payment**:
   - Click "Payment"
   - Select payment method (Cash, Card, etc.)
   - Enter amount received
   - Click "Complete Sale"
6. **Print Receipt**: Receipt will print automatically

### Hold Sales
1. **Hold Current Sale**: Click "Hold Sale" button
2. **Enter Hold Name**: Give the sale a name for easy identification
3. **Resume Sale**: Go to "Hold Sales" menu and select the held sale
4. **Complete Sale**: Process payment as normal

### Sales Features
- **Barcode Scanning**: Use barcode scanner for quick product entry
- **Quantity Adjustment**: Use +/- buttons or type quantity
- **Price Override**: Manager can override prices if needed
- **Multiple Payment Methods**: Split payment across different methods
- **Receipt Reprint**: Reprint receipts from sales history

## Product Management

### Adding Products
1. **Navigate to Products**: Click "Products" in the sidebar
2. **Add New Product**: Click "Add Product" button
3. **Fill Product Details**:
   - Product Name (English, Sinhala, Tamil)
   - SKU (unique identifier)
   - Barcode (if available)
   - Category
   - Unit (pieces, kilograms)
   - Prices (retail, wholesale, credit, other)
   - Cost
   - Reorder Level
4. **Save Product**: Click "Save" to add the product

### Managing Products
- **Edit Product**: Click on product in the list and click "Edit"
- **Deactivate Product**: Click "Deactivate" to hide from sales
- **Search Products**: Use search bar to find products quickly
- **Filter Products**: Use category and status filters
- **Bulk Import**: Use CSV import for multiple products

### Product Categories
1. **Create Category**: Go to Settings > Categories
2. **Add Category**: Enter category name and description
3. **Assign to Products**: Select category when adding/editing products

## Customer Management

### Adding Customers
1. **Navigate to Customers**: Click "Customers" in the sidebar
2. **Add New Customer**: Click "Add Customer" button
3. **Fill Customer Details**:
   - Customer Name
   - Phone Number
   - Email Address
   - Address
   - Customer Type (Retail, Wholesale, Credit)
   - Credit Limit (for credit customers)
4. **Save Customer**: Click "Save" to add the customer

### Customer Features
- **Search Customers**: Use search bar to find customers
- **View Purchase History**: Click on customer to see purchase history
- **Edit Customer**: Click "Edit" to modify customer details
- **Credit Management**: Track credit limits and payments

## Inventory Management

### Stock Levels
- **View Current Stock**: Go to Inventory to see current stock levels
- **Low Stock Alerts**: Products below reorder level are highlighted
- **Stock Adjustments**: Adjust stock levels with reasons
- **Stock Movements**: View all stock movements and transactions

### Stock Adjustments
1. **Navigate to Inventory**: Click "Inventory" in the sidebar
2. **Select Product**: Click on product to adjust
3. **Adjust Stock**: Click "Adjust Stock"
4. **Enter Details**:
   - New quantity
   - Reason for adjustment
   - Notes
5. **Save Adjustment**: Click "Save" to apply adjustment

### Stocktaking
1. **Start Stocktake**: Go to Inventory > Stocktake
2. **Create Session**: Click "New Stocktake"
3. **Count Products**: Scan or search products and enter counts
4. **Review Variances**: Check differences between counted and system stock
5. **Apply Adjustments**: Approve and apply stock adjustments
6. **Complete Stocktake**: Finalize the stocktake session

## GRN System

### Creating a GRN
1. **Navigate to GRN**: Click "GRN" in the sidebar
2. **Create New GRN**: Click "New GRN" button
3. **Select Supplier**: Choose supplier from dropdown
4. **Add Products**:
   - Search for products
   - Enter quantity received
   - Enter unit cost
   - Add batch number (if applicable)
   - Add expiry date (if applicable)
5. **Review GRN**: Check all details and totals
6. **Save GRN**: Click "Save Draft" or "Post GRN"

### GRN Workflow
- **Draft Status**: GRN is saved but not posted to inventory
- **Posted Status**: GRN is posted and inventory is updated
- **Void Status**: GRN is cancelled and cannot be modified

### GRN Features
- **Print GRN**: Print GRN slip for records
- **Print Labels**: Print labels for received products
- **CSV Import**: Import GRN data from CSV files
- **CSV Export**: Export GRN data to CSV files
- **GRN History**: View all GRNs and their status

## Returns Processing

### Processing Returns
1. **Navigate to Returns**: Click "Returns" in the sidebar
2. **Lookup Sale**: Enter receipt number or scan receipt
3. **Select Items**: Choose items to return
4. **Enter Return Details**:
   - Return quantity
   - Return reason
   - Refund amount
5. **Process Refund**: Select refund method and complete return

### Return Features
- **Partial Returns**: Return only some items from a sale
- **Exchange Processing**: Exchange items instead of refund
- **Return Authorization**: Manager approval for large returns
- **Return History**: Track all returns and reasons

## Reporting

### Sales Reports
1. **Navigate to Reports**: Click "Reports" in the sidebar
2. **Select Report Type**: Choose from available reports
3. **Set Date Range**: Select start and end dates
4. **Apply Filters**: Filter by product, customer, or other criteria
5. **Generate Report**: Click "Generate" to create report
6. **Export Report**: Export to PDF, Excel, or CSV

### Available Reports
- **Daily Sales**: Sales summary for a specific day
- **Product Sales**: Sales by product
- **Customer Sales**: Sales by customer
- **Inventory Reports**: Stock levels and movements
- **Financial Reports**: Profit and loss statements
- **GRN Reports**: Goods received reports

### Report Features
- **Custom Date Ranges**: Select any date range
- **Multiple Filters**: Filter by various criteria
- **Export Options**: Export in multiple formats
- **Print Reports**: Print reports directly
- **Schedule Reports**: Set up automatic report generation

## System Settings

### Store Settings
1. **Navigate to Settings**: Click "Settings" in the sidebar
2. **Store Information**: Update store name, address, contact details
3. **Tax Settings**: Configure tax rates and codes
4. **Currency Settings**: Set currency and formatting
5. **Language Settings**: Choose default language

### Device Settings
- **Receipt Printer**: Configure receipt printer settings
- **Cash Drawer**: Set up cash drawer integration
- **Barcode Scanner**: Configure barcode scanner
- **Scale**: Set up weighing scale integration

### User Management
1. **Navigate to Users**: Click "Users" in the sidebar
2. **Add User**: Click "Add User" to create new user
3. **Set Permissions**: Assign appropriate permissions
4. **User Roles**: Create and manage user roles
5. **Password Management**: Reset passwords and manage security

## Troubleshooting

### Common Issues

#### Login Problems
- **Forgot Password**: Contact administrator to reset password
- **Account Locked**: Wait 15 minutes or contact administrator
- **Wrong Credentials**: Check username and password spelling

#### Sales Issues
- **Product Not Found**: Check if product is active and in correct category
- **Price Not Updating**: Refresh page or restart application
- **Receipt Not Printing**: Check printer connection and settings

#### Inventory Issues
- **Stock Not Updating**: Check if GRN is posted properly
- **Negative Stock**: Review recent transactions and adjustments
- **Missing Products**: Check if products are deactivated

#### System Performance
- **Slow Loading**: Clear browser cache and restart application
- **Connection Issues**: Check internet connection and server status
- **Data Not Saving**: Check database connection and permissions

### Getting Help
- **User Guide**: Refer to this manual for detailed instructions
- **System Administrator**: Contact your system administrator
- **Support Team**: Reach out to technical support team
- **Training**: Request additional training if needed

### Best Practices
- **Regular Backups**: Ensure data is backed up regularly
- **User Training**: Train all users on system features
- **Security**: Keep passwords secure and change regularly
- **Updates**: Keep system updated with latest features
- **Data Entry**: Enter data accurately to maintain data integrity

---

This user manual provides comprehensive guidance for using the POS Grocery System. For additional support or training, please contact your system administrator.


