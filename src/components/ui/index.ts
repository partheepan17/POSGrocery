// UI Components Barrel Export

// Core Components
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

export { Badge } from './Badge';
export type { BadgeProps } from './Badge';

// Layout Components
export { Card, CardHeader, CardContent, CardFooter } from './Card';
export type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps } from './Card';

export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableRow, 
  TableHead, 
  TableCell 
} from './Table';
export type { 
  TableProps, 
  TableHeaderProps, 
  TableBodyProps, 
  TableFooterProps, 
  TableRowProps, 
  TableHeadProps, 
  TableCellProps 
} from './Table';

// Overlay Components
export { 
  Dialog, 
  DialogHeader, 
  DialogContent, 
  DialogFooter, 
  DialogTitle, 
  DialogDescription,
  AlertDialog 
} from './Dialog';
export type { 
  DialogProps, 
  DialogHeaderProps, 
  DialogContentProps, 
  DialogFooterProps, 
  DialogTitleProps, 
  DialogDescriptionProps,
  AlertDialogProps 
} from './Dialog';

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

// Dropdown Components
export { 
  Dropdown, 
  DropdownMenu, 
  DropdownItem, 
  DropdownSeparator
} from './Dropdown';
export type { 
  DropdownProps, 
  DropdownMenuProps, 
  DropdownItemProps
} from './Dropdown';

// Breadcrumb Components
export { Breadcrumb, AutoBreadcrumb, PageHeader } from './Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItem, AutoBreadcrumbProps, PageHeaderProps } from './Breadcrumb';

// Form Components
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

// Alert Components
export { 
  AlertBanner, 
  InlineAlert, 
  StatusMessage 
} from './AlertDialog';
export type { 
  AlertBannerProps, 
  InlineAlertProps, 
  StatusMessageProps 
} from './AlertDialog';

// Accessibility Components
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

// Notification Components
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

// Separator Component
export { Separator } from './Separator';
