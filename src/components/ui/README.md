# UI Components Library

A comprehensive design system for the POS Grocery application, built with React, TypeScript, and Tailwind CSS.

## 🎯 Design Principles

- **Accessibility First**: WCAG AA compliant components
- **Keyboard Navigation**: Full keyboard support for POS environments
- **Consistent Design**: 8px grid system and design tokens
- **Performance**: Optimized for speed and responsiveness
- **POS-Optimized**: Touch-friendly and barcode-scanner ready

## 📦 Components

### Core Components

#### Button
Primary interactive element with multiple variants and sizes.

```tsx
import { Button } from '@/components/ui/Button';

// Basic usage
<Button variant="primary" size="md">
  Click me
</Button>

// With icons
<Button 
  variant="pos-primary" 
  leftIcon={<ShoppingCart />}
  rightIcon={<ArrowRight />}
>
  Add to Cart
</Button>

// Loading state
<Button loading={true}>
  Processing...
</Button>
```

**Variants:**
- `primary` - Standard primary button
- `secondary` - Secondary action button
- `success` - Success state button
- `warning` - Warning state button
- `danger` - Destructive action button
- `ghost` - Minimal button
- `outline` - Outlined button
- `pos-primary` - POS-optimized primary
- `pos-secondary` - POS-optimized secondary
- `pos-success` - POS success button
- `pos-warning` - POS warning button
- `pos-danger` - POS danger button

**Sizes:**
- `xs` - Extra small (24px height)
- `sm` - Small (32px height)
- `md` - Medium (40px height)
- `lg` - Large (48px height)
- `xl` - Extra large (56px height)

#### Input
Form input with validation states and accessibility features.

```tsx
import { Input } from '@/components/ui/Input';

// Basic input
<Input
  label="Product Name"
  placeholder="Enter product name"
  value={value}
  onChange={setValue}
/>

// With validation
<Input
  label="Price"
  type="number"
  value={price}
  onChange={setPrice}
  error="Price must be greater than 0"
  helperText="Enter price in USD"
/>

// Search input
<Input
  variant="search"
  leftIcon={<Search />}
  placeholder="Search products..."
/>
```

**Variants:**
- `default` - Standard input
- `pos` - POS-optimized input
- `search` - Search input styling

**States:**
- `error` - Error state with red styling
- `success` - Success state with green styling
- `disabled` - Disabled state

#### Select
Dropdown selection with keyboard navigation.

```tsx
import { Select } from '@/components/ui/Select';

const options = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'wallet', label: 'Wallet' }
];

<Select
  label="Payment Method"
  options={options}
  value={paymentMethod}
  onChange={setPaymentMethod}
  placeholder="Select payment method"
/>
```

#### Badge
Status indicators and labels.

```tsx
import { Badge } from '@/components/ui/Badge';

// Status badges
<Badge variant="success">Online</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Error</Badge>

// POS-specific badges
<Badge variant="pos-success">Connected</Badge>
<Badge variant="pos-warning">Low Stock</Badge>

// With dot indicator
<Badge variant="info" dot>New</Badge>
```

### Layout Components

#### Card
Container for related content with consistent styling.

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';

<Card variant="pos" padding="lg">
  <CardHeader title="Product Details" subtitle="Manage product information">
    <Button variant="outline">Edit</Button>
  </CardHeader>
  <CardContent>
    <p>Product content goes here</p>
  </CardContent>
  <CardFooter>
    <Button variant="primary">Save</Button>
    <Button variant="outline">Cancel</Button>
  </CardFooter>
</Card>
```

**Variants:**
- `default` - Standard card
- `elevated` - Elevated with shadow
- `outlined` - Outlined border
- `pos` - POS-optimized styling

#### Table
Data table with sorting, selection, and responsive design.

```tsx
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/Table';

<Table variant="pos" size="md" density="comfortable" stickyHeader>
  <TableHeader>
    <TableRow>
      <TableHead sortable sortDirection="asc" onSort={handleSort}>
        Product
      </TableHead>
      <TableHead>Quantity</TableHead>
      <TableHead>Price</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id} hover>
        <TableCell>{item.name}</TableCell>
        <TableCell numeric>{item.quantity}</TableCell>
        <TableCell numeric>${item.price}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Overlay Components

#### Dialog
Modal dialogs with focus management and accessibility.

```tsx
import { 
  Dialog, 
  DialogHeader, 
  DialogContent, 
  DialogFooter, 
  DialogTitle 
} from '@/components/ui/Dialog';

<Dialog
  isOpen={isOpen}
  onClose={onClose}
  size="md"
  persistent={false}
>
  <DialogHeader>
    <DialogTitle>Confirm Action</DialogTitle>
  </DialogHeader>
  <DialogContent>
    <p>Are you sure you want to proceed?</p>
  </DialogContent>
  <DialogFooter>
    <Button variant="outline" onClick={onClose}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleConfirm}>
      Confirm
    </Button>
  </DialogFooter>
</Dialog>
```

