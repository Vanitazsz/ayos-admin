import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import CommandPalette from '../components/CommandPalette';

const AdminLayout = () => {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      <Navbar />

      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-dash-canvas p-[21px]">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
};

export default AdminLayout;
