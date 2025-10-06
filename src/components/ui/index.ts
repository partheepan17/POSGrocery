// UI Components Barrel Export

// Button System
export { Button } from './Button';
export type { ButtonProps } from './Button';

// Toast Notification System
export { 
  ToastProvider, 
  useToast, 
  toast, 
  toastStyles 
} from './Toast';
export type { Toast } from './Toast';

// Loading & Skeleton Components
export { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonTable, 
  SkeletonList,
  LoadingSpinner,
  PageLoading,
  LoadingOverlay
} from './Skeleton';

// Enhanced Modal System
export { 
  Modal, 
  ModalHeader, 
  ModalContent, 
  ModalFooter, 
  ModalTitle, 
  ModalDescription,
  ConfirmModal,
  AlertModal,
  DrawerModal
} from './Modal';
export type { 
  ModalProps, 
  ModalHeaderProps, 
  ModalContentProps, 
  ModalFooterProps,
  ConfirmModalProps,
  AlertModalProps,
  DrawerModalProps
} from './Modal';

// Enhanced Table System
export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableRow, 
  TableHead, 
  TableCell,
  EnhancedTable,
  DataTable
} from './Table';
export type { 
  TableProps, 
  TableHeaderProps, 
  TableBodyProps, 
  TableFooterProps,
  TableRowProps, 
  TableHeadProps, 
  TableCellProps,
  EnhancedTableProps,
  EnhancedTableColumn,
  DataTableProps
} from './Table';

export { Input } from './Input';
export type { InputProps } from './Input';

export { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter, 
  CardTitle, 
  CardDescription 
} from './Card';
export type { 
  CardProps, 
  CardHeaderProps, 
  CardContentProps, 
  CardFooterProps,
  CardTitleProps,
  CardDescriptionProps
} from './Card';

// Modal exports already defined above

export { 
  Dropdown, 
  DropdownMenu, 
  DropdownItem, 
  DropdownSeparator,
  Select
} from './Dropdown';
export type { 
  DropdownProps, 
  DropdownMenuProps, 
  DropdownItemProps, 
  SelectProps,
  SelectOption
} from './Dropdown';

// LoadingSpinner exports already defined above

// Toast exports already defined above

export { 
  Badge, 
  StatusBadge, 
  NotificationBadge, 
  PriorityBadge 
} from './Badge';
export type { 
  BadgeProps, 
  StatusBadgeProps, 
  NotificationBadgeProps, 
  PriorityBadgeProps 
} from './Badge';

// Table exports already defined above

export { Breadcrumb, AutoBreadcrumb, PageHeader } from './Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItem, AutoBreadcrumbProps, PageHeaderProps } from './Breadcrumb';

export { 
  FormField,
  FormLabel,
  FormError,
  FormHelp,
  FormInput,
  FormSelect,
  FormTextarea,
  Textarea,
  Checkbox,
  RadioGroup,
  FormActions
} from './Form';
export type { 
  FormFieldProps,
  FormLabelProps,
  FormErrorProps,
  FormHelpProps,
  FormInputProps,
  FormSelectProps,
  TextareaProps,
  FormTextareaProps,
  CheckboxProps,
  RadioGroupProps,
  RadioOption,
  FormActionsProps
} from './Form';

export { 
  AlertDialog, 
  AlertBanner, 
  InlineAlert, 
  StatusMessage 
} from './AlertDialog';
export type { 
  AlertDialogProps, 
  AlertBannerProps, 
  InlineAlertProps, 
  StatusMessageProps 
} from './AlertDialog';

export {
  ScreenReaderOnly,
  FocusTrap,
  SkipLink,
  Announcement,
  KeyboardNav,
  MenuItem,
  Progress,
  useHighContrast,
  useReducedMotion,
  useFocusVisible
} from './A11y';
export type {
  ScreenReaderOnlyProps,
  FocusTrapProps,
  SkipLinkProps,
  AnnouncementProps,
  KeyboardNavProps,
  MenuItemProps,
  ProgressProps
} from './A11y';

export { 
  NotificationCenter, 
  NotificationItem, 
  useNotifications 
} from './NotificationCenter';
export type { 
  Notification, 
  NotificationCenterProps, 
  NotificationItemProps,
  UseNotificationsReturn
} from './NotificationCenter';

// Alert System
export { Alert, AlertDescription } from './Alert';
// export type { AlertProps } from './Alert';

// Separator Component
export { Separator } from './Separator';
