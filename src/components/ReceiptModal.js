"use client";

import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { triggerPrint } from '@/lib/export-utils';
import { Printer, CheckCircle, X, Download } from 'lucide-react';

export default function ReceiptModal({
  isOpen,
  order,
  storeSettings = {
    store_name: 'Nongkame888 - Women Fashion',
    address: '99/8 Fashion Avenue, Sukhumvit, Bangkok 10110',
    phone: '081-234-5678',
    tax_id: '0105558123456',
  },
  onClose,
}) {
  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          padding: '1.5rem',
          background: 'var(--bg-secondary)',
        }}
      >
        {/* Success Header */}
        <div className="no-print" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <CheckCircle size={32} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>บันทึกออเดอร์สำเร็จ!</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>สต็อกถูกตัดและสร้างใบเสร็จเรียบร้อยแล้ว</p>
        </div>

        {/* Printable Thermal Receipt Box */}
        <div
          className="receipt-printable"
          style={{
            background: '#ffffff',
            color: '#111827',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            marginBottom: '1.25rem',
          }}
        >
          {/* Store Info */}
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #9ca3af', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{storeSettings.store_name}</div>
            <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '2px' }}>{storeSettings.address}</div>
            <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>โทร: {storeSettings.phone}</div>
            {storeSettings.tax_id && (
              <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>เลขประจำตัวผู้เสียภาษี: {storeSettings.tax_id}</div>
            )}
          </div>

          {/* Receipt Info */}
          <div style={{ fontSize: '0.75rem', borderBottom: '1px dashed #9ca3af', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>เลขที่บิล:</span>
              <strong>{order.order_number || order.id?.slice(0, 8)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span>วันที่:</span>
              <span>{formatDateTime(order.created_at || new Date())}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span>วิธีชำระ:</span>
              <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{order.payment_method}</span>
            </div>
            {order.cashier_name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>แคชเชียร์:</span>
                <span>{order.cashier_name}</span>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div style={{ borderBottom: '1px dashed #9ca3af', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '0.35rem' }}>
              <span style={{ flex: 2 }}>รายการ</span>
              <span style={{ width: '40px', textAlign: 'center' }}>จน.</span>
              <span style={{ flex: 1, textAlign: 'right' }}>รวม</span>
            </div>
            {(order.items || []).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.8rem' }}>
                <div style={{ flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.product_name || item.name}
                </div>
                <div style={{ width: '40px', textAlign: 'center' }}>x{item.quantity}</div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {formatCurrency(item.unit_price * item.quantity || item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>ยอดรวมสินค้า:</span>
              <span>{formatCurrency(order.subtotal || order.total_amount)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: '#dc2626' }}>
                <span>ส่วนลด:</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid #111827' }}>
              <span>ยอดสุทธิ:</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>

            {order.payment_method === 'cash' && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #9ca3af', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>รับเงิน:</span>
                  <span>{formatCurrency(order.amount_received || order.total_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>เงินทอน:</span>
                  <span>{formatCurrency(order.change_amount || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div style={{ textAlign: 'center', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px dashed #9ca3af', fontSize: '0.7rem', color: '#6b7280' }}>
            ขอบคุณที่ใช้บริการ / Thank you for shopping with us!
          </div>
        </div>

        {/* Action Buttons (Excluded from Print) */}
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={triggerPrint}
            style={{ flex: 1 }}
          >
            <Printer size={16} />
            <span>พิมพ์ใบเสร็จ (Print / PDF)</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            เปิดบิลใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
