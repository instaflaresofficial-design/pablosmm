import React from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/components/providers/auth-provider";
import Image from "next/image";
import Link from "next/link";
import { Settings, Copy } from "lucide-react";

export type Order = {
  id: number;
  serviceId: string;
  displayId?: string;
  displayTitle?: string;
  serviceName?: string;
  charge: number;
  quantity: number;
  status: string;
  date: string;
  link?: string;
  startCount?: number;
  remains?: number;
  serviceType?: string;
  category?: string;
};

interface OrdersCardProps {
  orders?: Order[];
  onCancel?: (id: number) => void;
  cancellingId?: number | null;
  variant?: "list" | "single";
}

/** Build a clean title like "Instagram Followers" from the order data */
const getOrderTitle = (o: Order): string => {
  if (o.displayTitle) return o.displayTitle;

  if (o.category && o.category.trim() !== "" && o.category.toLowerCase() !== "default" && o.category.toLowerCase() !== "bestselling") {
    // Some categories might just be "views" - if so we capitalize it and maybe prefix
    if (o.category.toLowerCase() === "views" || o.category.toLowerCase() === "likes") {
       return `Instagram ${o.category.charAt(0).toUpperCase() + o.category.slice(1)}`;
    }
    return o.category;
  }

  const serviceType = o.serviceType || "";
  const serviceName = (o.serviceName || "").toLowerCase();
  const category = (o.category || "").toLowerCase();
  const haystack = `${serviceName} ${category}`;

  // Detect platform
  let platform = "";
  if (/instagram|insta|\big\b/.test(haystack)) platform = "Instagram";
  else if (/facebook|\bfb\b/.test(haystack)) platform = "Facebook";
  else if (/youtube|\byt\b/.test(haystack)) platform = "YouTube";
  else if (/tiktok|\btt\b/.test(haystack)) platform = "TikTok";
  else if (/telegram|\btg\b/.test(haystack)) platform = "Telegram";
  else if (/twitter|\bx\b/.test(haystack)) platform = "X";

  // Capitalize service type
  const typeLabel = serviceType ? serviceType.charAt(0).toUpperCase() + serviceType.slice(1) : "";

  if (platform && typeLabel) return `${platform} ${typeLabel}`;
  if (platform) return platform;
  
  // If we couldn't detect a platform but we have a service type, default to Instagram
  if (typeLabel) return `Instagram ${typeLabel}`;
  
  if (o.serviceName) {
    return o.serviceName.includes(':') ? o.serviceName.split(':').pop()! : o.serviceName;
  }
  return `Service #${o.displayId || (o.serviceId ? o.serviceId.split(':').pop() : '')}`;
};

/** Get the icon path based on service type */
const getServiceTypeIcon = (serviceType: string = ""): string => {
  const t = serviceType.toLowerCase();
  if (t === "likes") return "/orders/services/likes.png";
  if (t === "views") return "/orders/services/views.png";
  if (t === "comments") return "/orders/services/comments.png";
  if (t === "shares") return "/orders/services/share.png";
  if (t === "saves") return "/orders/services/save.png";
  return "/orders/services/followers.png"; // default
};

