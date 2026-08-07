"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, ShoppingBag, Store, Trash2, Minus, Plus } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import styles from './page.module.css';

// Mock data in case Supabase is not connected
const MOCK_PRODUCTS = [
  { id: '1', name: 'White Off-Shoulder Ruffle Dress', price: 890, category: 'Dress', image_url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&h=800&fit=crop' },
  { id: '2', name: 'Floral Sweetheart Mini Dress', price: 790, category: 'Dress', image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=800&fit=crop' },
  { id: '3', name: 'Minimalist Cafe Hopping Dress', price: 950, category: 'Dress', image_url: 'https://images.unsplash.com/photo-1502716115624-b12a8069d2f2?w=600&h=800&fit=crop' },
  { id: '4', name: 'Pastel Blue Pleated Skirt', price: 590, category: 'Bottom', image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop' },
  { id: '5', name: 'Cute Ribbon Tie Crop Top', price: 450, category: 'Top', image_url: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&h=800&fit=crop' },
  { id: '6', name: 'Vintage Plaid Midi Dress', price: 1190, category: 'Dress', image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=800&fit=crop' },
  { id: '7', name: 'Chiffon Long Sleeve Blouse', price: 650, category: 'Top', image_url: 'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=600&h=800&fit=crop' },
  { id: '8', name: 'High-Waist Denim Skirt', price: 590, category: 'Bottom', image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=800&fit=crop' },
  { id: '9', name: 'Elegant Knitted Cardigan', price: 790, category: 'Outerwear', image_url: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&h=800&fit=crop' },
  { id: '10', name: 'Summer Breeze Linen Dress', price: 850, category: 'Dress', image_url: 'https://images.unsplash.com/photo-1524041255072-7da0525d6b34?w=600&h=800&fit=crop' },
  { id: '11', name: 'Casual Oversized Blazer', price: 1290, category: 'Outerwear', image_url: 'https://images.unsplash.com/photo-1550614000-4b95d466e319?w=600&h=800&fit=crop' },
  { id: '12', name: 'Sweet Pink Slip Dress', price: 750, category: 'Dress', image_url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&h=800&fit=crop' },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error || !data || data.length === 0) {
          throw new Error('Fallback to mock');
        }
        setProducts(data);
      } catch (err) {
        console.log('Using mock data (Supabase not configured or empty)');
        setProducts(MOCK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = cartTotal * 0.07;
  const grandTotal = cartTotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    alert(`Checkout complete! Total: ฿${grandTotal.toLocaleString()}`);
    setCart([]);
  };

  return (
    <div className={styles.container}>
      {/* Main Content */}
      <div className={styles.mainContent}>
        <header className={`${styles.header} glass`}>
          <div className={styles.logo}>
            <Store color="#ec4899" />
            <span>nongkame888</span>
          </div>
          <div className={styles.searchBar}>
            <Search size={18} color="rgba(255,255,255,0.4)" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <div className={styles.productsWrapper}>
          {loading ? (
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>Loading products...</div>
          ) : (
            <div className={styles.productsGrid}>
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <aside className={`${styles.cartSidebar} glass-panel`}>
        <div className={styles.cartHeader}>
          <h2>Current Order</h2>
          <ShoppingBag color="var(--primary)" />
        </div>

        <div className={styles.cartItems}>
          {cart.length === 0 ? (
            <div className={styles.emptyCart}>
              <ShoppingBag size={48} strokeWidth={1} />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className={styles.cartItem}>
                <img src={item.image_url} alt={item.name} className={styles.cartItemImg} />
                <div className={styles.cartItemDetails}>
                  <div className={styles.cartItemTitle}>{item.name}</div>
                  <div className={styles.cartItemPrice}>฿{item.price.toLocaleString()}</div>
                </div>
                <div className={styles.cartItemActions}>
                  <button className={styles.qtyBtn} onClick={() => updateQuantity(item.id, -1)}>
                    <Minus size={14} />
                  </button>
                  <span className={styles.qty}>{item.quantity}</span>
                  <button className={styles.qtyBtn} onClick={() => updateQuantity(item.id, 1)}>
                    <Plus size={14} />
                  </button>
                  <button
                    className={styles.qtyBtn}
                    style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', marginLeft: '4px' }}
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.cartFooter}>
          <div className={styles.summaryRow}>
            <span>Subtotal</span>
            <span>฿{cartTotal.toLocaleString()}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Tax (7%)</span>
            <span>฿{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.total}`}>
            <span>Total</span>
            <span>฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          
          <button className={styles.checkoutBtn} onClick={handleCheckout}>
            Checkout
          </button>
        </div>
      </aside>
    </div>
  );
}
