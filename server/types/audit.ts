// Audit event types and schemas for compliance and post-incident analysis

export enum AuditAction {
  // Discount operations
  DISCOUNT_OVERRIDE = 'DISCOUNT_OVERRIDE',
  DISCOUNT_APPLIED = 'DISCOUNT_APPLIED',
  DISCOUNT_REMOVED = 'DISCOUNT_REMOVED',
  
  // Refund operations
  REFUND_CREATED = 'REFUND_CREATED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_REJECTED = 'REFUND_REJECTED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  
  // Cash operations
  CASH_MOVEMENT = 'CASH_MOVEMENT',
  CASH_DRAWER_OPEN = 'CASH_DRAWER_OPEN',
  CASH_DRAWER_CLOSE = 'CASH_DRAWER_CLOSE',
  CASH_COUNT = 'CASH_COUNT',
  CASH_DEPOSIT = 'CASH_DEPOSIT',
  CASH_WITHDRAWAL = 'CASH_WITHDRAWAL',
  
  // Shift operations
  SHIFT_OPEN = 'SHIFT_OPEN',
  SHIFT_CLOSE = 'SHIFT_CLOSE',
  SHIFT_SUSPEND = 'SHIFT_SUSPEND',
  SHIFT_RESUME = 'SHIFT_RESUME',
  
  // Authentication operations
  PIN_VERIFY_SUCCESS = 'PIN_VERIFY_SUCCESS',
  PIN_VERIFY_FAIL = 'PIN_VERIFY_FAIL',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAIL = 'LOGIN_FAIL',
  LOGOUT = 'LOGOUT',
  
  // Product operations
  PRODUCT_PRICE_CHANGE = 'PRODUCT_PRICE_CHANGE',
  PRODUCT_QUANTITY_ADJUST = 'PRODUCT_QUANTITY_ADJUST',
  PRODUCT_ADD = 'PRODUCT_ADD',
  PRODUCT_EDIT = 'PRODUCT_EDIT',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  
  // Order operations
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_UPDATE = 'ORDER_UPDATE',
  ORDER_CANCEL = 'ORDER_CANCEL',
  ORDER_VOID = 'ORDER_VOID',
  
  // System operations
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  ADMIN_ACTION = 'ADMIN_ACTION',
  DATABASE_BACKUP = 'DATABASE_BACKUP',
  DATABASE_RESTORE = 'DATABASE_RESTORE',
  SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN',
  SYSTEM_STARTUP = 'SYSTEM_STARTUP'
}

export enum ActorType {
  USER = 'user',
  SYSTEM = 'system',
  API = 'api',
  ADMIN = 'admin'
}

export enum EntityType {
  PRODUCT = 'product',
  ORDER = 'order',
  CASH_DRAWER = 'cash_drawer',
  SHIFT = 'shift',
  USER = 'user',
  DISCOUNT = 'discount',
  REFUND = 'refund',
  SYSTEM = 'system'
}

// Audit log entry interface
export interface AuditLogEntry {
  id?: number;
  timestamp?: Date;
  requestId: string;
  actorId?: string;
  actorType: ActorType;
  action: AuditAction;
  entityType?: EntityType;
  entityId?: string;
  dataSummary: string; // JSON string of non-sensitive data
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

// Data summary interfaces for different event types
export interface DiscountOverrideData {
  productId: string;
  productName: string;
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  discountPercentage?: number;
  reason: string;
  managerId: string;
}

export interface RefundData {
  orderId: string;
  refundAmount: number;
  refundReason: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    refundAmount: number;
  }>;
  paymentMethod: string;
}

export interface CashMovementData {
  movementType: 'deposit' | 'withdrawal' | 'count' | 'adjustment';
  amount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  reference?: string;
}

export interface ShiftData {
  shiftId: string;
  cashierId: string;
  cashierName: string;
  openingBalance?: number;
  closingBalance?: number;
  totalSales?: number;
  totalTransactions?: number;
}

export interface PinVerificationData {
  userId: string;
  userName: string;
  verificationResult: boolean;
  attemptCount?: number;
  lockoutTriggered?: boolean;
}

export interface ProductChangeData {
  productId: string;
  productName: string;
  fieldChanged: string;
  oldValue: any;
  newValue: any;
  reason?: string;
}

export interface OrderData {
  orderId: string;
  customerId?: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod: string;
  status: string;
}

// Audit context for request logging
export interface AuditContext {
  requestId: string;
  actorId?: string;
  actorType: ActorType;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

// Helper type for creating audit entries
export type AuditData = 
  | DiscountOverrideData
  | RefundData
  | CashMovementData
  | ShiftData
  | PinVerificationData
  | ProductChangeData
  | OrderData
  | Record<string, any>;



