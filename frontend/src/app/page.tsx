import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';

export default function Home() {
  return (
    <AuthGuard>
      <Sidebar />
      <main className="md:ml-56 px-4 sm:px-6 py-6 pt-16 md:pt-6">
        <div className="max-w-6xl mx-auto" />
      </main>
    </AuthGuard>
  );
}
