"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import AuthGuard from '@/components/AuthGuard';
import ReceiptModal from '@/components/ReceiptModal';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import {
  ClipboardList,
  Search,
  Calendar,
  Filter,
  Eye,
  Printer,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  X,
} from 'lucide-react';

export default function OrdersPage() {
  const { user, profile, isAdmin, isEmployee, isCustomer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('All'); // 'All' | 'cash' | 'promptpay'
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'completed' | 'cancelled'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | '7d' | '30d'

  // Selected Order Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reprintOrder, setReprintOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        let query = supabase
          .from('orders')
          .select('*, profiles:user_id(full_name, email)')
          .order('created_at', { ascending: false });

        // If customer, only show their orders!
        if (isCustomer && user?.id) {
          query = query.eq('user_id', user.id);
        }

        const { data: ords } = await query;
        if (ords) setOrders(ords);

        // Fetch items
        const { data: items } = await supabase.from('order_items').select('*');
        if (items) setOrderItems(items);
      } else {
        const localOrders = JSON.parse(localStorage.getItem('nongkame_local_orders') || '[]');
        if (isCustomer && user?.id) {
          setOrders(localOrders.filter((o) => o.user_id === user.id));
        } else {
          setOrders(localOrders);
        }

        const items = [];
        localOrders.forEach((o) => {
          (o.items || []).forEach((it) => {
            items.push({ ...it, order_id: o.id || o.order_number });
          });
        });
        setOrderItems(items);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user, isCustomer]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      // Payment filter
      if (filterPayment !== 'All' && o.payment_method !== filterPayment) return false;
      // Status filter
      if (filterStatus !== 'All' && o.order_status !== filterStatus) return false;

      // Date filter
      if (dateFilter !== 'all') {
        const d = new Date(o.created_at);
        if (dateFilter === 'today' && d.toDateString() !== now.toDateString()) return false;
        if (dateFilter === '7d' && (now - d) / (1000 * 60 * 60 * 24) > 7) return false;
        if (dateFilter === '30d' && (now - d) / (1000 * 60 * 60 * 24) > 30) return false;
      }

      // Search (order number or customer email)
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const numMatch = (o.order_number || o.id || '').toLowerCase().includes(q);
      const custMatch = (o.profiles?.full_name || o.profiles?.email || '').toLowerCase().includes(q);
      return numMatch || custMatch;
    });
  }, [orders, filterPayment, filterStatus, dateFilter, search]);

  // View order detail
  const handleViewOrder = (order) => {
    // Find matching items
    const items = orderItems.filter((it) => it.order_id === order.id || it.order_id === order.order_number);
    setSelectedOrder({
      ...order,
      items: items.length > 0 ? items : order.items || [],
    });
  };

  return (
    <AuthGuard allowedRoles={['admin', 'employee', 'customer']}>
      <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList color="var(--primary)" size={24} />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                {isCustomer ? 'ประวัติการสั่งซื้อของฉัน' : 'ประวัติคำสั่งซื้อทั้งหมด (Order History)'}
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              {isCustomer
                ? 'ตรวจสอบรายการสินค้าและสถานะการสั่งซื้อย้อนหลังของคุณ'
                : 'ค้นหา กรองข้อมูล ตรวจสอบรายละเอียดสินค้า และสั่งพิมพ์ใบเสร็จย้อนหลัง'}
            </p>
          </div>

          <button onClick={fetchOrders} className="btn-secondary">
            <RefreshCw size={16} />
            <span>รีเฟรช</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div
          className="glass"
          style={{
            padding: '1rem',
            borderRadius: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              borderRadius: '2rem',
              padding: '0.45rem 0.9rem',
              minWidth: '260px',
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ออเดอร์..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                width: '100%',
                marginLeft: '0.5rem',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Date Filter */}
            <select
              className="form-input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', background: 'var(--input-bg)' }}
            >
              <option value="all" style={{ background: '#1e293b' }}>ช่วงเวลาทั้งหมด</option>
              <option value="today" style={{ background: '#1e293b' }}>วันนี้</option>
              <option value="7d" style={{ background: '#1e293b' }}>7 วันล่าสุด</option>
              <option value="30d" style={{ background: '#1e293b' }}>30 วันล่าสุด</option>
            </select>

            {/* Payment Filter */}
            <select
              className="form-input"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', background: 'var(--input-bg)' }}
            >
              <option value="All" style={{ background: '#1e293b' }}>ทุกวิธีชำระเงิน</option>
              <option value="cash" style={{ background: '#1e293b' }}>เงินสด (Cash)</option>
              <option value="promptpay" style={{ background: '#1e293b' }}>PromptPay QR</option>
            </select>

            {/* Status Filter */}
            <select
              className="form-input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', background: 'var(--input-bg)' }}
            >
              <option value="All" style={{ background: '#1e293b' }}>ทุกสถานะ</option>
              <option value="completed" style={{ background: '#1e293b' }}>สำเร็จ (Completed)</option>
              <option value="cancelled" style={{ background: '#1e293b' }}>ยกเลิก (Cancelled)</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>เลขที่ออเดอร์</th>
                  <th style={{ padding: '0.85rem 1rem' }}>วันที่และเวลา</th>
                  {!isCustomer && <th style={{ padding: '0.85rem 1rem' }}>ลูกค้า</th>}
                  <th style={{ padding: '0.85rem 1rem' }}>วิธีชำระเงิน</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ยอดสุทธิ</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>สถานะ</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>การกระทำ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isCustomer ? 6 : 7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      กำลังโหลดประวัติออเดอร์...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={isCustomer ? 6 : 7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      ไม่พบรายการออเดอร์
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      style={{ borderBottom: '1px solid var(--card-border)', cursor: 'pointer' }}
                      onClick={() => handleViewOrder(o)}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        #{o.order_number || o.id?.slice(0, 8)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                        {formatDateTime(o.created_at)}
                      </td>
                      {!isCustomer && (
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {o.profiles?.full_name || o.profiles?.email || 'ลูกค้าหน้าร้าน (Walk-in)'}
                        </td>
                      )}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {o.payment_method === 'cash' ? <Banknote size={15} color="var(--success)" /> : <QrCode size={15} color="var(--primary)" />}
                          {o.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                        {formatCurrency(o.total_amount)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span className={o.order_status === 'cancelled' ? 'badge badge-danger' : 'badge badge-success'}>
                          {o.order_status === 'cancelled' ? 'ยกเลิก' : 'สำเร็จ'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOrder(o);
                          }}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          <Eye size={13} />
                          <span>ดูรายละเอียด</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Order Detail */}
        {selectedOrder && (
          <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '560px', padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    รายละเอียดออเดอร์ #{selectedOrder.order_number || selectedOrder.id?.slice(0, 8)}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatDateTime(selectedOrder.created_at)}
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Items breakdown */}
              <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  รายการสินค้าที่สั่งซื้อ
                </div>
                {(selectedOrder.items || []).map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0',
                      borderBottom: '1px dashed rgba(255,255,255,0.06)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{it.product_name || it.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {it.quantity} x {formatCurrency(it.unit_price || it.price)}
                        {isAdmin && it.cost_price > 0 && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--warning)' }}>
                            (ทุน: {formatCurrency(it.cost_price)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {formatCurrency((it.unit_price || it.price) * it.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>ยอดรวมสินค้า (Subtotal):</span>
                  <span>{formatCurrency(selectedOrder.subtotal || selectedOrder.total_amount)}</span>
                </div>
                {Number(selectedOrder.discount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                    <span>ส่วนลด (Discount):</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary)', paddingTop: '0.5rem', borderTop: '1px solid var(--card-border)' }}>
                  <span>ยอดสุทธิ:</span>
                  <span>{formatCurrency(selectedOrder.total_amount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span>ช่องทางชำระเงิน:</span>
                  <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{selectedOrder.payment_method}</span>
                </div>
              </div>

              {/* Reprint / Action Button */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setReprintOrder(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  style={{ flex: 1 }}
                >
                  <Printer size={16} />
                  <span>พิมพ์ใบเสร็จใหม่ (Reprint)</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedOrder(null)}
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Reprint Receipt */}
        <ReceiptModal
          isOpen={Boolean(reprintOrder)}
          order={reprintOrder}
          onClose={() => setReprintOrder(null)}
        />
      </div>
    </AuthGuard>
  );
}
