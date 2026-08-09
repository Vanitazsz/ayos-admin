import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import CommandPalette from '../components/CommandPalette';

const AdminLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      <Navbar onOpenSidebar={() => setIsMobileOpen(true)} />

      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-dash-canvas p-4 sm:p-[21px]">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
};

export default AdminLayout;
