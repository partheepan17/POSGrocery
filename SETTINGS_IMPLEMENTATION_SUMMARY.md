# Settings.tsx Implementation Summary

## Overview
Created a comprehensive Settings.tsx page with terminal registration, user preferences, and role display functionality. The page includes three main sections: General settings, Terminal management, and User information.

## Key Features

### 1. Terminal Registration & Management
- **Registration Form**: Register new terminals with name and description
- **Current Terminal Display**: Shows active terminal information
- **Status Monitoring**: Online/offline status and last seen timestamp
- **Connection Status**: Real-time connection monitoring
- **Terminal Switching**: Switch between registered terminals

### 2. User Preferences
- **Theme Selection**: Light, Dark, or Auto (system preference)
- **Language Support**: English, Sinhala (සිංහල), Tamil (தமிழ்)
- **Valuation Method**: FIFO, LIFO, Average Cost, or Informational
- **Notifications**: Sound, Desktop, and Email notification toggles
- **UI Preferences**: Compact mode, keyboard shortcuts, auto-save

### 3. Role Display (JWT Decoded)
- **User Information**: Name, username, email, role
- **Role Badges**: Visual role indicators (Admin, Manager, Cashier)
- **Permissions List**: Detailed permission breakdown by role
- **Session Information**: JWT token details, session duration, expiry
- **Security Info**: Token ID, issued/expiry timestamps

## Files Created

### Main Page
- **`src/pages/Settings.tsx`**: Main settings page with tabbed interface

### Components
- **`src/components/Settings/TerminalRegistration.tsx`**: Terminal management component
- **`src/components/Settings/PreferencesSection.tsx`**: User preferences component
- **`src/components/Settings/RoleDisplay.tsx`**: User role and JWT information display

### Store
- **`src/store/settingsStore.ts`**: Zustand store for settings management

## Technical Implementation

### Settings Store
```typescript
interface SettingsState {
  preferences: UserPreferences;
  currentTerminal: TerminalInfo;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  updateNestedPreference: <K extends keyof UserPreferences, N extends keyof UserPreferences[K]>(
    key: K, 
    nestedKey: N, 
    value: UserPreferences[K][N]
  ) => void;
  setCurrentTerminal: (terminal: Partial<TerminalInfo>) => void;
  resetPreferences: () => void;
}
```

### Data Types
```typescript
export type Theme = 'light' | 'dark' | 'auto';
export type Language = 'en' | 'si' | 'ta';
export type ValuationMethod = 'fifo' | 'lifo' | 'average' | 'informational';

export interface UserPreferences {
  theme: Theme;
  language: Language;
  defaultValuationMethod: ValuationMethod;
  notifications: {
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
  ui: {
    compactMode: boolean;
    showKeyboardShortcuts: boolean;
    autoSave: boolean;
  };
}
```

## Component Details

### Terminal Registration Component
- **Registration Form**: Name and description input fields
- **Status Display**: Current terminal information with status badges
- **Connection Monitoring**: Real-time online/offline status
- **Error Handling**: Graceful error handling with user feedback
- **Integration**: Uses existing terminalService for API calls

### Preferences Section
- **Theme Picker**: Visual theme selection with icons
- **Language Selector**: Multi-language support with native names
- **Valuation Method**: Detailed explanation of each method
- **Notification Toggles**: Individual notification preferences
- **UI Settings**: Interface customization options
- **Reset Functionality**: Reset to default preferences

### Role Display Component
- **JWT Decoding**: Extracts user information from JWT token
- **Role Visualization**: Icons and colors for different roles
- **Permission Matrix**: Detailed permission breakdown
- **Session Info**: Token details, duration, and expiry
- **Security Details**: Token ID and timestamps

## UI/UX Features

### Tabbed Interface
- **Three Tabs**: General, Terminal, User
- **Active State**: Clear visual indication of active tab
- **Responsive**: Works on all screen sizes
- **Smooth Transitions**: Smooth tab switching

### Visual Design
- **Consistent Styling**: Uses shadcn/ui components
- **Dark Mode**: Full dark mode support
- **Color Coding**: Meaningful colors for different states
- **Icons**: Lucide React icons throughout
- **Badges**: Status and role indicators

