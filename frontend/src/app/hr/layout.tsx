import React from 'react';
import { HrLayout } from '@/components/layout/HrLayout';

export default function HrAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HrLayout>{children}</HrLayout>;
}
