import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';

export default function Home() {
  return (
    <AuthGuard>
      <Sidebar />
      <main className="md:ml-56 flex items-center justify-center min-h-screen pt-16 md:pt-6">
        <img src="/logo.PNG" alt="Logo" className="w-64 h-auto opacity-80" />
      </main>
    </AuthGuard>
  );
}
