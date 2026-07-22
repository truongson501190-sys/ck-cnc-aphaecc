// src/components/Sidebar.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft, 
  Menu, 
  LogOut,
  Bell,
  Search,
  Moon,
  Sun,
  HelpCircle,
  Star,
  Clock,
  X,
  Home,
  Factory,
  Package,
  LayoutDashboard,
  Layers,
  Settings,
} from 'lucide-react';
import { ERP_NAVIGATION, ERPNavItem, type ERPNavGroup } from '@/modules/erp/routes';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

// ============================================================
// CẤU HÌNH MODULES VỚI MÀU SẮC
// ============================================================
const MODULE_CONFIGS: Record<string, { icon: any; color: string; bgLight: string; borderLight: string; textLight: string; buttonBg: string; buttonHover: string }> = {
  manufacturing: {
    icon: Factory,
    color: 'orange',
    bgLight: 'bg-orange-50',
    borderLight: 'border-orange-200',
    textLight: 'text-orange-600',
    buttonBg: 'bg-orange-500',
    buttonHover: 'hover:bg-orange-600',
  },
  warehouse: {
    icon: Package,
    color: 'green',
    bgLight: 'bg-green-50',
    borderLight: 'border-green-200',
    textLight: 'text-green-600',
    buttonBg: 'bg-green-500',
    buttonHover: 'hover:bg-green-600',
  },
  reports: {
    icon: LayoutDashboard,
    color: 'indigo',
    bgLight: 'bg-indigo-50',
    borderLight: 'border-indigo-200',
    textLight: 'text-indigo-600',
    buttonBg: 'bg-indigo-500',
    buttonHover: 'hover:bg-indigo-600',
  },
  masterData: {
    icon: Layers,
    color: 'yellow',
    bgLight: 'bg-yellow-50',
    borderLight: 'border-yellow-200',
    textLight: 'text-yellow-600',
    buttonBg: 'bg-yellow-500',
    buttonHover: 'hover:bg-yellow-600',
  },
  system: {
    icon: Settings,
    color: 'gray',
    bgLight: 'bg-gray-50',
    borderLight: 'border-gray-200',
    textLight: 'text-gray-600',
    buttonBg: 'bg-gray-500',
    buttonHover: 'hover:bg-gray-600',
  },
};

// ============================================================
// COMPONENT CON: UserProfile
// ============================================================
const UserProfile: React.FC<{ user: any }> = ({ user }) => {
  const userInitials = useMemo(() => {
    if (!user) return 'U';
    const name = user.fullName || user.ho_ten || 'User';
    return name.charAt(0).toUpperCase();
  }, [user]);

  const userDisplayName = useMemo(() => {
    if (!user) return 'Người dùng';
    return user.fullName || user.ho_ten || 'Người dùng';
  }, [user]);

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-[1.01]",
        "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
        "border border-blue-100 dark:border-blue-800/30"
      )}
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:scale-105">
          {userInitials}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
          {userDisplayName}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-mono text-blue-600 dark:text-blue-400">MSNV: {user?.msnv || '---'}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="truncate">{user?.role || 'User'}</span>
        </div>
      </div>
      
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400">
        {user?.status || 'Active'}
      </Badge>
    </div>
  );
};

// ============================================================
// COMPONENT CON: SearchBar
// ============================================================
interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  
  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="relative group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
      <Input
        placeholder="Tìm kiếm menu..."
        value={query}
        onChange={handleChange}
        className="pl-9 h-9 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:border-blue-400"
      />
      {query && (
        <button
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 hover:scale-110"
          onClick={handleClear}
          aria-label="Xóa tìm kiếm"
        >
          <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  );
};

