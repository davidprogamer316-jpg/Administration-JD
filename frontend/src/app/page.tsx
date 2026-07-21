import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';

export default function Home() {
  return (
    <AuthGuard>
      <Sidebar />
      <main className="md:ml-56 min-h-screen pt-16 md:pt-0">
        <img src="/logo.PNG" alt="Logo" className="w-full h-full object-cover" />
      </main>
    </AuthGuard>
  );
}
