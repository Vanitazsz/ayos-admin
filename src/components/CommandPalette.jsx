import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from 'cmdk';
import {
  Home,
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
  ClipboardList,
  Trash2,
  Settings,
  MapPinned,
  Crown,
  Search,
} from 'lucide-react';

const navigation = [
  { group: 'Dashboard', items: [{ title: 'Go to Dashboard', to: '/admin/dashboard', icon: Home }] },
  {
    group: 'User Management',
    items: [
      { title: 'Manage Users', to: '/admin/users', icon: User },
      { title: 'Manage Workers', to: '/admin/workers', icon: Briefcase },
    ],
  },
  {
    group: 'Operations',
    items: [
      { title: 'View Bookings', to: '/admin/bookings', icon: Calendar },
      { title: 'Services', to: '/admin/services', icon: Wrench },
      { title: 'Payments & Revenue', to: '/admin/payments', icon: CreditCard },
    ],
  },
  {
    group: 'Community',
    items: [
      { title: 'Customer Reviews', to: '/admin/reviews', icon: Star },
      { title: 'Support Tickets', to: '/admin/support', icon: Headset },
    ],
  },
  {
    group: 'Insights',
    items: [
      { title: 'Reports', to: '/admin/reports', icon: FileBarChart },
      { title: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    group: 'Communication',
    items: [{ title: 'Notifications', to: '/admin/notifications', icon: Bell }],
  },
  {
    group: 'Administration',
    items: [
      { title: 'Audit Logs', to: '/admin/auditlogs', icon: ClipboardList },
      { title: 'Trash', to: '/admin/trash', icon: Trash2 },
      { title: 'Platform Settings', to: '/admin/settings', icon: Settings },
      { title: 'Subdivisions', to: '/admin/subdivisions', icon: MapPinned },
      { title: 'Subscriptions', to: '/admin/subscriptions', icon: Crown },
    ],
  },
];

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const openPalette = () => setIsOpen(true);
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    window.addEventListener('open-command-palette', openPalette);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('open-command-palette', openPalette);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleSelect = (to) => {
    setIsOpen(false);
    navigate(to);
  };

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      overlayClassName="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[2px]"
      contentClassName="fixed left-1/2 top-[15vh] z-[200] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border-strong bg-popover text-popover-foreground shadow-2xl"
    >
      <div className="flex items-center border-b border-border px-4">
        <Search className="mr-3 size-4 text-foreground-muted" />
        <CommandInput
          placeholder="Type a command or search..."
          className="h-12 flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
        />
        <kbd className="rounded border border-border-strong bg-surface-100 px-1.5 py-0.5 text-[10px] font-medium text-foreground-lighter">
          ESC
        </kbd>
      </div>
      <CommandList className="max-h-80 overflow-y-auto p-2 custom-scrollbar">
        <CommandEmpty className="py-12 text-center text-sm text-foreground-lighter">
          No results found.
        </CommandEmpty>
        {navigation.map(({ group, items }, index) => (
          <React.Fragment key={group}>
            <CommandGroup
              heading={group}
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-foreground-muted"
            >
              {items.map(({ title, to, icon: Icon }) => (
                <CommandItem
                  key={to}
                  value={title}
                  onSelect={() => handleSelect(to)}
                  className="flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground-light data-[selected=true]:bg-selection data-[selected=true]:text-foreground"
                >
                  <Icon className="size-4 text-foreground-muted" />
                  {title}
                </CommandItem>
              ))}
            </CommandGroup>
            {index < navigation.length - 1 && (
              <CommandSeparator className="mx-1 my-1 h-px bg-border" />
            )}
          </React.Fragment>
        ))}
      </CommandList>
      <div className="flex items-center justify-between border-t border-border bg-surface-100 px-4 py-2.5 text-xs text-foreground-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-border-strong bg-card px-1.5 py-0.5 font-sans">↑</kbd>
            <kbd className="rounded border border-border-strong bg-card px-1.5 py-0.5 font-sans">↓</kbd>
            <span>to navigate</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-border-strong bg-card px-1.5 py-0.5 font-sans">Enter</kbd>
            <span>to select</span>
          </span>
        </div>
        <span className="font-medium text-foreground-lighter">A-yos Global Search</span>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;