**Sizes:**
- `xs` - Extra small (320px)
- `sm` - Small (384px)
- `md` - Medium (448px)
- `lg` - Large (512px)
- `xl` - Extra large (576px)
- `2xl` - 2X large (672px)
- `3xl` - 3X large (768px)
- `full` - Full width

#### AlertDialog
Pre-built alert dialogs for common use cases.

```tsx
import { AlertDialog } from '@/components/ui/Dialog';

<AlertDialog
  isOpen={isOpen}
  onClose={onClose}
  title="Delete Item"
  description="This action cannot be undone."
  type="error"
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={handleDelete}
  onCancel={onClose}
/>
```

**Types:**
- `info` - Information dialog
- `success` - Success dialog
- `warning` - Warning dialog
- `error` - Error dialog

## 🎨 Design Tokens

### Colors
```css
/* Primary Colors */
--color-primary-50: #f0f9ff;
--color-primary-500: #0ea5e9;
--color-primary-900: #0c4a6e;

/* POS Colors */
--color-pos-success: #22c55e;
--color-pos-warning: #f59e0b;
--color-pos-error: #ef4444;
--color-pos-info: #3b82f6;
--color-pos-accent: #8b5cf6;
```

### Spacing (8px Grid)
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-4: 1rem;      /* 16px */
--space-8: 2rem;      /* 32px */
--space-16: 4rem;     /* 64px */
```

### Typography
```css
--font-family-sans: 'Inter', system-ui, sans-serif;
--font-size-sm: 0.875rem;    /* 14px */
--font-size-base: 1rem;      /* 16px */
--font-size-lg: 1.125rem;    /* 18px */
--font-weight-medium: 500;
--font-weight-semibold: 600;
```

## ♿ Accessibility Features

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order is logical and intuitive
- Focus indicators are clearly visible
- Escape key closes modals and dialogs
- Enter/Space activate buttons

### Screen Reader Support
- ARIA labels for complex interactions
- Semantic HTML elements
- Live regions for dynamic content
- Proper heading hierarchy
- Form labels are associated

### Visual Accessibility
- WCAG AA color contrast (4.5:1)
- High contrast mode support
- 200% zoom compatibility
- Information not conveyed by color alone
- Clear focus indicators

## 🚀 Performance

### Optimization Features
- React.memo for expensive components
- Lazy loading for large components
- Debounced search inputs
- Virtualized lists for large data
- Optimized re-renders

### Bundle Size
- Tree-shaking enabled
- Dynamic imports for large components
- No duplicate dependencies
- Minimal bundle impact

## 📱 Responsive Design

### Breakpoints
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

### Mobile-First Approach
- Touch-friendly interactions
- Appropriate touch targets (44px minimum)
- Swipe gestures where appropriate
- No hover-only interactions

## 🎯 POS-Specific Features

### Keyboard-First Design
- Search input always focused
- Function key shortcuts (F10 = Checkout)
- Tab navigation throughout
- Barcode scanning support
- Quick actions via keyboard

### Touch Optimization
- Large touch targets
- Immediate touch feedback
- No accidental touches
- Swipe gestures
- Touch-friendly spacing

### Hardware Integration
- Scale connection status
- Printer status indicators
- Offline mode support
- Barcode scanning
- Receipt printing

## 🔧 Usage Guidelines

### Component Composition
```tsx
// Good: Composed components
<Card>
  <CardHeader title="Settings" />
  <CardContent>
    <Input label="Name" />
    <Button variant="primary">Save</Button>
  </CardContent>
</Card>

// Avoid: Inline styles
<div style={{ padding: '16px', border: '1px solid #ccc' }}>
  <input style={{ width: '100%' }} />
</div>
```

### Accessibility Best Practices
```tsx
// Good: Proper labeling
<Input
  label="Product Name"
  aria-describedby="name-help"
  helperText="Enter the product name"
/>

// Good: Semantic HTML
<Button
  aria-label="Add item to cart"
  onClick={handleAdd}
>
  <ShoppingCart />
</Button>
```

### Performance Best Practices
```tsx
// Good: Memoized components
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* expensive rendering */}</div>;
});

// Good: Debounced inputs
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);
```

## 🧪 Testing

### Component Testing
```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

test('button renders with correct text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});
```

### Accessibility Testing
```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

test('button has no accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 📚 Resources

- [Design Tokens Documentation](./tokens.css)
- [Accessibility Guidelines](./UI_UX_CHECKLIST.md)
- [Component Storybook](https://storybook.example.com)
- [Figma Design System](https://figma.com/design-system)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## 🤝 Contributing

1. Follow the design system principles
2. Ensure accessibility compliance
3. Write comprehensive tests
4. Update documentation
5. Follow the coding standards

## 📄 License

MIT License - see LICENSE file for details.




