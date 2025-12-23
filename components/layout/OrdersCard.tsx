import React from "react";
import Image from "next/image";

type Order = {
  id: string;
  title: string;
  quantity: number;
  price: string;
  speed: string;
  startTime: string;
  date: string;
  status: "completed" | "active" | "failed";
  progress?: number;
};

const sampleOrders: Order[] = [
  {
    id: "101",
    title: "Instagram Likes",
    quantity: 2000,
    price: "$10",
    speed: "50K/Day",
    startTime: "Instant",
    date: "6 Dec 2024",
    status: "completed",
  },
  {
    id: "102",
    title: "Telegram Members",
    quantity: 10000,
    price: "$35",
    speed: "5K/Day",
    startTime: "12 hrs",
    date: "5 Dec 2024",
    status: "active",
    progress: 60,
  },
  {
    id: "103",
    title: "Facebook Views",
    quantity: 8000,
    price: "$8",
    speed: "200K/Day",
    startTime: "8-12 hrs",
    date: "5 Dec 2024",
    status: "failed",
  },
  {
    id: "104",
    title: "Instagram Likes",
    quantity: 2000,
    price: "$10",
    speed: "50K/Day",
    startTime: "Instant",
    date: "6 Dec 2024",
    status: "completed",
  },
  {
    id: "105",
    title: "Telegram Members",
    quantity: 10000,
    price: "$35",
    speed: "5K/Day",
    startTime: "12 hrs",
    date: "5 Dec 2024",
    status: "active",
    progress: 60,
  },
  {
    id: "106",
    title: "Facebook Views",
    quantity: 8000,
    price: "$8",
    speed: "200K/Day",
    startTime: "8-12 hrs",
    date: "5 Dec 2024",
    status: "failed",
  },
];

const OrdersCard: React.FC<{ orders?: Order[] }> = ({ orders = sampleOrders }) => {
  const renderStatus = (s: Order["status"]) => {
    if (s === "completed") return "Completed";
    if (s === "active") return "Active";
    return "Failed";
  };

  return (
    <div className="orders-card">
      <div className="orders-list">
        {orders.map((o) => (
          <div key={o.id} className={`order-card ${o.status}`}>
            <div className="order-card-top">
              <div className="order-number">Order #{o.id}</div>
              <div className={`status-badge`}> <div className={`glow ${o.status}`}></div> {renderStatus(o.status)}</div>
            </div>

            <h3 className="order-title">{o.title}</h3>

            <div className="order-grid">
              <div className="order-field">
                <div className="label">Quantity</div>
                <div className="value">{o.quantity}</div>
              </div>

              <div className="order-field">
                <div className="label">Price</div>
                <div className="value">{o.price}</div>
              </div>

              <div className="order-field">
                <div className="label">Speed</div>
                <div className="value">{o.speed}</div>
              </div>
            </div>

            <div className="order-meta">
              <div className="meta-item">
                <div className="meta-label">Start Time</div>
                <div className="meta-value">{o.startTime}</div>
              </div>

              <div className="meta-item">
                <div className="meta-label">Date</div>
                <div className="meta-value">{o.date}</div>
              </div>

              <div className="meta-action">
                <button className="view-btn">View →</button>
              </div>
            </div>

            {typeof o.progress === "number" && (
              <div className="order-progress">
                <div className="sliderWrapper">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${o.progress}%` }}
                    />
                  </div>
                </div>

                <div className="progress-meta">
                  <div className="progress-label">{o.progress}%</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersCard;