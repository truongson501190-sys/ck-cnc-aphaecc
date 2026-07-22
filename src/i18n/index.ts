// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const vi = {
  translation: {
    welcome: 'Chào mừng đến với ERP/WMS',
    dashboard: 'Bảng điều khiển',
    warehouse: 'Kho bãi',
    manufacturing: 'Sản xuất',
    reports: 'Báo cáo',
    settings: 'Cài đặt',
    login: 'Đăng nhập',
    logout: 'Đăng xuất',
    search: 'Tìm kiếm',
    save: 'Lưu',
    cancel: 'Hủy',
    delete: 'Xóa',
    edit: 'Sửa',
    add: 'Thêm',
    view: 'Xem',
    loading: 'Đang tải...',
    error: 'Đã có lỗi xảy ra',
    success: 'Thành công',
    confirm: 'Xác nhận',
  },
};

const en = {
  translation: {
    welcome: 'Welcome to ERP/WMS',
    dashboard: 'Dashboard',
    warehouse: 'Warehouse',
    manufacturing: 'Manufacturing',
    reports: 'Reports',
    settings: 'Settings',
    login: 'Login',
    logout: 'Logout',
    search: 'Search',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    view: 'View',
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Success',
    confirm: 'Confirm',
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { vi, en },
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;