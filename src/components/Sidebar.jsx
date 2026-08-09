import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  User,
  Briefcase,
  Calendar,
  Wrench,
  CreditCard,
  Star,
  Headset,
  FileBarChart,
  BarChart3,
  Bell,
  ShieldCheck,
  ClipboardList,
  Trash2,
  Settings,
  ChevronDown,
  Menu,
  X,
  PanelLeftDashed,
  PieChart,
  MessageSquare,
  Activity,
  Megaphone,
  MapPinned,
  Crown,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/DropdownMenu';

const ICON_SIZE = 16;
const ICON_STROKE_WIDTH = 1.5;
const FOOTER_ICON_SIZE = 14;

const SIDEBAR_BEHAVIOR_KEY = 'ayos-sidebar-behavior';

const navigationGroups = [
  { title: 'Dashboard', isLink: true, to: '/admin/dashboard', icon: Home },
  {
    title: 'User Management',
    icon: Users,
    items: [
      { name: 'Users', to: '/admin/users', icon: User },
      { name: 'Workers', to: '/admin/workers', icon: Briefcase },
    ],
  },
  {
    title: 'Operations',
    icon: Activity,
    items: [
      { name: 'Bookings', to: '/admin/bookings', icon: Calendar },
      { name: 'Services', to: '/admin/services', icon: Wrench },
      { name: 'Payments', to: '/admin/payments', icon: CreditCard },
    ],
  },
  {
    title: 'Community',
    icon: MessageSquare,
    items: [
      { name: 'Reviews', to: '/admin/reviews', icon: Star },
      { name: 'Support', to: '/admin/support', icon: Headset },
    ],
  },
  {
    title: 'Insights',
    icon: PieChart,
    items: [
      { name: 'Reports', to: '/admin/reports', icon: FileBarChart },
      { name: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Communication',
    icon: Megaphone,
    items: [{ name: 'Notifications', to: '/admin/notifications', icon: Bell }],
  },
  {
    title: 'Administration',
    icon: ShieldCheck,
    items: [
      { name: 'Audit Logs', to: '/admin/auditlogs', icon: ClipboardList },
      { name: 'Trash', to: '/admin/trash', icon: Trash2 },
      { name: 'Settings', to: '/admin/settings', icon: Settings },
      { name: 'Subdivisions', to: '/admin/subdivisions', icon: MapPinned },
      { name: 'Subscriptions', to: '/admin/subscriptions', icon: Crown },
    ],
  },
];

const itemBase = cn(
  'flex w-full items-center gap-2 overflow-hidden rounded-md py-2 px-2.5 text-left text-sm transition-colors focus-ring',
  'text-foreground-lighter hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
  'data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground'
);

const NavGroup = ({ group, effectiveCollapsed, setIsMobileOpen }) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(`sidebar_group_${group.title}`);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const location = useLocation();
  const isActiveGroup = group.items?.some((item) => location.pathname.startsWith(item.to));

  useEffect(() => {
    localStorage.setItem(`sidebar_group_${group.title}`, JSON.stringify(isExpanded));
  }, [isExpanded, group.title]);

  useEffect(() => {
    if (isActiveGroup && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isActiveGroup, isExpanded]);

  if (group.isLink) {
    const isActive = location.pathname.startsWith(group.to);
    const GroupIcon = group.icon;
    return (
      <div className="px-1.5">
        <NavLink
          to={group.to}
          onClick={() => setIsMobileOpen(false)}
          data-active={isActive}
          className={cn(itemBase, effectiveCollapsed ? 'justify-center' : '')}
          title={effectiveCollapsed ? group.title : undefined}
        >
          <GroupIcon
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE_WIDTH}
            className={cn(
              'shrink-0',
              isActive ? 'text-foreground' : 'text-foreground-muted'
            )}
          />
          {!effectiveCollapsed && <span className="truncate">{group.title}</span>}
        </NavLink>
      </div>
    );
  }

  const GroupIcon = group.icon;

  return (
    <div className="px-1.5">
      <button
        onClick={() => !effectiveCollapsed && setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md py-2 px-2.5 text-sm transition-colors focus-ring',
          'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
          isActiveGroup ? 'font-medium text-foreground' : 'text-foreground-lighter',
          effectiveCollapsed ? 'justify-center' : 'justify-between'
        )}
        title={effectiveCollapsed ? group.title : undefined}
      >
        <div className="flex min-w-0 items-center gap-2">
          <GroupIcon
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE_WIDTH}
            className={cn(
              'shrink-0',
              isActiveGroup ? 'text-foreground' : 'text-foreground-muted'
            )}
          />
          {!effectiveCollapsed && <span className="truncate">{group.title}</span>}
        </div>
        {!effectiveCollapsed && (
          <ChevronDown
            size={16}
            className={cn(
              'shrink-0 transition-transform duration-200',
              isExpanded ? 'rotate-180 text-foreground-lighter' : 'text-foreground-muted'
            )}
          />
        )}
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isExpanded && !effectiveCollapsed ? 'mt-1 max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-0.5 pb-1 pl-4 pr-0">
          {(group.items || []).map((item) => {
            const isItemActive = location.pathname.startsWith(item.to);
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={() => setIsMobileOpen(false)}
                data-active={isItemActive}
                className={cn(
                  itemBase,
                  isItemActive ? 'font-medium' : ''
                )}
              >
                <ItemIcon
                  size={16}
                  strokeWidth={ICON_STROKE_WIDTH}
                  className={cn(
                    'shrink-0',
                    isItemActive ? 'text-foreground' : 'text-foreground-muted'
                  )}
                />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [behavior, setBehavior] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_BEHAVIOR_KEY) || 'expandable';
    } catch {
      return 'expandable';
    }
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_BEHAVIOR_KEY, behavior);
  }, [behavior]);

  const effectiveCollapsed =
    behavior === 'closed' || (behavior === 'expandable' && !isHovered);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <button
          aria-label="Open navigation"
          onClick={() => setIsMobileOpen(true)}
          className={cn(
            'rounded-full bg-primary p-3.5 text-primary-foreground shadow-lg transition-transform focus-ring',
            isMobileOpen ? 'scale-0' : 'scale-100'
          )}
        >
          <Menu className="size-6" />
        </button>
      </div>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        aria-hidden="true"
        className={cn(
          'hidden shrink-0 transition-[width] duration-100 ease-linear md:block',
          behavior === 'open' ? 'md:w-52' : 'md:w-12'
        )}
      />

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'absolute inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-100 ease-linear md:z-10',
          isMobileOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0',
          effectiveCollapsed && !isMobileOpen ? 'md:w-12' : 'md:w-52'
        )}
      >
        {isMobileOpen && (
          <div className="flex h-12 shrink-0 items-center justify-end px-2">
            <button
              aria-label="Close navigation"
              onClick={() => setIsMobileOpen(false)}
              className="rounded-md p-2 text-foreground-lighter hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground focus-ring"
            >
              <X className="size-5" />
            </button>
          </div>
        )}

        <nav
          aria-label="Administrator navigation"
          className="flex-1 overflow-y-auto overflow-x-hidden pb-2 pt-2 custom-scrollbar"
        >
          {navigationGroups.map((group, index) => (
            <React.Fragment key={group.title}>
              {index > 0 && (
                <div className="mx-auto my-1 h-px w-[calc(100%-1rem)] bg-sidebar-border" />
              )}
              <NavGroup
                group={group}
                effectiveCollapsed={effectiveCollapsed && !isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
              />
            </React.Fragment>
          ))}
        </nav>

        <div className="shrink-0 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Sidebar control"
                className={cn(
                  'flex items-center gap-2 rounded-md py-2 px-2 text-left text-sm text-foreground-lighter transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                  effectiveCollapsed && !isMobileOpen ? 'w-full justify-center' : 'w-auto'
                )}
                title={effectiveCollapsed && !isMobileOpen ? 'Sidebar control' : undefined}
              >
                <PanelLeftDashed
                  size={FOOTER_ICON_SIZE}
                  strokeWidth={ICON_STROKE_WIDTH}
                  className="shrink-0 text-foreground-muted"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-40">
              <DropdownMenuLabel>Sidebar control</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={behavior}
                onValueChange={(value) => setBehavior(value)}
              >
                <DropdownMenuRadioItem value="open">Expanded</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="closed">Collapsed</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="expandable">Expand on hover</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
