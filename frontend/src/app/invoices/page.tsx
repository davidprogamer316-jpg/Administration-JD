'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import InvoiceList from '@/features/invoices/InvoiceList';

export default function InvoicesPage() {
  return (
    <AuthGuard>
      <Sidebar />
      <main className="md:ml-56 px-4 sm:px-6 py-6 pt-16 md:pt-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-heading font-semibold text-text-body mb-6">
            Facturación
          </h1>
          <InvoiceList />
        </div>
      </main>
    </AuthGuard>
  );
}
