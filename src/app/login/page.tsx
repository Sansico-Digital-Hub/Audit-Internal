import Login from '@/components/Login';
import { IconLogo } from '@/components/icons';

export const metadata = { title: 'Masuk · Audit Internal' };
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const sp = await searchParams;
  return (
    <main className="login-page">
      <div className="login-brand">
        <IconLogo size={34} />
        <div>
          <h1>Audit Internal</h1>
          <small>Process Audit Checklist · 17 area produksi + 8 unit departemen</small>
        </div>
      </div>
      <Login initialExpired={sp.expired === '1'} />
    </main>
  );
}
