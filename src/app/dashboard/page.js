"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';
import { formatCurrency, formatNumber, formatDate, formatDateTime } from '@/lib/formatters';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  BarChart2,
} from 'lucide-react';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('30d'); // 'today' | '7d' | '30d' | 'this_month'
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch orders, order_items, and products
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        if (isSupabaseConfigured()) {
          // Fetch orders
          const { data: ords } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

          // Fetch order_items (to calculate true cost & profit!)
          const { data: items } = await supabase
            .from('order_items')
            .select('*');

          // Fetch products (for low stock alerts)
          const { data: prods } = await supabase
            .from('products')
            .select('*');

          if (ords) setOrders(ords);
          if (items) setOrderItems(items);
          if (prods) setProducts(prods);
        } else {
          // Local storage fallback
          const localOrders = JSON.parse(localStorage.getItem('nongkame_local_orders') || '[]');
          const localProds = JSON.parse(localStorage.getItem('nongkame_local_products') || '[]');
          setOrders(localOrders);
          setProducts(localProds);

          // Extract items from local orders
          const items = [];
          localOrders.forEach((o) => {
            (o.items || []).forEach((item) => {
              items.push({
                ...item,
                order_id: o.id,
                created_at: o.created_at,
              });
            });
          });
          setOrderItems(items);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Filter orders by selected date range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      const orderDate = new Date(o.created_at);
      if (dateRange === 'today') {
        return orderDate.toDateString() === now.toDateString();
      } else if (dateRange === '7d') {
        const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      } else if (dateRange === '30d') {
        const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      } else if (dateRange === 'this_month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [orders, dateRange]);

  const filteredOrderIds = useMemo(() => {
    return new Set(filteredOrders.map((o) => o.id));
  }, [filteredOrders]);

  const filteredItems = useMemo(() => {
    return orderItems.filter((item) => filteredOrderIds.has(item.order_id));
  }, [orderItems, filteredOrderIds]);

  // Overall Financial Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    // Today's orders
    const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === todayStr);
    const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // This Month's orders
    const monthOrders = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthSales = monthOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Filtered Period metrics
    const totalSales = filteredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const totalOrdersCount = filteredOrders.length;
    const totalItemsSold = filteredItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

    // Cost & Profit calculation:
    // Profit = Sales - Cost of items sold in those orders
    const totalCost = filteredItems.reduce((sum, i) => {
      const cost = Number(i.cost_price || 0);
      const qty = Number(i.quantity || 0);
      return sum + cost * qty;
    }, 0);

    const totalProfit = Math.max(0, totalSales - totalCost);
    const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : '0';

    return {
      todaySales,
      monthSales,
      totalSales,
      totalOrdersCount,
      totalItemsSold,
      totalCost,
      totalProfit,
      profitMargin,
    };
  }, [orders, filteredOrders, filteredItems]);

  // Top Selling Products in Period
  const topProducts = useMemo(() => {
    const map = {};
    filteredItems.forEach((item) => {
      const name = item.product_name || 'Item';
      if (!map[name]) {
        map[name] = { name, quantity: 0, revenue: 0, cost: 0, profit: 0 };
      }
      const qty = Number(item.quantity || 0);
      const rev = Number(item.subtotal || item.unit_price * qty || 0);
      const c = Number(item.cost_price || 0) * qty;
      map[name].quantity += qty;
      map[name].revenue += rev;
      map[name].cost += c;
      map[name].profit += rev - c;
    });

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredItems]);

  // Low Stock & Out of Stock Alerts
  const lowStockProducts = useMemo(() => {
    return products
      .filter((p) => (p.stock || 0) <= (p.min_stock || 5))
      .sort((a, b) => a.stock - b.stock);
  }, [products]);

  // Daily Chart Data for the last 7 days / selected range
  const chartData = useMemo(() => {
    const days = 7;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' });

      // Sum sales on this day
      const daySales = orders
        .filter((o) => o.created_at && o.created_at.slice(0, 10) === dateStr)
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      result.push({ dateStr, label, sales: daySales });
    }
    const maxSales = Math.max(...result.map((r) => r.sales), 1);
    return { data: result, maxSales };
  }, [orders]);

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles color="var(--primary)" size={22} />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Admin Dashboard</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              ภาพรวมยอดขาย ต้นทุน และกำไรสุทธิจากการขายจริง
            </p>
          </div>

          {/* Date Range Picker Buttons */}
          <div
            className="glass"
            style={{
              display: 'flex',
              padding: '0.25rem',
              borderRadius: '0.65rem',
              gap: '0.25rem',
            }}
          >
            {[
              { id: 'today', label: 'วันนี้' },
              { id: '7d', label: '7 วันล่าสุด' },
              { id: '30d', label: '30 วันล่าสุด' },
              { id: 'this_month', label: 'เดือนนี้' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateRange(tab.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: dateRange === tab.id ? 700 : 500,
                  background: dateRange === tab.id ? 'var(--primary)' : 'transparent',
                  color: dateRange === tab.id ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Metric Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Today's Sales */}
          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ยอดขายวันนี้</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={20} color="var(--primary)" />
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
              {formatCurrency(stats.todaySales)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              ยอดขายเดือนนี้: {formatCurrency(stats.monthSales)}
            </div>
          </div>

          {/* Period Total Sales */}
          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ยอดขายตามช่วงเวลา</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} color="#3b82f6" />
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {formatCurrency(stats.totalSales)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {stats.totalOrdersCount} ออเดอร์ ({stats.totalItemsSold} ชิ้น)
            </div>
          </div>

          {/* Total Cost */}
          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ต้นทุนสินค้าทั้งหมด</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={20} color="var(--warning)" />
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)' }}>
              {formatCurrency(stats.totalCost)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              คิดจากราคาทุนจริง ณ เวลาขาย
            </div>
          </div>

          {/* Total Net Profit */}
          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>กำไรสุทธิ (Net Profit)</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={20} color="var(--success)" />
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>
              {formatCurrency(stats.totalProfit)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.35rem', fontWeight: 600 }}>
              อัตรากำไร (Margin): {stats.profitMargin}%
            </div>
          </div>
        </div>

        {/* 2. Visual Sales Chart & Top Products */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {/* Sales Trend Bar Chart */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>แนวโน้มยอดขาย 7 วันล่าสุด</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>รายวัน (Daily Trend)</span>
            </div>

            {/* Custom SVG / CSS Bar Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingTop: '1.5rem', gap: '0.5rem' }}>
              {chartData.data.map((bar, idx) => {
                const heightPercent = Math.max(10, (bar.sales / chartData.maxSales) * 100);
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      {bar.sales > 0 ? `฿${(bar.sales / 1000).toFixed(0)}k` : '0'}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '36px',
                        height: `${heightPercent}%`,
                        background: 'linear-gradient(to top, var(--primary), var(--secondary))',
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 0.4s ease',
                      }}
                      title={`${bar.dateStr}: ฿${bar.sales.toLocaleString()}`}
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      {bar.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>สินค้าขายดี (Top Best Sellers)</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>อันดับตามจำนวนขาย</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  ยังไม่มีข้อมูลการขายในรอบนี้
                </div>
              ) : (
                topProducts.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--card-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: idx === 0 ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ขายได้ {p.quantity} ชิ้น • กำไร {formatCurrency(p.profit)}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {formatCurrency(p.revenue)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 3. Low Stock Alerts & Recent Orders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {/* Low Stock Alerts */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="var(--warning)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>สินค้าใกล้หมด / หมดสต็อก</h3>
              </div>
              <span className="badge badge-warning">{lowStockProducts.length} รายการ</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
              {lowStockProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--success)', fontSize: '0.85rem' }}>
                  ✓ สต็อกสินค้าทุกรายการอยู่ในระดับปลอดภัย
                </div>
              ) : (
                lowStockProducts.map((p) => {
                  const outOfStock = (p.stock || 0) <= 0;
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '0.5rem',
                        background: outOfStock ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                        border: `1px solid ${outOfStock ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          SKU: {p.sku || '-'} • ขั้นต่ำ: {p.min_stock || 5} ชิ้น
                        </div>
                      </div>
                      <span className={outOfStock ? 'badge badge-danger' : 'badge badge-warning'}>
                        {outOfStock ? 'หมดแล้ว' : `เหลือ ${p.stock}`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>ออเดอร์ล่าสุด</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  ยังไม่มีประวัติออเดอร์
                </div>
              ) : (
                orders.slice(0, 5).map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--card-border)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>#{o.order_number || o.id?.slice(0, 8)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatDateTime(o.created_at)} • {o.payment_method?.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {formatCurrency(o.total_amount)}
                      </div>
                      <span className="badge badge-success">สำเร็จ</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
