"use client";

import { Plus, Check, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export default function ProductCard({ product, onAdd, cartQuantity = 0 }) {
  const isOutOfStock = (product.stock ?? 0) <= 0;
  const isLowStock = !isOutOfStock && product.stock <= (product.min_stock || 5);

  return (
    <div
      className="glass"
      onClick={() => {
        if (!isOutOfStock) onAdd(product);
      }}
      style={{
        borderRadius: '1rem',
        overflow: 'hidden',
        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
        opacity: isOutOfStock ? 0.6 : 1,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: cartQuantity > 0 ? '1px solid var(--primary)' : '1px solid var(--card-border)',
      }}
      onMouseEnter={(e) => {
        if (!isOutOfStock) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 25px rgba(0,0,0,0.3)';
          e.currentTarget.style.borderColor = 'var(--primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isOutOfStock) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = cartQuantity > 0 ? 'var(--primary)' : 'var(--card-border)';
        }
      }}
    >
      {/* Cart quantity indicator badge */}
      {cartQuantity > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: '9999px',
            padding: '2px 8px',
            fontSize: '0.75rem',
            fontWeight: 700,
            zIndex: 2,
            boxShadow: '0 2px 8px var(--primary-glow)',
          }}
        >
          {cartQuantity} ในตะกร้า
        </div>
      )}

      {/* Stock badge */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          zIndex: 2,
        }}
      >
        {isOutOfStock ? (
          <span className="badge badge-danger">หมดสต็อก</span>
        ) : isLowStock ? (
          <span className="badge badge-warning">เหลือ {product.stock} ชิ้น</span>
        ) : (
          <span className="badge badge-success">คงเหลือ {product.stock}</span>
        )}
      </div>

      {/* Image container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '100%', // 1:1 square
          overflow: 'hidden',
          backgroundColor: 'rgba(0,0,0,0.2)',
        }}
      >
        <img
          src={product.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop'}
          alt={product.name}
          loading="lazy"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
          }}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop';
          }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {product.category || 'General'}
          </span>
          {product.sku && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {product.sku}
            </span>
          )}
        </div>

        <h3
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.4em',
          }}
        >
          {product.name}
        </h3>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)' }}>
            {formatCurrency(product.selling_price || product.price)}
          </span>

          <button
            disabled={isOutOfStock}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '0.5rem',
              background: isOutOfStock ? 'rgba(255,255,255,0.1)' : 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isOutOfStock ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
