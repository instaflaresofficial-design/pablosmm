import React from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/components/providers/auth-provider";

export type Order = {
  id: number;
  serviceId: string;
  displayId?: string;
  serviceName?: string;
  charge: number;
  quantity: number;
  status: string;
  date: string;
  link?: string;
  startCount?: number;
  remains?: number;
};

interface OrdersCardProps {
  orders?: Order[];
  onCancel?: (id: number) => void;
  cancellingId?: number | null;
}

const OrdersCard: React.FC<OrdersCardProps> = ({ orders = [], onCancel, cancellingId }) => {
  const { convertPrice } = useAuth();
  const renderStatus = (s: string) => {
    switch (s) {
      case "completed": return "Completed";
      case "active": return "Active";
      case "pending": return "Pending";
      case "processing": return "Processing";
      case "canceled": return "Canceled";
      case "refunded": return "Refunded";
      case "failed": return "Failed";
      case "partial": return "Partial";
      default: return s;
    }
  };

  const mapStatusForClass = (s: string) => {
    if (s === 'canceled') return 'failed';
    if (s === 'refunded') return 'failed';
    if (s === 'processing') return 'active';
    if (s === 'pending') return 'active';
    if (s === 'submitted') return 'active';
    if (s === 'partial') return 'active'; // Give it the active color glow
    return s;
  }

  return (
    <div className="orders-card">
      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No orders found.</div>
        ) : (
          orders.map((o) => {
            const isFresh = (o.status === 'active' || o.status === 'pending' || o.status === 'processing' || o.status === 'submitted') && (o.remains === undefined || o.remains === 0);
            const displayRemains = isFresh ? o.quantity : (o.remains ?? 0);

            let progressPercent = 0;
            if (o.status === 'completed') {
              progressPercent = 100;
            } else if (o.quantity > 0) {
              const used = o.quantity - displayRemains;
              progressPercent = Math.max(0, Math.min(100, (used / o.quantity) * 100));
            }

            return (
              <div key={o.id} className={`order-card ${mapStatusForClass(o.status)}`}>
                <div className="order-card-top">
                  <div className="order-number">Order #{o.id}</div>
                  <div className={`status-badge`}>
                    <div className={`glow ${mapStatusForClass(o.status)}`}></div>
                    {renderStatus(o.status)}
                  </div>
                </div>

                <h3 className="order-title">
                  {o.serviceName ? (
                    <span>{o.serviceName} <span className="text-xs text-muted-foreground font-mono">#{o.displayId || o.serviceId.split(':').pop()}</span></span>
                  ) : (
                    <span>Service #{o.displayId || o.serviceId.split(':').pop()}</span>
                  )}
                </h3>

                <div className="order-grid">
                  <div className="order-field">
                    <div className="label">Quantity</div>
                    <div className="value">{o.quantity}</div>
                  </div>

                  <div className="order-field">
                    <div className="label">Price</div>
                    <div className="value">{convertPrice(o.charge)}</div>
                  </div>

                  <div className="order-field">
                    <div className="label">Link</div>
                    <div className="value truncate max-w-[100px] text-xs">
                      {o.link ? (
                        <a href={o.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                          Link
                        </a>
                      ) : "-"}
                    </div>
                  </div>
                </div>

                <div className="order-meta">
                  <div className="meta-item">
                    <div className="meta-label">Remains</div>
                    <div className="meta-value">{displayRemains}</div>
                  </div>

                  <div className="meta-item">
                    <div className="meta-label">Date</div>
                    <div className="meta-value">
                      {o.date ? format(new Date(o.date), "d MMM yyyy") : "-"}
                    </div>
                  </div>

                  <div className="meta-action">
                    {(o.status === 'pending' || o.status === 'processing') && onCancel ? (
                      <button
                        className="view-btn bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        onClick={() => onCancel(o.id)}
                        disabled={cancellingId === o.id}
                      >
                        {cancellingId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel"}
                      </button>
                    ) : (
                      <button className="view-btn">View →</button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {(o.status === 'active' || o.status === 'processing' || o.status === 'partial') && (
                  <div className="order-progress">
                    <div className="sliderWrapper">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${progressPercent}%`
                          }}
                        ></div>
                      </div>
                      <div className="progress-meta"><div className="progress-label">{progressPercent.toFixed(0)}%</div></div> {/* Show the remaining count */}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrdersCard;