"use client";

import { useEffect, useState } from 'react';
import OrdersCard, { Order } from '@/components/layout/OrdersCard';
import { getApiBaseUrl } from '@/lib/config';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/orders?status=${activeTab === 'all' ? '' : activeTab}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, activeTab]);

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this order? Funds will be refunded.")) return;

    setCancellingId(id);
    try {
      const res = await fetch(`${getApiBaseUrl()}/orders/${id}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to cancel");
      }

      const data = await res.json();
      toast.success("Order canceled successfully");
      if (data.newBalance !== undefined) {
        toast.info(`Refunded. New Balance: ₹${data.newBalance}`);
      }
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className='orders-page'>
      <div className="tabs-container">
        <h2>Order History</h2>
        <div className="tabs">
          {['all', 'active', 'completed', 'failed', 'canceled', 'refunded'].map((tab) => (
            <div
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </div>
          ))}
        </div>
      </div>

      <OrdersCard orders={orders} onCancel={handleCancel} cancellingId={cancellingId} />

    </div>
  )
}

export default OrdersPage;