"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';
import { exportToCSV, triggerPrint } from '@/lib/export-utils';
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatters';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
  CreditCard,
  Layers,
  Banknote,
  QrCode,
  ArrowDownToLine,
  RefreshCw,
} from 'lucide-react';

export default function ReportsPage() {
  const [filterPreset, setFilterPreset] = useState('30d'); // 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReportsData() {
      setLoading(true);
      try {
        if (isSupabaseConfigured()) {
          const { data: ords } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
          const { data: items } = await supabase.from('order_items').select('*');
          if (ords) setOrders(ords);
          if (items) setOrderItems(items);
        } else {
          const localOrders = JSON.parse(localStorage.getItem('nongkame_local_orders') || '[]');
          setOrders(localOrders);
          const items = [];
          localOrders.forEach((o) => {
            (o.items || []).forEach((it) => items.push({ ...it, order_id: o.id || o.order_number }));
          });
          setOrderItems(items);
        }
      } catch (err) {
        console.error('Reports fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReportsData();
  }, []);

  // Filter orders according to preset or custom dates
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      const d = new Date(o.created_at);

      if (filterPreset === 'today') {
        return d.toDateString() === now.toDateString();
      } else if (filterPreset === 'yesterday') {
        const y = new Date();
        y.setDate(now.getDate() - 1);
        return d.toDateString() === y.toDateString();
      } else if (filterPreset === '7d') {
        return (now - d) / (1000 * 60 * 60 * 24) <= 7;
      } else if (filterPreset === '30d') {
        return (now - d) / (1000 * 60 * 60 * 24) <= 30;
      } else if (filterPreset === 'this_month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else if (filterPreset === 'custom') {
        if (startDate && d < new Date(startDate)) return false;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59);
          if (d > end) return false;
        }
        return true;
      }
      return true;
    });
  }, [orders, filterPreset, startDate, endDate]);

  const filteredOrderIds = useMemo(() => new Set(filteredOrders.map((o) => o.id || o.order_number)), [filteredOrders]);
  const filteredItems = useMemo(() => orderItems.filter((it) => filteredOrderIds.has(it.order_id)), [orderItems, filteredOrderIds]);

  // Key Report Metrics
  const metrics = useMemo(() => {
    const totalSales = filteredOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // True Historical Cost & Profit
    const totalCost = filteredItems.reduce((s, i) => s + Number(i.cost_price || 0) * Number(i.quantity || 0), 0);
    const totalProfit = Math.max(0, totalSales - totalCost);
    const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0;

    // Payment Methods Breakdown
    const cashSales = filteredOrders
      .filter((o) => o.payment_method === 'cash')
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const promptPaySales = filteredOrders
      .filter((o) => o.payment_method === 'promptpay')
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);

    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      totalCost,
      totalProfit,
      profitMargin,
      cashSales,
      promptPaySales,
    };
  }, [filteredOrders, filteredItems]);

  // Breakdown by Day table
  const dailyBreakdown = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      const day = o.created_at.slice(0, 10);
      if (!map[day]) {
        map[day] = { date: day, ordersCount: 0, sales: 0, cost: 0, profit: 0 };
      }
      map[day].ordersCount += 1;
      map[day].sales += Number(o.total_amount || 0);
    });

    filteredItems.forEach((it) => {
      const day = it.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
      if (map[day]) {
        const c = Number(it.cost_price || 0) * Number(it.quantity || 0);
        map[day].cost += c;
      }
    });

    Object.values(map).forEach((m) => {
      m.profit = Math.max(0, m.sales - m.cost);
    });

    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredOrders, filteredItems]);

  // Export to CSV
  const handleExportCSV = () => {
    const exportRows = filteredOrders.map((o) => ({
      order_number: o.order_number || o.id,
      created_at: formatDateTime(o.created_at),
      subtotal: o.subtotal || o.total_amount,
      discount: o.discount || 0,
      total_amount: o.total_amount,
      payment_method: o.payment_method,
      status: o.order_status,
    }));

    exportToCSV(`Nongkame888_Report_${filterPreset}`, exportRows, {
      order_number: 'เลขที่ออเดอร์',
      created_at: 'วันที่และเวลา',
      subtotal: 'ยอดรวม (บาท)',
      discount: 'ส่วนลด (บาท)',
      total_amount: 'ยอดสุทธิ (บาท)',
      payment_method: 'วิธีชำระเงิน',
      status: 'สถานะ',
    });
  };

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 color="var(--primary)" size={24} />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>รายงานยอดขายและกำไร (Financial Reports)</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              วิเคราะห์รายได้ ต้นทุน กำไรสุทธิ พร้อมส่งออกรายงาน CSV และพิมพ์เป็นเอกสาร PDF
            </p>
          </div>

          {/* Action Buttons: CSV & Print */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleExportCSV} className="btn-secondary" style={{ padding: '0.55rem 1rem' }}>
              <Download size={16} />
              <span>ส่งออก CSV (Excel)</span>
            </button>
            <button onClick={triggerPrint} className="btn-primary" style={{ padding: '0.55rem 1rem' }}>
              <Printer size={16} />
              <span>พิมพ์รายงาน / บันทึก PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Presets Bar */}
        <div
          className="glass no-print"
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
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'today', label: 'วันนี้' },
              { id: 'yesterday', label: 'เมื่อวาน' },
              { id: '7d', label: '7 วันล่าสุด' },
              { id: '30d', label: '30 วันล่าสุด' },
              { id: 'this_month', label: 'เดือนนี้' },
              { id: 'custom', label: 'กำหนดวันที่เอง' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterPreset(tab.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: filterPreset === tab.id ? 700 : 500,
                  background: filterPreset === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: filterPreset === tab.id ? '#ffffff' : 'var(--text-muted)',
                  border: `1px solid ${filterPreset === tab.id ? 'var(--primary)' : 'var(--card-border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filterPreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>ถึง</span>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
              />
            </div>
          )}
        </div>

        {/* 1. KPI Financial Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ยอดขายสุทธิ (Revenue)</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
              {formatCurrency(metrics.totalSales)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              จาก {metrics.totalOrders} ออเดอร์ (เฉลี่ย ฿{metrics.avgOrderValue.toFixed(0)}/บิล)
            </div>
          </div>

          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ต้นทุนสินค้า (Cost)</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.25rem' }}>
              {formatCurrency(metrics.totalCost)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              คำนวณจากราคาทุนประวัติศาสตร์
            </div>
          </div>

          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--success)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>กำไรสุทธิ (Net Profit)</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>
              {formatCurrency(metrics.totalProfit)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.3rem', fontWeight: 600 }}>
              อัตรากำไรเฉลี่ย: {metrics.profitMargin}%
            </div>
          </div>

          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ช่องทางชำระเงิน</span>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Banknote size={14} color="var(--success)" /> เงินสด:
                </span>
                <strong>{formatCurrency(metrics.cashSales)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <QrCode size={14} color="var(--primary)" /> PromptPay:
                </span>
                <strong>{formatCurrency(metrics.promptPaySales)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Daily Breakdown Table */}
        <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>แจกแจงยอดขายและกำไรรายวัน (Daily Breakdown)</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dailyBreakdown.length} วันที่มีรายการ</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>วันที่</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>จำนวนบิล</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ยอดขาย (Revenue)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ต้นทุน (Cost)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>กำไร (Profit)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Margin (%)</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      ไม่มีข้อมูลการขายในช่วงเวลานี้
                    </td>
                  </tr>
                ) : (
                  dailyBreakdown.map((row) => {
                    const margin = row.sales > 0 ? ((row.profit / row.sales) * 100).toFixed(1) : 0;
                    return (
                      <tr key={row.date} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{formatDate(row.date)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{row.ordersCount}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          {formatCurrency(row.sales)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {formatCurrency(row.cost)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                          +{formatCurrency(row.profit)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span className="badge badge-success">{margin}%</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
