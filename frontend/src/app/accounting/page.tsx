'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import AccountingList from '@/features/accounting/AccountingList';

export default function AccountingPage() {
  return (
    <AuthGuard>
      <Sidebar />
      <main className="md:ml-56 px-4 sm:px-6 py-6 pt-16 md:pt-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-heading font-semibold text-text-body mb-6">
            Contabilidad Quincenal
          </h1>
          <AccountingList />
        </div>
      </main>
    </AuthGuard>
  );
}
