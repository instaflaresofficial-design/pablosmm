"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import OrdersCard, { Order } from '@/components/layout/OrdersCard';
import { getApiBaseUrl } from '@/lib/config';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import Image from 'next/image';
import { format, isToday, isYesterday, subDays, isAfter } from 'date-fns';

/** Format a date string into a human-readable date separator label */
const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isToday(date)) return `Today, ${format(date, "d MMM")}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, "d MMM")}`;
  return format(date, "d MMM yyyy");
};

/** Group orders by date (yyyy-MM-dd) preserving order */
const groupOrdersByDate = (orders: Order[]): { dateLabel: string; orders: Order[] }[] => {
  const groups: { dateKey: string; dateLabel: string; orders: Order[] }[] = [];
  const seen = new Map<string, number>();

  for (const order of orders) {
    const dateKey = order.date ? format(new Date(order.date), "yyyy-MM-dd") : "unknown";
    if (seen.has(dateKey)) {
      groups[seen.get(dateKey)!].orders.push(order);
    } else {
      seen.set(dateKey, groups.length);
      groups.push({
        dateKey,
        dateLabel: order.date ? formatDateLabel(order.date) : "Unknown Date",
        orders: [order],
      });
    }
  }

  return groups;
};

interface FilterOption {
  value: string;
  label: string;
  icon?: string;
}

// Filter option definitions
const DATE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
];

const PLATFORM_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram', icon: '/orders/platforms/instagram.png' },
  { value: 'facebook', label: 'Facebook', icon: '/orders/platforms/facebook.png' },
  { value: 'youtube', label: 'YouTube', icon: '/orders/platforms/youtube.png' },
  { value: 'tiktok', label: 'TikTok', icon: '/orders/platforms/tiktok.png' },
  { value: 'telegram', label: 'Telegram', icon: '/orders/platforms/telegram.png' },
  { value: 'x', label: 'X (Twitter)', icon: '/orders/platforms/x.png' },
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'partial', label: 'Partial' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed' },
];

type FilterType = 'date' | 'platform' | 'status' | 'all' | null;

