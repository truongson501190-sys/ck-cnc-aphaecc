// src/types/global.d.ts

export {};

declare global {
  interface Window {
    // Supabase
    __SUPABASE_URL?: string;
    __SUPABASE_CLIENT?: unknown;
    
    // Google Analytics
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    
    // Service Worker
    __WB_MANIFEST?: any[];
    
    // App version and build info
    __APP_VERSION__: string;
    __BUILD_TIME__: string;
    
    // Environment
    __ENV__: {
      MODE: string;
      DEV: boolean;
      PROD: boolean;
      SSR: boolean;
    };
  }

  // Node.js environment variables
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
      VITE_API_URL: string;
      VITE_SENTRY_DSN: string;
      VITE_GA_MEASUREMENT_ID: string;
      VITE_APP_VERSION: string;
      VITE_ENV: 'development' | 'staging' | 'production';
    }
  }

  // Import.meta.env
  interface ImportMetaEnv {
    // Supabase
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    
    // API
    VITE_API_URL: string;
    
    // Sentry
    VITE_SENTRY_DSN: string;
    
    // Google Analytics
    VITE_GA_MEASUREMENT_ID: string;
    
    // App
    VITE_APP_VERSION: string;
    VITE_APP_NAME: string;
    VITE_ENV: 'development' | 'staging' | 'production';
    
    // Feature flags
    VITE_ENABLE_PWA: string;
    VITE_ENABLE_ANALYTICS: string;
    VITE_ENABLE_SENTRY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  // React.lazy types
  type LazyComponent<T extends React.ComponentType<any>> = React.LazyExoticComponent<T>;
  
  // Async component
  type AsyncComponent<T = any> = () => Promise<{ default: React.ComponentType<T> }>;
  
  // Permission types
  type PermissionLevel = 'none' | 'view' | 'edit' | 'full';
  type PermissionModule = 
    | 'ke_hoach_san_xuat'
    | 'nhat_ky_gia_cong'
    | 'nhat_ky_qc'
    | 'nhat_ky_bao_tri'
    | 'theo_doi_tien_do'
    | 'nhap_kho'
    | 'xuat_kho'
    | 'chuyen_kho'
    | 'xuat_dau'
    | 'kiem_ke_kho'
    | 'ton_kho'
    | 'the_kho'
    | 'lich_su_giao_dich'
    | 'dashboard_tong_hop'
    | 'bao_cao_kho'
    | 'bao_cao_gia_cong'
    | 'bao_cao_qc'
    | 'bao_cao_bao_tri'
    | 'hieu_suat_may'
    | 'tieu_hao_vat_lieu'
    | 'cho_duyet'
    | 'chung_loai'
    | 'kho'
    | 'may_moc'
    | 'dao_cu'
    | 'du_an'
    | 'quan_ly_nguoi_dung'
    | 'phan_quyen'
    | 'audit_log'
    | 'backup_restore'
    | 'cai_dat_he_thong'
    | 'ho_so_ca_nhan'
    | 'doi_mat_khau';

  // Route types
  type AppRoute = {
    path: string;
    element: React.ReactNode;
    protected?: boolean;
    requiredRole?: string;
    requiredModule?: PermissionModule;
    requiredLevel?: PermissionLevel;
    children?: AppRoute[];
  };

  // API Response types
  type ApiResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    statusCode?: number;
  };

  type ApiError = {
    message: string;
    code: string;
    status: number;
    details?: any;
  };

  // Toast types
  type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';
  type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

  // Theme types
  type ThemeMode = 'light' | 'dark' | 'system';
  type ThemeColor = 'blue' | 'indigo' | 'purple' | 'green' | 'red' | 'orange' | 'yellow' | 'gray';

  // Common component props
  interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
    onKeyDown?: (event: React.KeyboardEvent) => void;
  }

  interface LoadingState {
    isLoading: boolean;
    isError: boolean;
    error?: Error | null;
  }

  // Form types
  type FormStatus = 'idle' | 'loading' | 'success' | 'error';
  type FormField = 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date' | 'time' | 'datetime-local';
  
  interface FormFieldConfig {
    name: string;
    label: string;
    type: FormField;
    required?: boolean;
    placeholder?: string;
    options?: { label: string; value: string }[];
    validation?: any;
  }

  // Sidebar types
  interface SidebarItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    path?: string;
    children?: SidebarItem[];
    requiredModule?: PermissionModule;
    requiredLevel?: PermissionLevel;
    requiredRole?: string;
  }

  // Notification types
  interface Notification {
    id: string;
    title: string;
    message?: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: string;
    link?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  }

  // Table types
  interface TableColumn<T = any> {
    key: keyof T | string;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: any, row: T) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
    width?: string | number;
  }

  interface TablePagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }

  interface TableState<T = any> {
    data: T[];
    columns: TableColumn<T>[];
    pagination: TablePagination;
    loading: boolean;
    search?: string;
    sortBy?: keyof T | string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, any>;
  }

  // Chart types
  type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar';
  type ChartData = {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      fill?: boolean;
    }[];
  };
}

// React Router DOM types
declare module 'react-router-dom' {
  export interface RouteObject {
    path?: string;
    index?: boolean;
    children?: RouteObject[];
    element?: React.ReactNode;
    loader?: any;
    action?: any;
    errorElement?: React.ReactNode;
    shouldRevalidate?: any;
  }
}

// Vite types
declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}