### User Experience
- **Auto-save**: Settings are automatically saved
- **Export/Import**: Settings can be exported and imported
- **Real-time Updates**: Changes are reflected immediately
- **Error Handling**: Clear error messages and recovery
- **Help Text**: Contextual help and descriptions

## Integration Points

### Terminal Service
- **Registration**: Uses terminalService.registerTerminal()
- **Status Check**: Uses terminalService.getCurrentTerminalId()
- **Details**: Uses terminalService.getTerminalDetails()

### Auth Store
- **User Info**: Uses useAuthStore for user data
- **JWT Token**: Decodes JWT for additional information
- **Role Permissions**: Integrates with permission system

### Theme System
- **Document Class**: Applies theme classes to document root
- **Auto Detection**: Detects system preference for auto theme
- **Persistence**: Settings are persisted in localStorage

## Settings Categories

### General Settings
1. **Theme**: Light, Dark, Auto
2. **Language**: English, Sinhala, Tamil
3. **Valuation Method**: FIFO, LIFO, Average, Informational
4. **Notifications**: Sound, Desktop, Email
5. **UI Preferences**: Compact mode, shortcuts, auto-save

### Terminal Settings
1. **Registration**: Register new terminals
2. **Status**: Current terminal information
3. **Connection**: Online/offline monitoring
4. **Management**: Switch between terminals

### User Settings
1. **Profile**: User information display
2. **Role**: Role and permission details
3. **Session**: JWT token information
4. **Security**: Token details and expiry

## Export/Import Functionality

### Export Settings
```typescript
const settingsData = {
  preferences,
  currentTerminal,
  exportedAt: new Date().toISOString(),
  version: '1.0.0'
};
```

### Import Settings
- **File Validation**: Validates JSON structure
- **Selective Import**: Can import preferences and terminal info
- **Error Handling**: Graceful handling of invalid files
- **User Feedback**: Clear success/error messages

## Security Features

### JWT Token Handling
- **Safe Decoding**: Proper JWT token decoding
- **Error Handling**: Graceful handling of invalid tokens
- **Information Display**: Shows relevant token information
- **Session Monitoring**: Tracks session duration and expiry

### Role-based Access
- **Permission Display**: Shows user permissions based on role
- **Role Visualization**: Clear role identification
- **Security Info**: Token ID and security details

## Performance Optimizations

### State Management
- **Zustand Store**: Efficient state management
- **Selective Updates**: Only updates changed values
- **Persistence**: Automatic persistence to localStorage
- **Memoization**: Prevents unnecessary re-renders

### Component Optimization
- **Lazy Loading**: Components load only when needed
- **Conditional Rendering**: Renders based on user state
- **Efficient Updates**: Minimal re-renders on state changes

## Usage

### Basic Usage
```typescript
import { Settings } from '@/pages/Settings';

// Use in routing
<Route path="/settings" element={<Settings />} />
```

### Store Usage
```typescript
import { useSettingsStore } from '@/store/settingsStore';

const { preferences, updatePreference } = useSettingsStore();

// Update theme
updatePreference('theme', 'dark');

// Update nested preference
updateNestedPreference('notifications', 'sound', true);
```

## Benefits

1. **Comprehensive Settings**: All user preferences in one place
2. **Terminal Management**: Full terminal registration and management
3. **Role Awareness**: Clear role and permission display
4. **Theme Support**: Complete theme system with auto-detection
5. **Multi-language**: Support for multiple languages
6. **Export/Import**: Easy settings backup and restore
7. **Real-time Updates**: Immediate feedback on changes
8. **Security**: JWT token information and session details
9. **User Friendly**: Intuitive interface with clear feedback
10. **Responsive**: Works on all device sizes

## Future Enhancements

1. **Advanced Terminal Settings**: Terminal-specific configurations
2. **User Management**: Admin user management interface
3. **Audit Logs**: Settings change tracking
4. **Backup Scheduling**: Automated settings backup
5. **Role Customization**: Custom role creation
6. **Advanced Permissions**: Granular permission management
7. **Settings Profiles**: Multiple settings profiles
8. **Cloud Sync**: Cloud-based settings synchronization

The Settings page provides a comprehensive configuration interface that allows users to manage their preferences, terminal registration, and view their role information with full JWT token details.










