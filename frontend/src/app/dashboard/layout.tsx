import React from 'react';
import { HrLayout } from '@/components/layout/HrLayout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HrLayout>{children}</HrLayout>;
}
