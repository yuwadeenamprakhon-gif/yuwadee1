"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { useNotifications } from '@/lib/notification-context';
import AuthGuard from '@/components/AuthGuard';
import { formatDateTime, formatNumber } from '@/lib/formatters';
import {
  Boxes,
  Package,
  AlertTriangle,
  AlertOctagon,
  ArrowUpDown,
  History,
  Plus,
  Minus,
  CheckCircle2,
  X,
  Search,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export default function InventoryPage() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const { addNotification } = useNotifications();

  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'movements'
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('restock'); // 'restock' | 'adjustment' | 'return'
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data: prods } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (prods) setProducts(prods);

        const { data: movs } = await supabase
          .from('inventory_movements')
          .select('*, products(name, sku)')
          .order('created_at', { ascending: false })
          .limit(100);
        if (movs) setMovements(movs);
      } else {
        const localProds = JSON.parse(localStorage.getItem('nongkame_local_products') || '[]');
        const localMovs = JSON.parse(localStorage.getItem('nongkame_local_movements') || '[]');
        setProducts(localProds);
        setMovements(localMovs);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Stock Summary Counts
  const summary = useMemo(() => {
    const total = products.length;
    const outOfStock = products.filter((p) => (p.stock || 0) <= 0).length;
    const lowStock = products.filter(
      (p) => (p.stock || 0) > 0 && p.stock <= (p.min_stock || 5)
    ).length;
    const inStock = total - outOfStock - lowStock;
    return { total, inStock, lowStock, outOfStock };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, search]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return movements;
    return movements.filter((m) => {
      const pName = m.products?.name || m.product_name || '';
      const pSku = m.products?.sku || m.sku || '';
      return pName.toLowerCase().includes(q) || pSku.toLowerCase().includes(q) || m.reason.includes(q);
    });
  }, [movements, search]);

  // Open Adjust Modal
  const openAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustDelta('');
    setAdjustReason('restock');
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  // Submit Stock Adjustment
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const delta = parseInt(adjustDelta, 10);
    if (isNaN(delta) || delta === 0) {
      toast.warning('กรุณาระบุจำนวนที่เปลี่ยนแปลง (+ หรือ -)');
      return;
    }

    const beforeQty = selectedProduct.stock || 0;
    const afterQty = beforeQty + delta;

    if (afterQty < 0) {
      toast.error(`ไม่สามารถลดสต็อกให้ติดลบได้ (คงเหลือปัจจุบัน: ${beforeQty})`);
      return;
    }

    setAdjusting(true);
    try {
      if (isSupabaseConfigured()) {
        // Update product stock
        const { error: prodErr } = await supabase
          .from('products')
          .update({ stock: afterQty })
          .eq('id', selectedProduct.id);
        if (prodErr) throw prodErr;

        // Record movement
        const { error: movErr } = await supabase.from('inventory_movements').insert({
          product_id: selectedProduct.id,
          quantity_before: beforeQty,
          quantity_delta: delta,
          quantity_after: afterQty,
          reason: adjustReason,
          reference_id: adjustNotes || 'Manual Adjustment',
          user_id: user?.id || null,
        });
        if (movErr) throw movErr;

        // Check if low/out of stock
        if (afterQty === 0) {
          addNotification({
            type: 'out_of_stock',
            title: 'สินค้าหมดสต็อก!',
            message: `สินค้า "${selectedProduct.name}" สต็อกหมดแล้ว`,
          });
        } else if (afterQty <= (selectedProduct.min_stock || 5)) {
          addNotification({
            type: 'low_stock',
            title: 'สินค้าใกล้หมด',
            message: `สินค้า "${selectedProduct.name}" เหลือ ${afterQty} ชิ้น`,
          });
        }
      } else {
        // Local mode
        const updatedProds = products.map((p) =>
          p.id === selectedProduct.id ? { ...p, stock: afterQty } : p
        );
        setProducts(updatedProds);
        localStorage.setItem('nongkame_local_products', JSON.stringify(updatedProds));

        const newMov = {
          id: 'mov-' + Date.now(),
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          sku: selectedProduct.sku,
          quantity_before: beforeQty,
          quantity_delta: delta,
          quantity_after: afterQty,
          reason: adjustReason,
          reference_id: adjustNotes || 'Manual Adjustment',
          user_id: user?.id,
          created_at: new Date().toISOString(),
        };
        const updatedMovs = [newMov, ...movements];
        setMovements(updatedMovs);
        localStorage.setItem('nongkame_local_movements', JSON.stringify(updatedMovs));
      }

      toast.success(
        `ปรับปรุงสต็อก "${selectedProduct.name}" สำเร็จ (${beforeQty} -> ${afterQty})`
      );
      setIsAdjustModalOpen(false);
      fetchInventoryData();
    } catch (err) {
      console.error('Adjust stock error:', err);
      toast.error('ปรับสต็อกล้มเหลว: ' + err.message);
    } finally {
      setAdjusting(false);
    }
  };

  const getReasonBadge = (reason) => {
    switch (reason) {
      case 'sale':
        return <span className="badge badge-secondary">ขายสินค้า (POS)</span>;
      case 'restock':
        return <span className="badge badge-success">เติมสต็อกสินค้า</span>;
      case 'return':
        return <span className="badge badge-primary">รับคืนสินค้า</span>;
      default:
        return <span className="badge badge-warning">ปรับปรุงสต็อก</span>;
    }
  };

  return (
    <AuthGuard allowedRoles={['admin', 'employee']}>
      <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Boxes color="var(--primary)" size={24} />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>คลังและสต็อกสินค้า (Inventory)</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              ตรวจสอบสต็อกปัจจุบัน ปรับจำนวนสต็อก และดูประวัติความเคลื่อนไหว (Stock Movements)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={fetchInventoryData} className="btn-secondary">
              <RefreshCw size={16} />
              <span>รีเฟรช</span>
            </button>
          </div>
        </div>

        {/* 1. Summary KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>สินค้าทั้งหมด</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem' }}>
              {summary.total} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>รายการ</span>
            </div>
          </div>

          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>สต็อกปกติ (In Stock)</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>
              {summary.inStock} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>รายการ</span>
            </div>
          </div>

          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>สินค้าใกล้หมด (Low Stock)</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.25rem' }}>
              {summary.lowStock} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>รายการ</span>
            </div>
          </div>

          <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>หมดสต็อก (Out of Stock)</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.25rem' }}>
              {summary.outOfStock} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>รายการ</span>
            </div>
          </div>
        </div>

        {/* 2. Tabs Switcher & Search */}
        <div
          className="glass"
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('stock')}
              className={activeTab === 'stock' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <Boxes size={16} />
              <span>สต็อกสินค้าคงเหลือ ({products.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={activeTab === 'movements' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <History size={16} />
              <span>ประวัติความเคลื่อนไหว (Movements)</span>
            </button>
          </div>

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
              placeholder="ค้นหาชื่อสินค้า, SKU..."
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
        </div>

        {/* TAB 1: Current Stock Table */}
        {activeTab === 'stock' && (
          <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>สินค้า</th>
                    <th style={{ padding: '0.85rem 1rem' }}>SKU</th>
                    <th style={{ padding: '0.85rem 1rem' }}>หมวดหมู่</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>สต็อกขั้นต่ำ</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>สต็อกปัจจุบัน</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>สถานะ</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>ปรับสต็อก</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const isOut = (p.stock || 0) <= 0;
                    const isLow = !isOut && p.stock <= (p.min_stock || 5);
                    return (
                      <tr
                        key={p.id}
                        style={{ borderBottom: '1px solid var(--card-border)' }}
                      >
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <img
                              src={p.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop'}
                              alt={p.name}
                              style={{ width: '38px', height: '38px', borderRadius: '0.4rem', objectFit: 'cover' }}
                            />
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {p.sku || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className="badge badge-secondary">{p.category || 'General'}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {p.min_stock || 5} ชิ้น
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '1.05rem', fontWeight: 800 }}>
                          {p.stock}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {isOut ? (
                            <span className="badge badge-danger">หมดสต็อก</span>
                          ) : isLow ? (
                            <span className="badge badge-warning">ใกล้หมด</span>
                          ) : (
                            <span className="badge badge-success">พร้อมขาย</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => openAdjustModal(p)}
                            className="btn-secondary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            <ArrowUpDown size={14} />
                            <span>ปรับสต็อก</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Stock Movement Audit Log */}
        {activeTab === 'movements' && (
          <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>วันที่และเวลา</th>
                    <th style={{ padding: '0.85rem 1rem' }}>สินค้า</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>ก่อนเปลี่ยน</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>จำนวนที่เปลี่ยน</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>หลังเปลี่ยน</th>
                    <th style={{ padding: '0.85rem 1rem' }}>เหตุผล</th>
                    <th style={{ padding: '0.85rem 1rem' }}>เลขอ้างอิง / บันทึก</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        ยังไม่มีประวัติการเคลื่อนไหวสต็อก
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => {
                      const isPositive = m.quantity_delta > 0;
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                            {formatDateTime(m.created_at)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                            {m.products?.name || m.product_name || 'สินค้า'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            {m.quantity_before}
                          </td>
                          <td
                            style={{
                              padding: '0.75rem 1rem',
                              textAlign: 'center',
                              fontWeight: 800,
                              color: isPositive ? 'var(--success)' : 'var(--danger)',
                            }}
                          >
                            {isPositive ? `+${m.quantity_delta}` : m.quantity_delta}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>
                            {m.quantity_after}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {getReasonBadge(m.reason)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {m.reference_id || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Manual Stock Adjustment */}
        {isAdjustModalOpen && selectedProduct && (
          <div className="modal-overlay" onClick={() => setIsAdjustModalOpen(false)}>
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '460px', padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>ปรับปรุงจำนวนสต็อกสินค้า</h3>
                <button onClick={() => setIsAdjustModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Product Info Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  marginBottom: '1.25rem',
                }}
              >
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  style={{ width: '48px', height: '48px', borderRadius: '0.4rem', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedProduct.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    SKU: {selectedProduct.sku} • สต็อกปัจจุบัน: <strong>{selectedProduct.stock}</strong> ชิ้น
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveAdjustment}>
                {/* Reason Selection */}
                <div className="form-group">
                  <label className="form-label">เหตุผลการปรับสต็อก</label>
                  <select
                    className="form-input"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    style={{ background: 'var(--input-bg)' }}
                  >
                    <option value="restock" style={{ background: '#1e293b' }}>เติมสต็อกสินค้าใหม่ (Restock)</option>
                    <option value="adjustment" style={{ background: '#1e293b' }}>ตรวจนับสต็อก / ปรับปรุง (Inventory Count)</option>
                    <option value="return" style={{ background: '#1e293b' }}>รับคืนสินค้าจากลูกค้า (Customer Return)</option>
                  </select>
                </div>

                {/* Delta Input */}
                <div className="form-group">
                  <label className="form-label">
                    จำนวนที่เพิ่ม (+) หรือ ลด (-) ชิ้น
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="เช่น +20 หรือ -5"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(e.target.value)}
                    required
                    style={{ fontSize: '1.2rem', fontWeight: 700 }}
                  />
                  {adjustDelta && (
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--primary)' }}>
                      สต็อกหลังปรับ: <strong>{(selectedProduct.stock || 0) + (parseInt(adjustDelta, 10) || 0)}</strong> ชิ้น
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">บันทึกช่วยจำ / เลขที่เอกสารอ้างอิง</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น PO-202609-01 หรือ สินค้าเสียหายชำรุด"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsAdjustModalOpen(false)}
                    style={{ flex: 1 }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={adjusting}
                    style={{ flex: 2 }}
                  >
                    {adjusting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <span>บันทึกสต็อก</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
