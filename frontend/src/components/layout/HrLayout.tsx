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
      <div className="bg-background font-body-base text-body-base text-on-surface antialiased min-h-screen">
        {/* Sidebar */}
        <HrSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          isMobileOpen={isMobileOpen}
          onCloseMobile={closeMobile}
        />

        {/* Content column matching <div class="pl-64"> in Stitch */}
        <div className="pl-0 md:pl-64">
          <HrHeader
            isCollapsed={isCollapsed}
            onOpenMobile={openMobile}
          />
          <main className="relative pt-16 w-full min-h-screen bg-surface-container-low/40 p-gutter-desktop">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}

export default HrLayout;
