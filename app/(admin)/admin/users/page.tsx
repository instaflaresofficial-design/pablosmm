import { getServerSession } from 'next-auth/next'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import CreditButton from '@/components/admin/CreditButton'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions as any) as any;
  if (!session?.user) return <div className="admin-container">Unauthorized</div>;
  const userRole = ((session?.user as any)?.role) || 'user';
  if (userRole !== 'admin') return <div className="admin-container">Forbidden</div>;

  const users = await prisma.user.findMany({ include: { wallet: true, orders: true } });

  return (
    <div className="admin-container">
      <h2>Admin: Users & Orders</h2>
      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Wallet</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id}>
                <td>{u.name || ('u' + u.id)}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>${((u.wallet?.balance ?? 0) / 100).toFixed(2)}</td>
                <td>
                  <Link href={`/admin/users/${u.id}`}>View ({u.orders?.length ?? 0})</Link>
                </td>
                <td>
                  <CreditButton userId={u.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
