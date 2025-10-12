import React from 'react';
import { cn } from '@/utils/cn';
import { Input } from './Input';
import { Button } from './Button';
import { Select, SelectOption } from './Dropdown';

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  required?: boolean;
}

interface FormErrorProps {
  children: React.ReactNode;
  className?: string;
}

interface FormHelpProps {
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({ children, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  );
};

const FormLabel: React.FC<FormLabelProps> = ({ 
  children, 
  required = false, 
  className, 
  ...props 
}) => {
  return (
    <label 
      className={cn(
        'block text-sm font-medium text-gray-700 dark:text-gray-300',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

const FormError: React.FC<FormErrorProps> = ({ children, className }) => {
  return (
    <div 
      className={cn(
        'text-sm text-red-600 dark:text-red-400 flex items-center gap-1',
        className
      )}
      role="alert"
    >
      {children}
    </div>
  );
};

const FormHelp: React.FC<FormHelpProps> = ({ children, className }) => {
  return (
    <div className={cn('text-sm text-gray-500 dark:text-gray-400', className)}>
      {children}
    </div>
  );
};

// Enhanced Input Field with Form Integration
interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  help?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'pos' | 'search';
  inputSize?: 'sm' | 'md' | 'lg';
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  help,
  required,
  id,
  inputSize,
  ...inputProps
}) => {
  const inputId = id || React.useId();

  return (
    <FormField>
      {label && (
        <FormLabel htmlFor={inputId} required={required}>
          {label}
        </FormLabel>
      )}
      <Input
        id={inputId}
        error={error}
        inputSize={inputSize}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${inputId}-error` : help ? `${inputId}-help` : undefined
        }
        {...inputProps}
      />
      {error && (
        <FormError>
          {error}
        </FormError>
      )}
      {help && !error && (
        <FormHelp>
          {help}
        </FormHelp>
      )}
    </FormField>
  );
};

// Enhanced Select Field
interface FormSelectProps {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({
  label,
  error,
  help,
  required,
  id,
  ...selectProps
}) => {
  const selectId = id || React.useId();

  return (
    <FormField>
      {label && (
        <FormLabel htmlFor={selectId} required={required}>
          {label}
        </FormLabel>
      )}
      <Select
        error={!!error}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${selectId}-error` : help ? `${selectId}-help` : undefined
        }
        {...selectProps}
      />
      {error && (
        <FormError>
          {error}
        </FormError>
      )}
      {help && !error && (
        <FormHelp>
          {help}
        </FormHelp>
      )}
    </FormField>
  );
};

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'pos' | 'search';
  textareaSize?: 'sm' | 'md' | 'lg';
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant = 'default',
    textareaSize = 'md',
    error = false,
    ...props 
  }, ref) => {
    const baseClasses = 'w-full transition-colors placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-vertical';
    
    const variants = {
      default: cn(
        'border border-gray-300 bg-white px-3 text-gray-900 shadow-sm',
        'focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20',
        'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
        'dark:focus:border-primary-400 dark:focus:ring-primary-400/20',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      ),
      filled: cn(
        'border-0 bg-gray-100 px-3 text-gray-900',
        'focus:bg-white focus:ring-1 focus:ring-primary-500/20',
        'dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-800',
        error && 'bg-red-50 focus:bg-red-50 focus:ring-red-500/20 dark:bg-red-900/20'
      ),
      underlined: cn(
        'border-0 border-b-2 border-gray-300 bg-transparent px-0 rounded-none',
        'focus:border-primary-500 focus:ring-0',
        'dark:border-gray-600 dark:focus:border-primary-400',
        error && 'border-red-500 focus:border-red-500'
      )
    };

    const sizes = {
      sm: 'min-h-20 py-2 text-sm rounded-md',
      md: 'min-h-24 py-2 text-sm rounded-lg',
      lg: 'min-h-32 py-3 text-base rounded-lg'
    };

    return (
      <textarea
        className={cn(
          baseClasses,
          variants[variant as keyof typeof variants],
          sizes[textareaSize],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

// Form Textarea with integration
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: string;
  variant?: 'default' | 'pos' | 'search';
  textareaSize?: 'sm' | 'md' | 'lg';
}

const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  error,
  help,
  required,
  id,
  ...textareaProps
}) => {
  const textareaId = id || React.useId();

  return (
    <FormField>
      {label && (
        <FormLabel htmlFor={textareaId} required={required}>
          {label}
        </FormLabel>
      )}
      <Textarea
        id={textareaId}
        error={!!error}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${textareaId}-error` : help ? `${textareaId}-help` : undefined
        }
        {...textareaProps}
      />
      {error && (
        <FormError>
          {error}
        </FormError>
      )}
      {help && !error && (
        <FormHelp>
          {help}
        </FormHelp>
      )}
    </FormField>
  );
};

// Checkbox Component
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  variant?: 'default' | 'card';
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    className, 
    label,
    description,
    error,
    variant = 'default',
    id,
    ...props 
  }, ref) => {
    const checkboxId = id || React.useId();

    if (variant === 'card') {
      return (
        <FormField>
          <div className={cn(
            'relative flex items-start p-4 border border-gray-300 rounded-lg',
            'hover:border-gray-400 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20',
            'dark:border-gray-600 dark:hover:border-gray-500',
            error && 'border-red-500',
            props.checked && 'bg-primary-50 border-primary-300 dark:bg-primary-900/20',
            className
          )}>
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id={checkboxId}
                className={cn(
                  'w-4 h-4 text-primary-600 border-gray-300 rounded',
                  'focus:ring-primary-500 focus:ring-1',
                  'dark:border-gray-600 dark:bg-gray-700',
                  error && 'border-red-500'
                )}
                ref={ref}
                {...props}
              />
            </div>
            <div className="ml-3 text-sm">
              {label && (
                <label htmlFor={checkboxId} className="font-medium text-gray-900 dark:text-gray-100">
                  {label}
                </label>
              )}
              {description && (
                <p className="text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>
          </div>
          {error && (
            <FormError>
              {error}
            </FormError>
          )}
        </FormField>
      );
    }

    return (
      <FormField>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id={checkboxId}
              className={cn(
                'w-4 h-4 text-primary-600 border-gray-300 rounded',
                'focus:ring-primary-500 focus:ring-1',
                'dark:border-gray-600 dark:bg-gray-700',
                error && 'border-red-500',
                className
              )}
              ref={ref}
              {...props}
            />
          </div>
          {(label || description) && (
            <div className="ml-3 text-sm">
              {label && (
                <label htmlFor={checkboxId} className="font-medium text-gray-900 dark:text-gray-100">
                  {label}
                </label>
              )}
              {description && (
                <p className="text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        {error && (
          <FormError>
            {error}
          </FormError>
        )}
      </FormField>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Radio Group Component
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  variant?: 'default' | 'card';
  className?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  error,
  help,
  required,
  variant = 'default',
  className
}) => {
  const groupId = React.useId();

  return (
    <FormField className={className}>
      {label && (
        <FormLabel required={required}>
          {label}
        </FormLabel>
      )}
      <div className={cn(
        'space-y-2',
        variant === 'card' && 'space-y-3'
      )} role="radiogroup" aria-labelledby={label ? `${groupId}-label` : undefined}>
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          
          if (variant === 'card') {
            return (
              <div
                key={option.value}
                className={cn(
                  'relative flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer',
                  'hover:border-gray-400 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20',
                  'dark:border-gray-600 dark:hover:border-gray-500',
                  value === option.value && 'bg-primary-50 border-primary-300 dark:bg-primary-900/20',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center h-5">
                  <input
                    type="radio"
                    id={optionId}
                    name={name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={option.disabled}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor={optionId} className="font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </label>
                  {option.description && (
                    <p className="text-gray-500 dark:text-gray-400">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={option.value} className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  id={optionId}
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={option.disabled}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor={optionId} className="font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </label>
                {option.description && (
                  <p className="text-gray-500 dark:text-gray-400">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <FormError>
          {error}
        </FormError>
      )}
      {help && !error && (
        <FormHelp>
          {help}
        </FormHelp>
      )}
    </FormField>
  );
};

// Form Actions Component
interface FormActionsProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const FormActions: React.FC<FormActionsProps> = ({ 
  children, 
  align = 'right',
  className 
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  return (
    <div className={cn(
      'flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700',
      alignClasses[align],
      className
    )}>
      {children}
    </div>
  );
};

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
};

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
};

