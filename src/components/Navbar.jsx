import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { Avatar, AvatarFallback } from './ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './ui/DropdownMenu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/Breadcrumb';

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const Navbar = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const pathnames = location.pathname.split('/').filter(Boolean);

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-background pl-4 pr-4 sm:pl-2.5 sm:pr-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenSidebar}
          className="rounded-md p-1.5 text-foreground-lighter transition-colors hover:bg-accent hover:text-foreground focus-ring-btn md:hidden"
        >
          <Menu className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Search"
          onClick={openCommandPalette}
          className="rounded-md p-1.5 text-foreground-lighter transition-colors hover:bg-accent hover:text-foreground focus-ring-btn md:hidden"
        >
          <Search className="size-5" />
        </button>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <span
                title="A-yos"
                className="flex size-7 items-center justify-center rounded-md bg-brand-500/15 font-display text-sm font-bold text-brand-700 dark:text-brand-300"
              >
                A
              </span>
            </BreadcrumbItem>
            {pathnames.map((name, index) => {
              const isLast = index === pathnames.length - 1;
              return (
                <React.Fragment key={`${name}-${index}`}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="min-w-0">
                    {isLast ? (
                      <BreadcrumbPage className="truncate">{name}</BreadcrumbPage>
                    ) : (
                      <span className="truncate capitalize text-foreground-lighter">{name}</span>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={openCommandPalette}
          className="group hidden h-[30px] cursor-pointer grow items-center justify-between rounded-full border border-strong bg-transparent pl-1.5 pr-1 text-foreground-lighter transition-colors hover:border-stronger hover:bg-popover focus-ring-btn md:flex md:min-w-32 xl:min-w-32"
        >
          <div className="flex items-center space-x-1.5 text-foreground-lighter">
            <Search
              size={16}
              strokeWidth={1.5}
              className="transition-colors group-hover:text-foreground-light"
            />
            <p className="flex pr-2 text-xs text-foreground-muted">Search...</p>
          </div>
          <span aria-hidden="true">
            <span className="inline-flex h-full items-center rounded py-[3px] pl-[5px] pr-2 text-[11px] leading-none tracking-[-0.025em] text-foreground-lighter">
              ⌘K
            </span>
          </span>
        </button>

        <DropdownMenu>

          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="rounded-full transition-opacity hover:opacity-80 focus-ring-btn"
            >
              <Avatar className="size-8 border border-border-strong bg-brand-500/10">
                <AvatarFallback className="text-xs">
                  {user?.name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="flex flex-col gap-0 px-2 py-1 text-sm">
              <span
                title={user?.name}
                className="w-full truncate text-left text-foreground"
              >
                {user?.name || 'Admin'}
              </span>
              {user?.email && (
                <span
                  title={user.email}
                  className="w-full truncate text-left text-xs text-foreground-light"
                >
                  {user.email}
                </span>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="flex cursor-pointer gap-2 [&_svg]:size-3.5">
              <Link to="/admin/profile">
                <UserCircle size={14} strokeWidth={1.5} className="text-foreground-lighter" />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value)}>
              {themeOptions.map(({ value, label }) => (
                <DropdownMenuRadioItem key={value} value={value} className="cursor-pointer">
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout} className="cursor-pointer">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Navbar;
