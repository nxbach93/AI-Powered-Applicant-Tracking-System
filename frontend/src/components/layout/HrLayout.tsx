'use client';

import React, { useState } from 'react';
import { RoleGuard } from '@/components/auth/role-guard';
import { HrSidebar } from '@/components/layout/HrSidebar';
import { HrHeader } from '@/components/layout/HrHeader';

interface HrLayoutProps {
  children: React.ReactNode;
}

export function HrLayout({ children }: HrLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const openMobile = () => {
    setIsMobileOpen(true);
  };

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  return (
    <RoleGuard allowedRoles={['HR', 'ADMIN']}>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
        {/* Sidebar */}
        <HrSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          isMobileOpen={isMobileOpen}
          onCloseMobile={closeMobile}
        />

        {/* Header */}
        <HrHeader
          isCollapsed={isCollapsed}
          onOpenMobile={openMobile}
        />

        {/* Main Content Workspace Canvas */}
        <main
          className={`flex-1 pt-16 transition-all duration-200 ${
            isCollapsed ? 'md:pl-[72px]' : 'md:pl-64'
          } pl-0`}
        >
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}
