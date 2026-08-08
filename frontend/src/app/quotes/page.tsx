'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import QuoteList from '@/features/quotes/QuoteList';

export default function QuotesPage() {
  return (
    <AuthGuard>
      <Sidebar />
      <main className="md:ml-56 px-4 sm:px-6 py-6 pt-16 md:pt-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-heading font-semibold text-text-body mb-6">
            Cotizaciones
          </h1>
          <QuoteList />
        </div>
      </main>
    </AuthGuard>
  );
}
