# POS Grocery V2

A comprehensive Point of Sale (POS) system designed specifically for grocery stores, built with modern web technologies and optimized for cashier workflows.

## 🚀 Features

### Core POS Features
- **Sales Management**: Complete sales workflow with barcode scanning, product search, and multiple payment methods
- **Inventory Management**: Real-time stock tracking with FIFO/LIFO/Average costing methods
- **Customer Management**: Customer profiles, credit accounts, and purchase history
- **Supplier Management**: Supplier profiles, purchase orders, and GRN (Goods Received Note) processing
- **Returns & Refunds**: Complete returns workflow with receipt validation
- **Multi-terminal Support**: Support for multiple POS terminals with centralized data

### Advanced Features
- **Offline Support**: Works offline with automatic sync when connection is restored
- **PWA (Progressive Web App)**: Installable app with native-like experience
- **Real-time Updates**: Live updates across all terminals
- **Comprehensive Reporting**: Sales, inventory, financial, and operational reports
- **Role-based Access Control**: Granular permissions for different user roles
- **Multi-language Support**: English, Sinhala, and Tamil language support
- **Receipt Printing**: Thermal receipt printing with customizable templates
- **Label Printing**: Product label printing with barcodes
- **Backup & Recovery**: Automated database backups with point-in-time recovery

### Technical Features
- **Modern Architecture**: React + TypeScript frontend, Node.js + Express backend
- **Database**: SQLite with comprehensive schema and migrations
- **Performance Monitoring**: Built-in performance tracking and optimization
- **Structured Logging**: Comprehensive logging with correlation IDs
- **API Documentation**: Auto-generated API documentation
- **Testing**: Unit tests, integration tests, and E2E tests
- **Docker Support**: Containerized deployment with Docker Compose

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Zustand** for state management
- **React Hook Form** for form handling
- **React Query** for data fetching
- **PWA** capabilities with service workers

### Backend
- **Node.js** with TypeScript
- **Express.js** web framework
- **SQLite** database with Better-SQLite3
- **Winston** for structured logging
- **JWT** for authentication
- **Helmet** for security
- **CORS** for cross-origin requests
- **Compression** for response optimization

### Development Tools
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for git hooks
- **Vitest** for testing
- **Playwright** for E2E testing
- **TypeScript** for type safety

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Git** for version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/pos-grocery-v2.git
cd pos-grocery-v2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
# Copy the example environment file
cp env.example .env

# Edit the environment file with your settings
nano .env
```

### 4. Database Setup

```bash
# Run database migrations
npm run db:migrate

# Seed the database with sample data
npm run seed
```

### 5. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start them separately
npm run dev:server  # Backend only
npm run dev:client  # Frontend only
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8250
- **API Documentation**: http://localhost:8250/api/docs

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

```bash
# Application
NODE_ENV=development
PORT=8250

# Database
DB_PATH=./data/pos.db

# Frontend
VITE_API_BASE_URL=http://localhost:8250

# CORS
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Security
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-super-secret-session-key

# Business
BUSINESS_NAME=Your Store Name
BUSINESS_ADDRESS=Your Store Address
BUSINESS_PHONE=Your Phone Number
```

### Database Configuration

The system uses SQLite for simplicity and performance. Database files are stored in the `./data/` directory.

```bash
# Database operations
npm run db:migrate    # Run migrations
npm run db:seed       # Seed with sample data
npm run db:reset      # Reset database
```

## 🏗️ Project Structure

```
pos-grocery-v2/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── store/             # State management
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript type definitions
├── server/                # Backend source code
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   ├── db/                # Database configuration
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript type definitions
├── public/                # Static assets
├── tests/                 # Test files
├── scripts/               # Build and utility scripts
└── docs/                  # Documentation
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:api

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API endpoint tests
- **E2E Tests**: Full user workflow tests
- **Contract Tests**: API contract validation

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run with Docker Compose
npm run docker:compose
```

### Environment-Specific Configuration

- **Development**: Hot reload, debug logging, sample data
- **Staging**: Production-like with test data
- **Production**: Optimized build, error tracking, monitoring

## 📊 Monitoring & Logging

### Performance Monitoring

The system includes built-in performance monitoring:

```bash
# View performance metrics
npm run metrics

