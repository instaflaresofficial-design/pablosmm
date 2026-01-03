import './admin.css';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell">{children}</div>;
}
