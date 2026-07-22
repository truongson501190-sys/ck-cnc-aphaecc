// src/pages/Index.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DailyNews } from '@/components/DailyNews';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  Factory,
  LayoutDashboard,
  Layers,
  Settings,
  Menu,
  X,
  Search,
  Star,
  Clock,
  ChevronUp,
  ChevronDown,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import OCRUploadButton from '@/features/ocr/components/OCRUploadButton';
import { ParsedReportData } from '@/features/ocr/services/ocrService';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ERP_ROUTE } from '@/modules/erp/routes';

const FEATURE_GROUPS = {
  manufacturing: {
    label: 'Sản xuất',
    icon: Factory,
    color: 'orange',
    bgLight: 'bg-orange-50',
    borderLight: 'border-orange-200',
    textLight: 'text-orange-600',
    buttonBg: 'bg-orange-500',
    buttonHover: 'hover:bg-orange-600',
    features: [
      { key: 'ke_hoach_san_xuat', label: 'Kế hoạch sản xuất', route: ERP_ROUTE.manufacturing.plan },
      { key: 'nhat_ky_gia_cong', label: 'Nhật ký gia công', route: ERP_ROUTE.manufacturing.machiningLog },
      { key: 'nhat_ky_qc', label: 'Nhật ký QC', route: ERP_ROUTE.manufacturing.qcLog },
      { key: 'nhat_ky_bao_tri', label: 'Nhật ký bảo trì', route: ERP_ROUTE.manufacturing.maintenanceLog },
      { key: 'theo_doi_tien_do', label: 'Theo dõi tiến độ', route: ERP_ROUTE.manufacturing.progress },
    ]
  },
  warehouse: {
    label: 'Kho bãi',
    icon: Package,
    color: 'green',
    bgLight: 'bg-green-50',
    borderLight: 'border-green-200',
    textLight: 'text-green-600',
    buttonBg: 'bg-green-500',
    buttonHover: 'hover:bg-green-600',
    features: [
      { key: 'nhap_kho', label: 'Nhập kho', route: ERP_ROUTE.warehouse.import },
      { key: 'xuat_kho', label: 'Xuất kho', route: ERP_ROUTE.warehouse.export },
      { key: 'chuyen_kho', label: 'Chuyển kho', route: ERP_ROUTE.warehouse.transfer },
      { key: 'xuat_dau', label: 'Xuất dầu', route: ERP_ROUTE.warehouse.oil },
      { key: 'kiem_ke_kho', label: 'Kiểm kê kho', route: ERP_ROUTE.warehouse.inventoryCount },
      { key: 'ton_kho', label: 'Tồn kho', route: ERP_ROUTE.reports.inventory },
      { key: 'the_kho', label: 'Thẻ kho', route: ERP_ROUTE.warehouse.stockCard },
      { key: 'lich_su_giao_dich', label: 'Lịch sử giao dịch', route: ERP_ROUTE.warehouse.transactionHistory },
    ]
  },
  reports: {
    label: 'Báo cáo',
    icon: LayoutDashboard,
    color: 'indigo',
    bgLight: 'bg-indigo-50',
    borderLight: 'border-indigo-200',
    textLight: 'text-indigo-600',
    buttonBg: 'bg-indigo-500',
    buttonHover: 'hover:bg-indigo-600',
    features: [
      { key: 'dashboard_tong_hop', label: 'Dashboard tổng hợp', route: ERP_ROUTE.reports.summary },
      { key: 'bao_cao_kho', label: 'Báo cáo kho', route: ERP_ROUTE.reports.warehouse },
      { key: 'bao_cao_gia_cong', label: 'Báo cáo gia công', route: ERP_ROUTE.reports.machining.production },
      { key: 'bao_cao_qc', label: 'Báo cáo QC', route: ERP_ROUTE.reports.qc },
      { key: 'bao_cao_bao_tri', label: 'Báo cáo bảo trì', route: ERP_ROUTE.reports.maintenance },
      { key: 'hieu_suat_may', label: 'Hiệu suất máy', route: ERP_ROUTE.reports.machinePerformance },
      { key: 'cho_duyet', label: 'Chờ duyệt', route: ERP_ROUTE.reports.pendingApproval },
    ]
  },
  masterData: {
    label: 'Danh mục',
    icon: Layers,
    color: 'yellow',
    bgLight: 'bg-yellow-50',
    borderLight: 'border-yellow-200',
    textLight: 'text-yellow-600',
    buttonBg: 'bg-yellow-500',
    buttonHover: 'hover:bg-yellow-600',
    features: [
      { key: 'chung_loai', label: 'Chủng loại', route: ERP_ROUTE.masterData.categories },
      { key: 'kho', label: 'Kho', route: ERP_ROUTE.masterData.locations },
      { key: 'may_moc', label: 'Máy móc', route: ERP_ROUTE.masterData.machines },
      { key: 'du_an', label: 'Dự án', route: ERP_ROUTE.masterData.projects },
    ]
  },
  system: {
    label: 'Hệ thống',
    icon: Settings,
    color: 'gray',
    bgLight: 'bg-gray-50',
    borderLight: 'border-gray-200',
    textLight: 'text-gray-600',
    buttonBg: 'bg-gray-500',
    buttonHover: 'hover:bg-gray-600',
    features: [
      { key: 'quan_ly_nguoi_dung', label: 'Quản lý người dùng', route: ERP_ROUTE.system.users },
      { key: 'phan_quyen', label: 'Phân quyền', route: ERP_ROUTE.system.roles },
      { key: 'audit_log', label: 'Audit Log', route: ERP_ROUTE.system.auditLog },
      { key: 'backup_restore', label: 'Backup & Restore', route: ERP_ROUTE.system.backupRestore },
      { key: 'cai_dat_he_thong', label: 'Cài đặt hệ thống', route: ERP_ROUTE.system.settings },
    ]
  },
};

