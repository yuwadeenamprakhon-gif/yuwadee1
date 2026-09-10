"use client";

import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { generatePromptPayPayload, generateQRCodeSVG } from '@/lib/promptpay';
import { Banknote, QrCode, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function PaymentModal({
  isOpen,
  totalAmount,
  promptpayId = '0812345678',
  onClose,
  onProcessPayment,
  isProcessing = false,
}) {
  const [method, setMethod] = useState('cash'); // 'cash' | 'promptpay'
  const [cashReceived, setCashReceived] = useState('');
  const [promptPayConfirmed, setPromptPayConfirmed] = useState(false);

  const numReceived = parseFloat(cashReceived) || 0;
  const changeAmount = Math.max(0, numReceived - totalAmount);
  const isCashInsufficient = numReceived < totalAmount;

  // PromptPay dynamic QR payload & image
  const promptPayData = useMemo(() => {
    if (!totalAmount || totalAmount <= 0) return { payload: '', qrUrl: '' };
    const payload = generatePromptPayPayload(promptpayId, totalAmount);
    const qrUrl = generateQRCodeSVG(payload, 240);
    return { payload, qrUrl };
  }, [promptpayId, totalAmount]);

  if (!isOpen) return null;

  const handleQuickCash = (amount) => {
    if (amount === 'exact') {
      setCashReceived(totalAmount.toString());
    } else {
      setCashReceived(amount.toString());
    }
  };

  const handleSubmit = () => {
    if (method === 'cash') {
      if (isCashInsufficient) return;
      onProcessPayment({
        paymentMethod: 'cash',
        amountReceived: numReceived,
        changeAmount: changeAmount,
      });
    } else {
      onProcessPayment({
        paymentMethod: 'promptpay',
        amountReceived: totalAmount,
        changeAmount: 0,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', padding: '1.75rem' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ชำระเงิน (Checkout)</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>เลือกวิธีการชำระเงินที่ต้องการ</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} disabled={isProcessing}>
            <X size={20} />
          </button>
        </div>

        {/* Total to pay banner */}
        <div
          style={{
            background: 'var(--primary-glow)',
            border: '1px solid var(--primary)',
            borderRadius: '0.85rem',
            padding: '1.25rem',
            textAlign: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ยอดที่ต้องชำระสุทธิ</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
            {formatCurrency(totalAmount)}
          </div>
        </div>

        {/* Payment Method Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setMethod('cash')}
            style={{
              padding: '0.85rem',
              borderRadius: '0.75rem',
              background: method === 'cash' ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.05)',
              border: `2px solid ${method === 'cash' ? 'var(--primary)' : 'transparent'}`,
              color: method === 'cash' ? 'var(--primary)' : 'var(--text-color)',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Banknote size={20} />
            <span>เงินสด (Cash)</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('promptpay')}
            style={{
              padding: '0.85rem',
              borderRadius: '0.75rem',
              background: method === 'promptpay' ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.05)',
              border: `2px solid ${method === 'promptpay' ? 'var(--primary)' : 'transparent'}`,
              color: method === 'promptpay' ? 'var(--primary)' : 'var(--text-color)',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <QrCode size={20} />
            <span>PromptPay QR</span>
          </button>
        </div>

        {/* CASH METHOD VIEW */}
        {method === 'cash' && (
          <div>
            <div className="form-group">
              <label className="form-label">จำนวนเงินที่รับจากลูกค้า (บาท)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                autoFocus
                style={{ fontSize: '1.25rem', fontWeight: 700, textAlign: 'right' }}
              />
            </div>

            {/* Quick cash shortcut buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button type="button" className="btn-secondary" onClick={() => handleQuickCash('exact')}>
                พอดี
              </button>
              <button type="button" className="btn-secondary" onClick={() => handleQuickCash(100)}>
                ฿100
              </button>
              <button type="button" className="btn-secondary" onClick={() => handleQuickCash(500)}>
                ฿500
              </button>
              <button type="button" className="btn-secondary" onClick={() => handleQuickCash(1000)}>
                ฿1,000
              </button>
            </div>

            {/* Change Calculation Display */}
            <div
              className="glass"
              style={{
                padding: '1rem',
                borderRadius: '0.75rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>เงินทอนที่ต้องคืน:</span>
                {numReceived > 0 && isCashInsufficient && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                    <AlertCircle size={12} /> ยอดเงินยังไม่พอ (ขาด {formatCurrency(totalAmount - numReceived)})
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: isCashInsufficient ? 'var(--text-muted)' : 'var(--success)',
                }}
              >
                {formatCurrency(changeAmount)}
              </span>
            </div>
          </div>
        )}

        {/* PROMPTPAY QR VIEW */}
        {method === 'promptpay' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                background: '#ffffff',
                padding: '1rem',
                borderRadius: '1rem',
                boxShadow: '0 8px 25px rgba(0,0,0,0.25)',
                marginBottom: '1rem',
              }}
            >
              <img
                src={promptPayData.qrUrl}
                alt="PromptPay QR Code"
                style={{ width: '220px', height: '220px', display: 'block' }}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              สแกนผ่าน Mobile Banking ได้ทุกธนาคาร (PromptPay ID: <strong>{promptpayId}</strong>)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle2 size={14} /> ยอดเงินถูกระบุใน QR Code อัตโนมัติ: {formatCurrency(totalAmount)}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isProcessing}
            style={{ flex: 1 }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isProcessing || (method === 'cash' && isCashInsufficient)}
            style={{ flex: 2 }}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>กำลังบันทึก Order...</span>
              </>
            ) : (
              <span>ยืนยันการรับชำระเงิน</span>
            )}
          </button>
        </div>
      </div>
      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