const OrdersPage = () => {
  const { user, convertPrice } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Filter states
  const [activeDrawer, setActiveDrawer] = useState<FilterType>(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === 'all' ? '' : statusFilter;
      const res = await fetch(`${getApiBaseUrl()}/orders?status=${statusParam}`, {
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
  }, [user, statusFilter]);

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
        toast.info(`Refunded. New Balance: ${convertPrice(data.newBalance)}`);
      }
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  // Client-side filtering for date and platform
  const filteredOrders = orders.filter(o => {
    // Date filter
    if (dateFilter !== 'all' && o.date) {
      const orderDate = new Date(o.date);
      const now = new Date();
      if (dateFilter === 'today' && !isToday(orderDate)) return false;
      if (dateFilter === 'yesterday' && !isYesterday(orderDate)) return false;
      if (dateFilter === '7days' && !isAfter(orderDate, subDays(now, 7))) return false;
      if (dateFilter === '30days' && !isAfter(orderDate, subDays(now, 30))) return false;
    }

    // Platform filter
    if (platformFilter !== 'all') {
      const name = (o.serviceName || '').toLowerCase();
      const cat = (o.category || '').toLowerCase();
      const hay = `${name} ${cat}`;
      const platformMatch: Record<string, RegExp> = {
        instagram: /instagram|insta|\big\b/,
        facebook: /facebook|\bfb\b/,
        youtube: /youtube|\byt\b/,
        tiktok: /tiktok|\btt\b/,
        telegram: /telegram|\btg\b/,
        x: /twitter|\bx\b/,
      };
      if (!platformMatch[platformFilter]?.test(hay)) return false;
    }

    return true;
  });

  const dateGroups = groupOrdersByDate(filteredOrders);

  const hasActiveFilters = dateFilter !== 'all' || platformFilter !== 'all' || statusFilter !== 'all';

  const clearAllFilters = () => {
    if (!hasActiveFilters) return;
    setDateFilter('all');
    setPlatformFilter('all');
    setStatusFilter('all');
  };

  const getFilterLabel = (type: FilterType) => {
    if (type === 'date') {
      const opt = DATE_OPTIONS.find(o => o.value === dateFilter);
      return dateFilter !== 'all' ? opt?.label : 'Date';
    }
    if (type === 'platform') {
      const opt = PLATFORM_OPTIONS.find(o => o.value === platformFilter);
      return platformFilter !== 'all' ? opt?.label : 'Platform';
    }
    if (type === 'status') {
      const opt = STATUS_OPTIONS.find(o => o.value === statusFilter);
      return statusFilter !== 'all' ? opt?.label : 'Status';
    }
    return '';
  };

  const getDrawerTitle = () => {
    if (activeDrawer === 'date') return 'Filter by Date';
    if (activeDrawer === 'platform') return 'Filter by Platform';
    if (activeDrawer === 'status') return 'Filter by Status';
    if (activeDrawer === 'all') return 'All Filters';
    return '';
  };

  const getDrawerOptions = () => {
    if (activeDrawer === 'date') return DATE_OPTIONS;
    if (activeDrawer === 'platform') return PLATFORM_OPTIONS;
    if (activeDrawer === 'status') return STATUS_OPTIONS;
    return [];
  };

  const getActiveValue = (type: FilterType) => {
    if (type === 'date') return dateFilter;
    if (type === 'platform') return platformFilter;
    if (type === 'status') return statusFilter;
    return 'all';
  };

  const handleSelect = (value: string, type?: FilterType) => {
    const targetType = type || activeDrawer;
    if (targetType === 'date') setDateFilter(value);
    if (targetType === 'platform') setPlatformFilter(value);
    if (targetType === 'status') setStatusFilter(value);
    
    // Auto close for single select drawers, but keep open for 'all' drawer
    if (activeDrawer !== 'all') {
      setActiveDrawer(null);
    }
  };

  // Render the bottom drawer in a Portal to break out of .root styling constraints
  const renderFilterDrawer = () => {
    if (!mounted || !activeDrawer) return null;

    return createPortal(
      <>
        <div className="filter-overlay" onClick={() => setActiveDrawer(null)} />
        <div className="filter-drawer">
          <div className="drawer-handle" />
          <div className="drawer-header">
            <h3>{getDrawerTitle()}</h3>
          </div>

          {activeDrawer === 'all' ? (
            <div className="drawer-sections">
              {/* Date Filter Chips */}
              <div className="drawer-filter-section">
                <h4>Date</h4>
                <div className="filter-chips">
                  {DATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`filter-chip ${dateFilter === opt.value ? 'selected' : ''}`}
                      onClick={() => handleSelect(opt.value, 'date')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform Filter Chips */}
              <div className="drawer-filter-section">
                <h4>Platform</h4>
                <div className="filter-chips">
                  {PLATFORM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`filter-chip ${platformFilter === opt.value ? 'selected' : ''}`}
                      onClick={() => handleSelect(opt.value, 'platform')}
                    >
                      {opt.icon && (
                        <img src={opt.icon} alt="" className="chip-icon" />
                      )}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter Chips */}
              <div className="drawer-filter-section">
                <h4>Status</h4>
                <div className="filter-chips">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`filter-chip ${statusFilter === opt.value ? 'selected' : ''}`}
                      onClick={() => handleSelect(opt.value, 'status')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consolidated apply button */}
              <div className="drawer-footer">
                <button className="apply-btn" onClick={() => setActiveDrawer(null)}>
                  Apply Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="drawer-options">
              {getDrawerOptions().map((opt) => (
                <div
                  key={opt.value}
                  className={`drawer-option ${getActiveValue(activeDrawer) === opt.value ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <div className="option-left">
                    {opt.icon && (
                      <Image src={opt.icon} alt={opt.label} width={24} height={24} className="option-icon" />
                    )}
                    <span>{opt.label}</span>
                  </div>
                  <div className={`radio ${getActiveValue(activeDrawer) === opt.value ? 'checked' : ''}`}>
                    {getActiveValue(activeDrawer) === opt.value && <div className="radio-dot" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>,
      document.body
    );
  };

  return (
    <div className='orders-page'>
      <div className="orders-header-row">
        <h2>Order History</h2>
        <div className="filter-btn" onClick={() => setActiveDrawer('all')}>
          <img src="/filter.png" alt="Filter" />
        </div>
      </div>

      <div className="orders-filters-row">
        <div className="filters-left">
          <div
            className={`filter-item ${dateFilter !== 'all' ? 'active' : ''}`}
            onClick={() => setActiveDrawer('date')}
          >
            <Image src={"/orders/date.png"} alt="Date Filter" width={20} height={20} />
            {getFilterLabel('date')}
            <Image src={"/orders/arrow.svg"} alt="Arrow Down" width={8} height={8} />
          </div>
          <div
            className={`filter-item ${platformFilter !== 'all' ? 'active' : ''}`}
            onClick={() => setActiveDrawer('platform')}
          >
            <Image src={"/orders/platform.png"} alt="Platform Filter" width={20} height={20} />
            {getFilterLabel('platform')}
            <Image src={"/orders/arrow.svg"} alt="Arrow Down" width={8} height={8} />
          </div>
          <div
            className={`filter-item ${statusFilter !== 'all' ? 'active' : ''}`}
            onClick={() => setActiveDrawer('status')}
          >
            <Image src={"/orders/status.png"} alt="Status Filter" width={20} height={20} />
            {getFilterLabel('status')}
            <Image src={"/orders/arrow.svg"} alt="Arrow Down" width={8} height={8} />
          </div>
        </div>
        <div className={`clear-all ${hasActiveFilters ? 'enabled' : ''}`} onClick={clearAllFilters}>
          Clear All
        </div>
      </div>

      {dateGroups.map((group, idx) => (
        <div key={group.dateLabel + idx}>
          <div className="date-separator">
            {idx === 0 && <div className="separator-line"></div>}
            <span>{group.dateLabel}</span>
          </div>
          <OrdersCard orders={group.orders} onCancel={handleCancel} cancellingId={cancellingId} />
        </div>
      ))}

      {filteredOrders.length === 0 && !loading && (
        <OrdersCard orders={[]} />
      )}

      {/* Render Portal-ed Drawer */}
      {renderFilterDrawer()}
    </div>
  )
}

export default OrdersPage;