const OrdersCard: React.FC<OrdersCardProps> = ({ orders = [], onCancel, cancellingId, variant = "list" }) => {
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
    if (s === 'partial') return 'active';
    return s;
  }

  const getPlatformIcon = (serviceName: string = "") => {
    const name = serviceName.toLowerCase();
    if (name.includes('instagram') || name.includes('ig')) return '/orders/platforms/instagram.png';
    if (name.includes('facebook') || name.includes('fb')) return '/orders/platforms/facebook.png';
    if (name.includes('twitter') || name.includes('x ')) return '/orders/platforms/x.png';
    if (name.includes('tiktok')) return '/orders/platforms/tiktok.png';
    if (name.includes('youtube')) return '/orders/platforms/youtube.png';
    if (name.includes('telegram')) return '/orders/platforms/telegram.png';
    return '/orders/platforms/instagram.png'; 
  };

  return (
    <div className={`orders-card ${orders.length === 0 ? "empty" : ""} ${variant === 'single' ? 'single-variant' : ''}`}>
      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="no-orders">
            <Image src="/orders/no_orders.png" alt="No Orders" width={100} height={100} />
            No orders found.
          </div>
        ) : (
          orders.map((o) => {
            return (
              <div key={o.id} className={`order-card ${mapStatusForClass(o.status)}`}>
                <div className="order-card-top">
                  <div className="order-info-group">
                    <img src={getPlatformIcon(o.serviceName)} alt="Platform" className="platform-icon" />
                    <div className="order-text-col">
                      <div className="order-number">Order #{o.id}</div>
                      <h3 className="order-title">
                        {getOrderTitle(o)}
                      </h3>
                    </div>
                  </div>
                  <div className={`status-badge`}>
                    <div className={`glow ${mapStatusForClass(o.status)}`}></div>
                    <span className={mapStatusForClass(o.status)}>{renderStatus(o.status)}</span>
                  </div>
                </div>

                <div className={`order-grid ${variant === 'single' ? 'single-variant' : ''}`}>
                  <div className="order-field">
                    <div className="icon-wrapper">
                      <Image src={getServiceTypeIcon(o.serviceType)} alt={o.serviceType || "Service"} width={12} height={12} />
                    </div>
                    <div className="field-text">
                      <div className="label">Quantity</div>
                      <div className="value">{o.quantity}</div>
                    </div>
                  </div>

                  <div className="order-field">
                    <div className="icon-wrapper">
                      <Image src="/orders/amount.png" alt="Amount" width={12} height={12} />
                    </div>
                    <div className="field-text">
                      <div className="label">Amount</div>
                      <div className="value">{convertPrice(o.charge)}</div>
                    </div>
                  </div>

                  <div className="order-field">
                    <div className="icon-wrapper">
                      <Image src="/orders/calender.png" alt="Date" width={12} height={12} />
                    </div>
                    <div className="field-text">
                      <div className="label">Date</div>
                      <div className="value">
                        {o.date ? format(new Date(o.date), "d MMM yyyy") : "-"}
                      </div>
                    </div>
                  </div>

                  {variant === "single" && <div style={{ flexBasis: "100%", height: 0, margin: 0, border: 'none' }} />}

                  {variant === "single" && (
                    <>
                      <div className="order-field" style={{ paddingRight: "12px"}}>
                        <div className="icon-wrapper">
                          <Image src="/orders/service-id.png" alt="Date" width={12} height={12} />
                        </div>
                        <div className="field-text">
                          <div className="label">Service ID</div>
                          <div className="value">{o.displayId || (o.serviceId ? o.serviceId.split(':').pop() : '')}</div>
                        </div>
                      </div>

                      <div className="order-field link-field">
                        <div className="icon-wrapper">
                          <Image src="/orders/link.png" alt="Link" width={12} height={12} />
                        </div>
                        <div className="field-text link-field-text">
                          <div className="label">Link</div>
                          <div className="value link-value">
                            <span className="link-text">{o.link || "N/A"}</span>
                              {o.link && (
                              <button 
                                className="copy-btn"
                                onClick={() => navigator.clipboard.writeText(o.link!)}
                                title="Copy Link"
                              >
                                <Image src="/orders/copy.png" alt="Link" width={12} height={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {variant === "list" && (
                  <div className="order-meta-bottom">
                    <div className="link-group">
                      <Image src="/orders/link.png" alt="Link" width={12} height={12} />
                      <span className="link-text">{o.link || "N/A"}</span>
                    </div>

                    <div className="action-group">
                      {(o.status === 'pending' || o.status === 'processing') && onCancel ? (
                        <button
                          className="cancel-btn"
                          onClick={() => onCancel(o.id)}
                          disabled={cancellingId === o.id}
                        >
                          {cancellingId === o.id ? <Loader2 className="spinner" /> : "Cancel Order"}
                        </button>
                      ) : (
                        <Link href={`/orders/${o.id}`} className="view-btn">
                          View Details →
                        </Link>
                      )}
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