# Generate performance report
npm run performance:report
```

### Logging

Structured logging with correlation IDs:

```bash
# View logs
npm run logs

# Log analysis
npm run logs:analyze
```

### Health Checks

```bash
# Check system health
curl http://localhost:8250/api/health

# Detailed health check
curl http://localhost:8250/api/health/detailed
```

## 🔒 Security

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (RBAC)
- Session management
- Password policies

### Security Headers

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation

### Data Protection

- SQL injection prevention
- XSS protection
- CSRF protection
- Secure password hashing

## 🎯 Keyboard Shortcuts

### Navigation
- `F1` - Go to Sales
- `F2` - Go to Returns
- `F3` - Go to Products
- `F4` - Go to Customers
- `F5` - Go to Suppliers
- `F6` - Go to Pricing
- `F7` - Go to Discounts
- `F8` - Go to Shifts

### Sales Operations
- `Enter` - Add selected product to cart
- `Escape` - Clear current operation
- `Ctrl+P` - Process payment (Cash)
- `Ctrl+D` - Process payment (Card)
- `Ctrl+W` - Process payment (Wallet)
- `Ctrl+T` - Process payment (Credit)
- `Ctrl+H` - Hold current sale
- `Ctrl+R` - Resume held sale
- `Ctrl+C` - Clear cart

### Utilities
- `Ctrl+K` - Open command palette
- `?` - Show keyboard shortcuts help
- `Ctrl+F` - Focus search field
- `Ctrl+B` - Focus barcode field

## 📱 PWA Features

### Offline Support
- Service worker for caching
- Offline data storage
- Background sync
- Offline indicators

### App Installation
- Installable on desktop and mobile
- Native-like experience
- Push notifications
- App shortcuts

## 🔄 API Documentation

### REST API

The system provides a comprehensive REST API:

- **Base URL**: `http://localhost:8250/api`
- **Authentication**: JWT Bearer tokens
- **Content Type**: `application/json`
- **Pagination**: Standard pagination with `page`, `pageSize`, `total`, `pages`

### Key Endpoints

```bash
# Authentication
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh

# Products
GET /api/products
POST /api/products
PUT /api/products/:id
DELETE /api/products/:id

# Sales
GET /api/sales
POST /api/sales
GET /api/sales/:id

# Inventory
GET /api/inventory
POST /api/inventory/movements
GET /api/inventory/stock

# Reports
GET /api/reports/sales
GET /api/reports/inventory
GET /api/reports/financial
```

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Use ESLint and Prettier
- Write comprehensive tests
- Document new features
- Follow conventional commits

### Pull Request Process

1. Ensure tests pass
2. Update documentation
3. Add changelog entry
4. Request code review
5. Address feedback
6. Merge when approved

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation**: Check the [docs/](docs/) directory
- **Issues**: Report bugs and request features on GitHub
- **Discussions**: Join community discussions
- **Email**: support@pos-grocery.com

### Common Issues

1. **Database Connection Issues**: Check database file permissions
2. **CORS Errors**: Verify CORS_ORIGINS configuration
3. **Build Failures**: Ensure Node.js version compatibility
4. **Performance Issues**: Check system resources and configuration

## 🗺️ Roadmap

### Upcoming Features
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-store support
- [ ] Integration with accounting systems
- [ ] Barcode scanner integration
- [ ] Advanced reporting with charts
- [ ] Automated inventory reordering
- [ ] Customer loyalty program

### Version History

- **v1.0.0** - Initial release with core POS functionality
- **v1.1.0** - Added offline support and PWA features
- **v1.2.0** - Enhanced reporting and analytics
- **v2.0.0** - Complete rewrite with modern architecture

## 🙏 Acknowledgments

- React team for the excellent framework
- Express.js team for the robust backend framework
- SQLite team for the reliable database
- All contributors and testers

---

**Built with ❤️ for grocery stores worldwide**