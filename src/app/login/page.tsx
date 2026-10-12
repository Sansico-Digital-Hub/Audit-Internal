import Login from '@/components/Login';
import { IconLogo } from '@/components/icons';

export const metadata = { title: 'Masuk · Audit Internal' };

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-brand">
        <IconLogo size={34} />
        <div>
          <h1>Audit Internal</h1>
          <small>Process Audit Checklist · 17 area produksi + 8 unit departemen</small>
        </div>
      </div>
      <Login />
    </main>
  );
}