// ============================================================
// COMPONENT CON: QuickActions
// ============================================================
const QuickActions: React.FC = () => (
  <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110"
            aria-label="Bookmarks"
          >
            <Star className="w-4 h-4 text-yellow-500" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Bookmarks</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 relative"
            aria-label="Thông báo"
          >
            <Bell className="w-4 h-4 text-gray-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Thông báo</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110"
            aria-label="Lịch sử"
          >
            <Clock className="w-4 h-4 text-gray-500" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Lịch sử</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    
    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
    
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110"
            aria-label="Trợ giúp"
          >
            <HelpCircle className="w-4 h-4 text-gray-500" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Trợ giúp</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

// ============================================================
// COMPONENT CON: SidebarHeader
// ============================================================
interface SidebarHeaderProps {
  user: any;
  onSearch: (query: string) => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ 
  user, onSearch 
}) => {
  const { toggleTheme, isDark, getThemeLabel, mode } = useTheme();

  // Hàm lấy icon theme - thay thế ternary lồng nhau
  const getModeIcon = () => {
    if (mode === 'system') return '💻';
    if (mode === 'dark') return '🌙';
    return '☀️';
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-800 shrink-0 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:scale-105">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ERP/WMS
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Quản lý sản xuất & kho bãi</p>
          </div>
        </div>
        
        {/* ===== NÚT CHUYỂN THEME ===== */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-110 relative"
                aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-yellow-500 transition-all duration-500 hover:rotate-90" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500 transition-all duration-500 hover:-rotate-90" />
                )}
                <span className="absolute -bottom-1 -right-1 text-[8px] font-bold text-gray-400 dark:text-gray-500">
                  {getModeIcon()}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'} ({getThemeLabel()})
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {user && <UserProfile user={user} />}
      <SearchBar onSearch={onSearch} />
      <QuickActions />
    </div>
  );
};

// ============================================================
// COMPONENT CON: Group
// ============================================================
interface GroupProps {
  group: ERPNavGroup;
  openGroup: string | null;
  openSubMenu: string | null;
  isGroupActive: (group: ERPNavGroup) => boolean;
  isItemActive: (item: ERPNavItem) => boolean;
  onGroupClick: (group: ERPNavGroup) => void;
  onToggleGroup: (groupId: string) => void;
  onItemClick: (item: ERPNavItem) => void;
  onChildClick: (path: string) => void;
}

