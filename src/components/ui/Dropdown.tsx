import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  side?: 'top' | 'bottom';
  offset?: number;
  className?: string;
  disabled?: boolean;
}

interface DropdownMenuProps {
  children: React.ReactNode;
  className?: string;
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}

interface DropdownSeparatorProps {
  className?: string;
}

const DropdownContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {}
});

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'left',
  side = 'bottom',
  offset = 4,
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  };

  const sideClasses = {
    top: 'bottom-full',
    bottom: 'top-full'
  };

  const offsetClasses = {
    top: { marginBottom: `${offset}px` },
    bottom: { marginTop: `${offset}px` }
  };

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className={cn('relative inline-block', className)} ref={dropdownRef}>
        <div
          onClick={toggleDropdown}
          className={cn(
            'cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {trigger}
        </div>

        {isOpen && (
          <div
            className={cn(
              'absolute z-50 min-w-48',
              alignmentClasses[align],
              sideClasses[side]
            )}
            style={offsetClasses[side]}
          >
            {children}
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  );
};

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
        'rounded-lg shadow-lg py-1 max-h-96 overflow-y-auto',
        'animate-in fade-in-0 zoom-in-95 duration-100',
        className
      )}
      role="menu"
    >
      {children}
    </div>
  );
};

const DropdownItem: React.FC<DropdownItemProps> = ({ 
  children, 
  onClick, 
  disabled = false,
  active = false,
  className 
}) => {
  const { setIsOpen } = React.useContext(DropdownContext);

  const handleClick = () => {
    if (!disabled) {
      onClick?.();
      setIsOpen(false);
    }
  };

  return (
    <button
      className={cn(
        'w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300',
        'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
        'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed',
        active && 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      role="menuitem"
    >
      <div className="flex items-center justify-between">
        {children}
        {active && <Check className="w-4 h-4" />}
      </div>
    </button>
  );
};

const DropdownSeparator: React.FC<DropdownSeparatorProps> = ({ className }) => {
  return (
    <div 
      className={cn(
        'my-1 h-px bg-gray-200 dark:bg-gray-600',
        className
      )}
      role="separator"
    />
  );
};

// Select Component built on top of Dropdown
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className,
  error = false
}) => {
  const selectedOption = options.find(option => option.value === value);

  return (
    <Dropdown
      disabled={disabled}
      trigger={
        <div
          className={cn(
            'flex items-center justify-between w-full px-3 py-2 text-left',
            'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600',
            'rounded-lg shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'hover:border-gray-400 dark:hover:border-gray-500',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
        >
          <span className={cn(
            'truncate',
            selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
          )}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
        </div>
      }
    >
      <DropdownMenu>
        {options.map((option) => (
          <DropdownItem
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            active={option.value === value}
          >
            {option.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export { 
  Dropdown, 
  DropdownMenu, 
  DropdownItem, 
  DropdownSeparator,
  Select
};

export type { 
  DropdownProps, 
  DropdownMenuProps, 
  DropdownItemProps, 
  SelectProps,
  SelectOption
};