const BookmarkButton = React.memo(({ feature, isBookmarked, onToggle }: any) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`
              absolute top-0.5 right-0.5 h-5 w-5 p-0 
              transition-all duration-200 hover:scale-110
              ${isBookmarked ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}
            `}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(feature.key);
            }}
          >
            <Star size={12} fill={isBookmarked ? 'currentColor' : 'none'} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {isBookmarked ? 'Xóa bookmark' : 'Thêm bookmark'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

BookmarkButton.displayName = 'BookmarkButton';

const ModuleCard = React.memo(({ group, features, navigate, toggleBookmark, bookmarks }: any) => {
  const IconComponent = group.icon;

  return (
    <Card className={`
      border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden
      ${group.bgLight} dark:bg-gray-800/50
      hover:scale-[1.01] hover:-translate-y-0.5
    `}>
      <div className={`
        py-3 sm:py-4 px-4 sm:px-6
        ${group.bgLight} dark:bg-gray-800/80
        border-b ${group.borderLight} dark:border-gray-700
        backdrop-blur-sm
      `}>
        <div className={`flex items-center gap-2 ${group.textLight} dark:text-${group.color}-400 text-sm sm:text-base font-semibold`}>
          <div className={`p-1.5 rounded-lg ${group.bgLight} dark:bg-gray-700/50`}>
            <IconComponent size={18} className="sm:w-5 sm:h-5" />
          </div>
          <span className="truncate">{group.label}</span>
          <span className={`
            ml-auto text-[10px] sm:text-xs px-2 py-0.5 h-5 rounded-full
            ${group.bgLight} dark:bg-gray-700 
            ${group.textLight} dark:text-${group.color}-400
            border-0
          `}>
            {features.length}
          </span>
        </div>
      </div>
      <div className="p-3 sm:p-4 bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm">
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
          {features.map((feature: any) => {
            const isBookmarked = bookmarks.includes(feature.key);
            return (
              <div key={feature.key} className="relative group">
                <Button
                  className={`
                    ${group.buttonBg} ${group.buttonHover}
                    text-white text-[10px] xs:text-xs
                    h-auto min-h-[40px] sm:min-h-[44px]
                    py-2 sm:py-2.5
                    px-3 sm:px-4
                    whitespace-normal text-left
                    shadow-sm hover:shadow-lg
                    w-full relative
                    active:scale-[0.97]
                    touch-manipulation
                    pr-7
                    rounded-lg
                    transition-all duration-200
                    hover:brightness-110
                  `}
                  onClick={() => navigate(feature.route)}
                >
                  <span className="block truncate leading-tight font-medium">
                    {feature.label}
                  </span>
                </Button>
                <BookmarkButton
                  feature={feature}
                  isBookmarked={isBookmarked}
                  onToggle={toggleBookmark}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
});

ModuleCard.displayName = 'ModuleCard';

const SearchModal = React.memo(({ 
  isOpen, 
  onOpenChange, 
  searchTerm, 
  setSearchTerm, 
  navigate,
  features 
}: any) => {
  const filteredFeatures = features.filter((f: any) =>
    f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.key.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const hasSearchTerm = Boolean(searchTerm);
  const hasSearchResults = filteredFeatures.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">Tìm kiếm ứng dụng</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Nhập tên ứng dụng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="mt-2 max-h-[300px] overflow-y-auto">
            {!hasSearchTerm && (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">💡</div>
                <p className="text-sm text-gray-500">Nhập từ khóa để tìm kiếm</p>
              </div>
            )}
            {hasSearchTerm && !hasSearchResults && (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm text-gray-500">Không tìm thấy ứng dụng</p>
              </div>
            )}
            {hasSearchResults && (
              <div className="space-y-1">
                {filteredFeatures.map((f: any) => (
                  <Button
                    key={f.key}
                    variant="ghost"
                    className="w-full justify-start text-sm h-auto py-2 px-3"
                    onClick={() => {
                      navigate(f.route);
                      onOpenChange(false);
                      setSearchTerm('');
                    }}
                  >
                    <span className="truncate">{f.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

SearchModal.displayName = 'SearchModal';

export default function Index() {
  const { user, getUserDisplayName } = useAuth();
  const { canView } = usePermission();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return document.documentElement.classList.contains('dark');
  });

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('erp_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ✅ State để lưu dữ liệu OCR tạm thời
  const [pendingOcrData, setPendingOcrData] = useState<{
    ocrData: any;
    rawText: string;
    confidence: number;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    window.localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      toast({
        title: next ? '🌙 Chế độ tối' : '🌞 Chế độ sáng',
        description: next ? 'Đã chuyển sang chế độ tối' : 'Đã chuyển sang chế độ sáng',
        duration: 1500,
      });
      return next;
    });
  }, [toast]);

  useEffect(() => {
    localStorage.setItem('erp_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const hasPermission = useCallback((key: string) => {
    try {
      return canView(key);
    } catch {
      return true;
    }
  }, [canView]);

  const toggleBookmark = useCallback((key: string) => {
    setBookmarks(prev => {
      const newBookmarks = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key];
      
      toast({
        title: prev.includes(key) ? 'Đã xóa bookmark' : 'Đã thêm bookmark',
        description: prev.includes(key) ? 'Ứng dụng đã được gỡ khỏi danh sách yêu thích' : 'Ứng dụng đã được thêm vào danh sách yêu thích',
        duration: 2000,
      });
      
      return newBookmarks;
    });
  }, [toast]);

  // ✅ Xử lý khi nhận dữ liệu OCR - KHÔNG navigate
  const handleOCRData = useCallback((data: ParsedReportData) => {
    console.log('📊 Nhận dữ liệu OCR:', data);
    
    setPendingOcrData({
      ocrData: data.fields,
      rawText: data.raw_text,
      confidence: data.confidence
    });
    
    toast({
      title: '✅ Đã đọc xong!',
      description: `Nhận được ${data.raw_text?.length || 0} ký tự. Nhấn "Chuyển vào form" để tiếp tục.`,
      duration: 5000,
    });
  }, [toast]);

  // ✅ Chuyển dữ liệu vào module khi user click
  const handleNavigateToModule = useCallback(() => {
    if (pendingOcrData) {
      navigate(ERP_ROUTE.manufacturing.machiningLog, { 
        state: { 
          ocrData: pendingOcrData.ocrData,
          rawText: pendingOcrData.rawText,
          confidence: pendingOcrData.confidence
        } 
      });
      setPendingOcrData(null);
    }
  }, [pendingOcrData, navigate]);

  const filterFeatures = useCallback((features: any[]) => {
    if (!searchTerm) return features;
    return features.filter(f =>
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.key.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const allFeatures = useMemo(() => {
    return Object.values(FEATURE_GROUPS).flatMap((g: any) => g.features);
  }, []);

  const filteredGroups = useMemo(() => {
    return Object.entries(FEATURE_GROUPS).filter(([key, group]: [string, any]) => {
      const visibleFeatures = filterFeatures(
        group.features.filter((f: any) => hasPermission(f.key))
      );
      return visibleFeatures.length > 0;
    });
  }, [filterFeatures, hasPermission]);

  const bookmarkedFeatures = useMemo(() => {
    return Object.values(FEATURE_GROUPS)
      .flatMap((g: any) => g.features)
      .filter((f: any) => bookmarks.includes(f.key) && hasPermission(f.key));
  }, [bookmarks, hasPermission]);

  const hasNoResults = useMemo(() => {
    return filteredGroups.length === 0 && searchTerm.length > 0;
  }, [filteredGroups, searchTerm]);

  const formattedDate = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('vi-VN');

  const getGreeting = useCallback(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return { icon: '🌅', text: 'Chào buổi sáng' };
    if (hour < 18) return { icon: '☀️', text: 'Chào buổi chiều' };
    return { icon: '🌙', text: 'Chào buổi tối' };
  }, [currentTime]);

  const greeting = getGreeting();
  const userDisplayName = getUserDisplayName();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">Vui lòng đăng nhập</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Bạn cần đăng nhập để truy cập hệ thống</p>
          <Button onClick={() => navigate('/login')} className="px-8">
            Đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300`}>
      <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 max-w-7xl mx-auto">

        {/* ===== HEADER ===== */}
        <header className="flex items-center justify-between gap-2 mb-3 sm:mb-4 md:mb-6 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                  <Menu size={20} className="text-blue-600 dark:text-blue-400" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[350px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                      E
                    </div>
                    <span>ERP/WMS</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <div className="space-y-4">
                    {Object.entries(FEATURE_GROUPS).map(([key, group]: [string, any]) => {
                      const visibleFeatures = group.features.filter((f: any) => hasPermission(f.key));
                      if (visibleFeatures.length === 0) return null;
                      const Icon = group.icon;
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                            <Icon size={16} />
                            <span>{group.label}</span>
                          </div>
                          <div className="space-y-1 pl-6">
                            {visibleFeatures.map((f: any) => (
                              <Button
                                key={f.key}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-auto py-1.5 px-2"
                                onClick={() => {
                                  navigate(f.route);
                                  setIsMobileMenuOpen(false);
                                }}
                              >
                                {f.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/25 hover:scale-105 transition-transform duration-200">
                <span className="hidden xs:inline">ERP</span>
                <span className="xs:hidden">E</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ERP/WMS
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Quản lý sản xuất & kho bãi
                </p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Search size={18} />
              </div>
              <Input
                placeholder="🔍 Tìm kiếm ứng dụng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={16} className="text-gray-400" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search size={18} className="text-blue-600 dark:text-blue-400" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-yellow-50 dark:hover:bg-gray-700 rounded-full relative transition-all duration-200"
              onClick={toggleTheme}
              aria-label={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {isDarkMode ? (
                <Sun 
                  size={20} 
                  className="text-yellow-500 transition-all duration-500 hover:scale-110 hover:rotate-90" 
                />
              ) : (
                <Moon 
                  size={20} 
                  className="text-indigo-500 transition-all duration-500 hover:scale-110 hover:-rotate-90" 
                />
              )}
            </Button>

            {bookmarkedFeatures.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-full"
                onClick={() => {
                  const el = document.getElementById('bookmarks-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Star size={18} className="text-yellow-500 fill-yellow-500/20" />
                <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg">
                  {bookmarkedFeatures.length}
                </span>
              </Button>
            )}
          </div>
        </header>

        {/* ===== WELCOME BANNER ===== */}
        <div className="mb-4 md:mb-6 p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/25 text-white">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span>{greeting.icon}</span>
                {greeting.text}, {userDisplayName.split(' ').pop() || userDisplayName}! 👋
              </h2>
              <p className="text-blue-100 text-sm mt-1 hidden sm:block">
                Hôm nay là {formattedDate}. Chúc bạn một ngày làm việc hiệu quả! 🚀
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
              <Clock size={20} className="text-blue-200" />
              <span className="font-mono font-bold text-lg">{formattedTime}</span>
            </div>
          </div>
        </div>

        {/* ===== SEARCH MODAL ===== */}
        <SearchModal
          isOpen={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          navigate={navigate}
          features={allFeatures}
        />

        {/* ===== OCR SECTION ===== */}
        <div className="mb-3 sm:mb-4 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">📷 Đọc dữ liệu báo cáo</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tải lên ảnh/PDF để trích xuất nội dung và chuyển vào module tương ứng</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OCRUploadButton
                onParsedData={handleOCRData}
                autoFillForm={false}
                buttonText="📷 Đọc báo cáo"
                variant="outline"
              />
              
              {/* ✅ Nút "Chuyển vào form" - chỉ hiển thị khi có dữ liệu OCR */}
              {pendingOcrData && (
                <Button
                  onClick={handleNavigateToModule}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  📝 Chuyển vào form ({pendingOcrData.rawText?.length || 0} ký tự)
                </Button>
              )}
            </div>
          </div>

          {/* ✅ Hiển thị preview dữ liệu OCR đã đọc (tùy chọn) */}
          {pendingOcrData && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  ✅ Đã đọc xong! {pendingOcrData.rawText?.length || 0} ký tự
                </span>
                <button
                  onClick={() => setPendingOcrData(null)}
                  className="text-xs text-gray-500 hover:text-red-500"
                >
                  ✕ Bỏ qua
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {pendingOcrData.rawText?.substring(0, 200)}...
              </div>
            </div>
          )}
        </div>

        {/* ===== BOOKMARKS SECTION ===== */}
        {bookmarkedFeatures.length > 0 && (
          <div id="bookmarks-section" className="mb-3 sm:mb-4 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg px-3"
                onClick={() => setShowBookmarks(!showBookmarks)}
              >
                <Star size={16} className="text-yellow-500 mr-2 fill-yellow-500/20" />
                <span>Bookmarks ({bookmarkedFeatures.length})</span>
                {showBookmarks ? <ChevronUp size={16} className="ml-2" /> : <ChevronDown size={16} className="ml-2" />}
              </Button>
            </div>
            {showBookmarks && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mt-2 scrollbar-thin">
                {bookmarkedFeatures.map((f: any) => (
                  <Button
                    key={f.key}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-3 whitespace-nowrap flex-shrink-0 border-gray-200 dark:border-gray-600 hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-all duration-200"
                    onClick={() => navigate(f.route)}
                  >
                    <Star size={12} className="text-yellow-500 mr-1.5 fill-yellow-500/20" />
                    {f.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== MAIN CONTENT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
          <div className="lg:col-span-8 space-y-3 sm:space-y-4 md:space-y-5">
            {hasNoResults ? (
              <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-5xl mb-3">🔍</div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-600 dark:text-gray-400">
                  Không tìm thấy ứng dụng
                </h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Không có ứng dụng nào phù hợp với từ khóa "{searchTerm}"
                </p>
                <Button
                  variant="outline"
                  className="mt-3 text-sm"
                  onClick={() => setSearchTerm('')}
                >
                  Xóa tìm kiếm
                </Button>
              </div>
            ) : (
              filteredGroups.map(([key, group]: [string, any]) => {
                const visibleFeatures = filterFeatures(
                  group.features.filter((f: any) => hasPermission(f.key))
                );
                if (visibleFeatures.length === 0) return null;

                return (
                  <ModuleCard
                    key={key}
                    group={group}
                    features={visibleFeatures}
                    navigate={navigate}
                    toggleBookmark={toggleBookmark}
                    bookmarks={bookmarks}
                  />
                );
              })
            )}
          </div>

          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-4 md:top-6 space-y-4">
              <DailyNews />
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Tổng ứng dụng</span>
                      <span className="font-semibold">
                        {allFeatures.filter((f: any) => hasPermission(f.key)).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Đã bookmark</span>
                      <span className="font-semibold text-yellow-500">{bookmarkedFeatures.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Đang online</span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="font-semibold">1</span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* ===== MOBILE FAB ===== */}
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 md:hidden z-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-11 w-11 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => navigate(ERP_ROUTE.dashboard)}
                >
                  <LayoutDashboard size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Dashboard</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-11 w-11 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => navigate(ERP_ROUTE.warehouse.import)}
                >
                  <Package size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Nhập kho</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="mt-6 sm:mt-8 md:mt-10 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <span>© {new Date().getFullYear()}</span>
              <span className="hidden xs:inline">ERP/WMS CK-CNC</span>
              <span className="hidden sm:inline">- Hệ thống quản lý sản xuất và kho bãi</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{greeting.icon} {greeting.text}</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formattedTime}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}