const Group: React.FC<GroupProps> = ({
  group,
  openGroup,
  openSubMenu,
  isGroupActive,
  isItemActive,
  onGroupClick,
  onToggleGroup,
  onItemClick,
  onChildClick,
}) => {
  if (group.id === 'main' || group.id === 'home') {
    return null;
  }

  const moduleConfig = MODULE_CONFIGS[group.id as keyof typeof MODULE_CONFIGS];
  const IconComponent = moduleConfig?.icon;

  if (group.path && !group.items) {
    const isActive = isGroupActive(group);
    const buttonClasses = isActive
      ? "bg-blue-500 text-white font-medium shadow-sm shadow-blue-500/25"
      : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:scale-[1.02] hover:shadow-sm transition-all duration-200";
    const iconClasses = isActive ? "text-white" : "text-gray-500 dark:text-gray-400";

    return (
      <div className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onGroupClick(group)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200",
                  buttonClasses
                )}
              >
                {IconComponent && <IconComponent className={cn("w-5 h-5", iconClasses)} />}
                <span className="text-sm font-semibold">{group.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {group.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  const isGroupOpen = openGroup === group.id;
  const visibleItems = group.items || [];
  
  if (visibleItems.length === 0) return null;

  const bgLight = moduleConfig?.bgLight || 'bg-gray-50';
  const textLight = moduleConfig?.textLight || 'text-gray-600';

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggleGroup(group.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-gray-50 dark:hover:bg-gray-800 hover:scale-[1.02] hover:shadow-sm",
                isGroupOpen && `${bgLight} dark:bg-gray-800/50`
              )}
              aria-expanded={isGroupOpen}
            >
              <div className="flex items-center gap-2.5">
                {IconComponent && (
                  <div className={cn(
                    "p-1.5 rounded-lg transition-all duration-200",
                    isGroupOpen ? bgLight : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <IconComponent className={cn(
                      "w-5 h-5 transition-all duration-200",
                      isGroupOpen ? textLight : "text-gray-500 dark:text-gray-400"
                    )} />
                  </div>
                )}
                <span className={cn(
                  "text-sm font-semibold transition-all duration-200",
                  isGroupOpen ? textLight : "text-gray-700 dark:text-gray-300"
                )}>
                  {group.label}
                </span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-gray-100 dark:bg-gray-800">
                  {visibleItems.length}
                </Badge>
              </div>
              {isGroupOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform duration-200" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {group.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isGroupOpen && (
        <div className="mt-1 space-y-0.5 pl-2">
          {visibleItems.map((item) => {
            const isActive = isItemActive(item);
            const isSubMenuOpen = openSubMenu === item.id;
            return (
              <MenuItem
                key={item.id}
                item={item}
                isActive={isActive}
                isSubMenuOpen={isSubMenuOpen}
                onItemClick={onItemClick}
                onChildClick={onChildClick}
                moduleColor={moduleConfig?.color}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPONENT CON: ChildMenuItem
// ============================================================
interface ChildMenuItemProps {
  child: ERPNavItem;
  isActive: boolean;
  onChildClick: (path: string) => void;
  moduleColor?: string;
}

const ChildMenuItem: React.FC<ChildMenuItemProps> = ({
  child,
  isActive,
  onChildClick,
  moduleColor = 'blue',
}) => {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-500 hover:bg-orange-600',
    green: 'bg-green-500 hover:bg-green-600',
    indigo: 'bg-indigo-500 hover:bg-indigo-600',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    gray: 'bg-gray-500 hover:bg-gray-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
  };

  const classes = isActive
    ? `${colorMap[moduleColor] || 'bg-blue-500 hover:bg-blue-600'} text-white shadow-sm shadow-blue-500/25`
    : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              if (child.path) {
                onChildClick(child.path);
              }
            }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
              classes,
              !isActive && "hover:scale-[1.02] hover:shadow-sm"
            )}
          >
            {child.icon && <child.icon className="w-3.5 h-3.5" />}
            <span>{child.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {child.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ============================================================
// COMPONENT CON: MenuItem
// ============================================================
interface MenuItemProps {
  item: ERPNavItem;
  isActive: boolean;
  isSubMenuOpen: boolean;
  onItemClick: (item: ERPNavItem) => void;
  onChildClick: (path: string) => void;
  moduleColor?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  item,
  isActive,
  isSubMenuOpen,
  onItemClick,
  onChildClick,
  moduleColor = 'blue',
}) => {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;

  const colorMap: Record<string, string> = {
    orange: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400',
    green: 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400',
    gray: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
  };

  const activeColorMap: Record<string, string> = {
    orange: 'bg-orange-500 hover:bg-orange-600',
    green: 'bg-green-500 hover:bg-green-600',
    indigo: 'bg-indigo-500 hover:bg-indigo-600',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    gray: 'bg-gray-500 hover:bg-gray-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
  };

  const getButtonClasses = () => {
    if (isActive && !hasChildren) {
      return `${activeColorMap[moduleColor] || 'bg-blue-500 hover:bg-blue-600'} text-white shadow-sm shadow-blue-500/25`;
    }
    if (isActive && hasChildren) {
      return `${colorMap[moduleColor] || 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'} font-medium`;
    }
    return "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:scale-[1.02] hover:shadow-sm transition-all duration-200";
  };

  const getIconClasses = () => {
    if (isActive && !hasChildren) {
      return "text-white";
    }
    return "text-gray-400 dark:text-gray-500";
  };

  return (
    <div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onItemClick(item)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200",
                getButtonClasses()
              )}
              aria-expanded={hasChildren ? isSubMenuOpen : undefined}
            >
              <div className="flex items-center gap-2.5">
                {item.icon && <item.icon className={cn("w-4 h-4", getIconClasses())} />}
                <span className="text-sm">{item.label}</span>
              </div>
              {hasChildren && (
                isSubMenuOpen ? 
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 transition-transform duration-200" /> : 
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 transition-transform duration-200" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {hasChildren && isSubMenuOpen && (
        <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
          {item.children?.map((child) => (
            <ChildMenuItem
              key={child.id}
              child={child}
              isActive={location.pathname === child.path}
              onChildClick={onChildClick}
              moduleColor={moduleColor}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPONENT CON: NavigationItems
// ============================================================
interface NavigationItemsProps {
  navigationItems: ERPNavGroup[];
  openGroup: string | null;
  openSubMenu: string | null;
  isGroupActive: (group: ERPNavGroup) => boolean;
  isItemActive: (item: ERPNavItem) => boolean;
  onGroupClick: (group: ERPNavGroup) => void;
  onToggleGroup: (groupId: string) => void;
  onItemClick: (item: ERPNavItem) => void;
  onChildClick: (path: string) => void;
}

const NavigationItems: React.FC<NavigationItemsProps> = ({
  navigationItems,
  openGroup,
  openSubMenu,
  isGroupActive,
  isItemActive,
  onGroupClick,
  onToggleGroup,
  onItemClick,
  onChildClick,
}) => {
  if (!navigationItems || navigationItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">Không có menu nào</p>
        <p className="text-xs mt-1">Vui lòng kiểm tra cấu hình</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {navigationItems.map((group) => (
        <Group
          key={group.id}
          group={group}
          openGroup={openGroup}
          openSubMenu={openSubMenu}
          isGroupActive={isGroupActive}
          isItemActive={isItemActive}
          onGroupClick={onGroupClick}
          onToggleGroup={onToggleGroup}
          onItemClick={onItemClick}
          onChildClick={onChildClick}
        />
      ))}
    </div>
  );
};

// ============================================================
// HOOK: useFindActiveMenu
// ============================================================
function findActiveMenu(pathname: string, group: ERPNavGroup) {
  if (group.path && group.path === pathname) {
    return { groupId: group.id, parentId: null };
  }

  if (!group.items) {
    return null;
  }

  const hasMatchingPath = group.items.some((item) => item.path === pathname);
  if (hasMatchingPath) {
    return { groupId: group.id, parentId: null };
  }

  const parentItem = group.items.find((item) => 
    item.children?.some((child) => child.path === pathname)
  );

  if (!parentItem) {
    return null;
  }

  return { groupId: group.id, parentId: parentItem.id };
}

function useFindActiveMenu(pathname: string) {
  return useMemo(() => {
    if (pathname === '/') {
      return { groupId: null, parentId: null };
    }

    const activeMenu = ERP_NAVIGATION.reduce<{ groupId: string | null; parentId: string | null } | null>(
      (match, group) => match ?? findActiveMenu(pathname, group),
      null
    );

    return activeMenu ?? { groupId: null, parentId: null };
  }, [pathname]);
}

// ============================================================
// HOOK: useFilterNavigation
// ============================================================
function matchesNavigationQuery(item: ERPNavItem, query: string) {
  const itemMatch = item.label.toLowerCase().includes(query);
  const childMatch = item.children?.some((child) => child.label.toLowerCase().includes(query)) ?? false;

  return itemMatch || childMatch;
}

function filterNavigationGroup(group: ERPNavGroup, query: string) {
  const groupMatch = group.label.toLowerCase().includes(query);

  if (group.path && groupMatch) {
    return group;
  }

  if (!group.items) {
    return null;
  }

  const filteredItems = group.items.filter((item) => matchesNavigationQuery(item, query));

  if (groupMatch || filteredItems.length > 0) {
    return { ...group, items: filteredItems };
  }

  return null;
}

function useFilterNavigation(searchQuery: string) {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      return ERP_NAVIGATION;
    }

    const query = searchQuery.toLowerCase();

    return ERP_NAVIGATION
      .map((group) => filterNavigationGroup(group, query))
      .filter((group): group is ERPNavGroup => group !== null);
  }, [searchQuery]);
}

// ============================================================
// HOOK: useToggleStates
// ============================================================
function useToggleStates() {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroup((prev) => prev === groupId ? null : groupId);
    setOpenSubMenu(null);
  }, []);

  const toggleSubMenu = useCallback((menuId: string) => {
    setOpenSubMenu((prev) => prev === menuId ? null : menuId);
  }, []);

  return { openGroup, openSubMenu, toggleGroup, toggleSubMenu };
}

// ============================================================
// HOOK: useItemActive
// ============================================================
function useItemActive(pathname: string) {
  const isItemActive = useCallback((item: ERPNavItem): boolean => {
    if (item.path === pathname) return true;
    if (item.children) {
      return item.children.some((child) => child.path === pathname);
    }
    return false;
  }, [pathname]);

  const isGroupActive = useCallback((group: ERPNavGroup): boolean => {
    return group.path === pathname;
  }, [pathname]);

  return { isItemActive, isGroupActive };
}

// ============================================================
// HOOK: useNavigationHandlers
// ============================================================
function useNavigationHandlers(toggleSubMenu: (menuId: string) => void) {
  const { user, logout } = useAuth();
  const { canView } = usePermission();
  const navigate = useNavigate();

  const handleItemClick = useCallback((item: ERPNavItem) => {
    if (item.action === 'logout') {
      logout();
      return;
    }
    if (item.children && item.children.length > 0) {
      toggleSubMenu(item.id);
    } else if (item.path) {
      navigate(item.path);
    }
  }, [navigate, toggleSubMenu, logout]);

  const handleChildClick = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const handleGroupClick = useCallback((group: ERPNavGroup) => {
    if (group.path) {
      navigate(group.path);
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleNavigateHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const getVisibleItems = useCallback((items: ERPNavItem[] | undefined): ERPNavItem[] => {
    if (!items) return [];
    return items.filter((item) => {
      if (user?.role === 'admin') return true;
      if (item.action === 'logout') return true;
      if (!item.permissionKey) return true;
      return canView(item.permissionKey);
    });
  }, [user?.role, canView]);

  return {
    handleItemClick,
    handleChildClick,
    handleGroupClick,
    handleLogout,
    handleNavigateHome,
    getVisibleItems,
  };
}

// ============================================================
// HOOK: useNavigationItems
// ============================================================
function useNavigationItems(filteredNavigation: ERPNavGroup[], getVisibleItems: (items: ERPNavItem[] | undefined) => ERPNavItem[]) {
  return useMemo(() => {
    return filteredNavigation.map((group) => {
      const visibleItems = getVisibleItems(group.items).map((item) => ({
        ...item,
        children: item.children ? getVisibleItems(item.children) : undefined,
      }));
      return { ...group, items: visibleItems };
    });
  }, [filteredNavigation, getVisibleItems]);
}

// ============================================================
// HOOK: useSidebarState
// ============================================================
function useSidebarState() {
  const { user } = useAuth();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredNavigation = useFilterNavigation(searchQuery);
  const activeMenu = useFindActiveMenu(location.pathname);
  const { openGroup, openSubMenu, toggleGroup, toggleSubMenu } = useToggleStates();
  const { isItemActive, isGroupActive } = useItemActive(location.pathname);
  const handlers = useNavigationHandlers(toggleSubMenu);
  const navigationItems = useNavigationItems(filteredNavigation, handlers.getVisibleItems);
  
  // Auto expand menu based on current path
  useEffect(() => {
    if (activeMenu.groupId) {
      toggleGroup(activeMenu.groupId);
    }
    if (activeMenu.parentId) {
      toggleSubMenu(activeMenu.parentId);
    }
  }, [activeMenu.groupId, activeMenu.parentId, toggleGroup, toggleSubMenu]);

  const isHome = location.pathname === '/' || location.pathname === '/dashboard';

  return {
    user,
    navigationItems,
    isHome,
    openGroup,
    openSubMenu,
    onSearch: setSearchQuery,
    onGroupClick: handlers.handleGroupClick,
    onToggleGroup: toggleGroup,
    onItemClick: handlers.handleItemClick,
    onChildClick: handlers.handleChildClick,
    onNavigateHome: handlers.handleNavigateHome,
    onLogout: handlers.handleLogout,
    isGroupActive,
    isItemActive,
  };
}

// ============================================================
// COMPONENT CON: SidebarContent
// ============================================================
interface SidebarContentProps {
  user: any;
  navigationItems: ERPNavGroup[];
  openGroup: string | null;
  openSubMenu: string | null;
  isGroupActive: (group: ERPNavGroup) => boolean;
  isItemActive: (item: ERPNavItem) => boolean;
  onGroupClick: (group: ERPNavGroup) => void;
  onToggleGroup: (groupId: string) => void;
  onItemClick: (item: ERPNavItem) => void;
  onChildClick: (path: string) => void;
  onNavigateHome: () => void;
  isHome: boolean;
  onSearch: (query: string) => void;
  onLogout: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  user,
  navigationItems,
  openGroup,
  openSubMenu,
  isGroupActive,
  isItemActive,
  onGroupClick,
  onToggleGroup,
  onItemClick,
  onChildClick,
  onNavigateHome,
  isHome,
  onSearch,
  onLogout,
}) => (
  <>
    <SidebarHeader user={user} onSearch={onSearch} />
    <div className="px-3 pt-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onNavigateHome}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200",
                isHome
                  ? "bg-blue-500 text-white font-medium shadow-sm shadow-blue-500/25"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:scale-[1.02] hover:shadow-sm"
              )}
            >
              <Home className={cn("w-5 h-5", isHome ? "text-white" : "text-gray-500 dark:text-gray-400")} />
              <span className="text-sm font-semibold">Trang chủ</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Về trang chủ
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <ScrollArea className="flex-1 p-3">
      <NavigationItems
        navigationItems={navigationItems}
        openGroup={openGroup}
        openSubMenu={openSubMenu}
        isGroupActive={isGroupActive}
        isItemActive={isItemActive}
        onGroupClick={onGroupClick}
        onToggleGroup={onToggleGroup}
        onItemClick={onItemClick}
        onChildClick={onChildClick}
      />
    </ScrollArea>
    <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 space-y-2">
      <button 
        onClick={onLogout} 
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
      >
        <LogOut className="w-4 h-4" /> 
        <span>Đăng xuất</span>
      </button>
      <div className="text-center text-[10px] text-gray-400 dark:text-gray-600">
        v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
      </div>
    </div>
  </>
);

// ============================================================
// COMPONENT CON: SidebarDesktop
// ============================================================
interface SidebarDesktopProps extends SidebarContentProps {
  isOpen: boolean;
}

const SidebarDesktop: React.FC<SidebarDesktopProps> = ({ isOpen, ...props }) => (
  <nav 
    className={cn(
      "hidden md:flex h-full w-64 bg-white dark:bg-gray-900 flex-col select-none",
      "border-r border-gray-200 dark:border-gray-800 shadow-lg",
      "transition-transform duration-300 ease-in-out fixed top-0 left-0 z-40",
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )}
    aria-label="Sidebar navigation"
  >
    <SidebarContent {...props} />
  </nav>
);

// ============================================================
// COMPONENT CON: SidebarMobile
// ============================================================
interface SidebarMobileProps extends SidebarContentProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SidebarMobile: React.FC<SidebarMobileProps> = ({ isOpen, setIsOpen, ...props }) => {
  if (!isOpen) return null;

  return (
    <>
      <button
        className="fixed inset-0 z-40 md:hidden bg-black/30 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        aria-label="Đóng sidebar"
      />
      <dialog 
        className="fixed top-0 left-0 z-50 h-full w-[85vw] max-w-sm bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-2xl md:hidden animate-in slide-in-from-left duration-300 m-0 p-0"
        open
        aria-label="Mobile sidebar"
      >
        <div className="absolute top-4 right-4 z-10">
          <button 
            className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
            onClick={() => setIsOpen(false)}
            aria-label="Đóng sidebar"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <SidebarContent {...props} />
      </dialog>
    </>
  );
};

// ============================================================
// COMPONENT CON: SidebarToggle
// ============================================================
interface SidebarToggleProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SidebarToggle: React.FC<SidebarToggleProps> = ({ isOpen, setIsOpen }) => (
  <>
    <Button
      onClick={() => setIsOpen(true)}
      className="fixed top-3 left-3 z-50 md:hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white h-9 px-3 rounded-xl"
      size="sm"
    >
      <Menu className="w-4 h-4 mr-1.5" />
      <span className="text-xs font-medium">Menu</span>
    </Button>

    <button
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "hidden md:flex fixed top-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm",
        "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700",
        "transition-all duration-300 ease-in-out",
        isOpen ? 'left-[238px]' : 'left-4'
      )}
      aria-label={isOpen ? 'Đóng sidebar' : 'Mở sidebar'}
    >
      {isOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
    </button>
  </>
);

// ============================================================
// MAIN SIDEBAR COMPONENT
// ============================================================
export function Sidebar({ isOpen, setIsOpen }: Readonly<SidebarProps>) {
  const state = useSidebarState();

  return (
    <>
      <SidebarToggle isOpen={isOpen} setIsOpen={setIsOpen} />
      <SidebarDesktop 
        isOpen={isOpen}
        user={state.user}
        navigationItems={state.navigationItems}
        openGroup={state.openGroup}
        openSubMenu={state.openSubMenu}
        isGroupActive={state.isGroupActive}
        isItemActive={state.isItemActive}
        onGroupClick={state.onGroupClick}
        onToggleGroup={state.onToggleGroup}
        onItemClick={state.onItemClick}
        onChildClick={state.onChildClick}
        onNavigateHome={state.onNavigateHome}
        isHome={state.isHome}
        onSearch={state.onSearch}
        onLogout={state.onLogout}
      />
      <SidebarMobile 
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        user={state.user}
        navigationItems={state.navigationItems}
        openGroup={state.openGroup}
        openSubMenu={state.openSubMenu}
        isGroupActive={state.isGroupActive}
        isItemActive={state.isItemActive}
        onGroupClick={state.onGroupClick}
        onToggleGroup={state.onToggleGroup}
        onItemClick={state.onItemClick}
        onChildClick={state.onChildClick}
        onNavigateHome={state.onNavigateHome}
        isHome={state.isHome}
        onSearch={state.onSearch}
        onLogout={state.onLogout}
      />
    </>
  );
}