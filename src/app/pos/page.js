"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { useNotifications } from '@/lib/notification-context';
import AuthGuard from '@/components/AuthGuard';
import ProductCard from '@/components/ProductCard';
import PaymentModal from '@/components/PaymentModal';
import ReceiptModal from '@/components/ReceiptModal';
import ConfirmModal from '@/components/ConfirmModal';
import { formatCurrency } from '@/lib/formatters';
import {
  Search,
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  RotateCcw,
  Tag,
  CreditCard,
  Percent,
  CheckCircle2,
  RefreshCw,
  PackageX,
} from 'lucide-react';

export default function POSPage() {
  const { user, profile, isAdmin, isEmployee } = useAuth();
  const toast = useToast();
  const { addNotification } = useNotifications();

  // Products and Category State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState('baht'); // 'baht' | 'percent'
  const [discountValue, setDiscountValue] = useState(0);

  // Store Settings (for receipt & PromptPay)
  const [storeSettings, setStoreSettings] = useState({
    store_name: 'Nongkame888 - Women Fashion',
    address: '99/8 Fashion Avenue, Sukhumvit, Bangkok 10110',
    phone: '081-234-5678',
    promptpay_id: '0812345678',
    tax_id: '0105558123456',
  });

  // Modals State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  // 1. Fetch Products & Categories & Store Settings from Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        // Fetch products
        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (!prodErr && prodData) {
          setProducts(prodData);
        }

        // Fetch categories
        const { data: catData } = await supabase.from('categories').select('name').order('name');
        if (catData && catData.length > 0) {
          setCategories(['All', ...catData.map((c) => c.name)]);
        }

        // Fetch store settings
        const { data: settingData } = await supabase.from('store_settings').select('*').limit(1).single();
        if (settingData) {
          setStoreSettings(settingData);
        }
      } else {
        // Load from local storage or fallback products
        const localProducts = localStorage.getItem('nongkame_local_products');
        if (localProducts) {
          setProducts(JSON.parse(localProducts));
        } else {
          // Default initial products
          const initial = [
            { id: '1', name: 'White Off-Shoulder Ruffle Dress', sku: 'NK-DRS-001', price: 890, selling_price: 890, cost_price: 450, category: 'Dress', stock: 25, min_stock: 5, image_url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&h=800&fit=crop' },
            { id: '2', name: 'Floral Sweetheart Mini Dress', sku: 'NK-DRS-002', price: 790, selling_price: 790, cost_price: 380, category: 'Dress', stock: 18, min_stock: 5, image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=800&fit=crop' },
            { id: '3', name: 'Minimalist Cafe Hopping Dress', sku: 'NK-DRS-003', price: 950, selling_price: 950, cost_price: 500, category: 'Dress', stock: 12, min_stock: 4, image_url: 'https://images.unsplash.com/photo-1502716115624-b12a8069d2f2?w=600&h=800&fit=crop' },
            { id: '4', name: 'Pastel Blue Pleated Skirt', sku: 'NK-BTM-001', price: 590, selling_price: 590, cost_price: 280, category: 'Bottom', stock: 30, min_stock: 8, image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop' },
            { id: '5', name: 'Cute Ribbon Tie Crop Top', sku: 'NK-TOP-001', price: 450, selling_price: 450, cost_price: 200, category: 'Top', stock: 35, min_stock: 10, image_url: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&h=800&fit=crop' },
            { id: '6', name: 'Vintage Plaid Midi Dress', sku: 'NK-DRS-004', price: 1190, selling_price: 1190, cost_price: 600, category: 'Dress', stock: 8, min_stock: 3, image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=800&fit=crop' },
            { id: '7', name: 'Chiffon Long Sleeve Blouse', sku: 'NK-TOP-002', price: 650, selling_price: 650, cost_price: 320, category: 'Top', stock: 22, min_stock: 6, image_url: 'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=600&h=800&fit=crop' },
            { id: '8', name: 'High-Waist Denim Skirt', sku: 'NK-BTM-002', price: 590, selling_price: 590, cost_price: 300, category: 'Bottom', stock: 15, min_stock: 5, image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=800&fit=crop' },
            { id: '9', name: 'Elegant Knitted Cardigan', sku: 'NK-OUT-001', price: 790, selling_price: 790, cost_price: 400, category: 'Outerwear', stock: 14, min_stock: 4, image_url: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&h=800&fit=crop' },
            { id: '10', name: 'Summer Breeze Linen Dress', sku: 'NK-DRS-005', price: 850, selling_price: 850, cost_price: 420, category: 'Dress', stock: 16, min_stock: 5, image_url: 'https://images.unsplash.com/photo-1524041255072-7da0525d6b34?w=600&h=800&fit=crop' },
            { id: '11', name: 'Casual Oversized Blazer', sku: 'NK-OUT-002', price: 1290, selling_price: 1290, cost_price: 650, category: 'Outerwear', stock: 9, min_stock: 3, image_url: 'https://images.unsplash.com/photo-1550614000-4b95d466e319?w=600&h=800&fit=crop' },
            { id: '12', name: 'Sweet Pink Slip Dress', sku: 'NK-DRS-006', price: 750, selling_price: 750, cost_price: 390, category: 'Dress', stock: 20, min_stock: 5, image_url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&h=800&fit=crop' },
          ];
          setProducts(initial);
          localStorage.setItem('nongkame_local_products', JSON.stringify(initial));
        }
        setCategories(['All', 'Dress', 'Top', 'Bottom', 'Outerwear']);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Supabase Realtime subscription on products table
    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel('public:pos_products')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setProducts((prev) =>
                prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
              );
            } else if (payload.eventType === 'INSERT') {
              setProducts((prev) => [payload.new, ...prev]);
            } else if (payload.eventType === 'DELETE') {
              setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // 2. Filter Products by Search (Name or SKU) and Category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  // 3. Cart Actions
  const addToCart = (product) => {
    const availableStock = product.stock || 0;
    if (availableStock <= 0) {
      toast.warning(`สินค้า "${product.name}" หมดสต็อกแล้ว!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          toast.warning(`ไม่สามารถเพิ่มเกินจำนวนคงเหลือ (${availableStock} ชิ้น)`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.selling_price || product.price),
          cost_price: Number(product.cost_price || 0),
          stock: availableStock,
          image_url: product.image_url,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty > item.stock) {
            toast.warning(`ไม่สามารถเพิ่มเกินจำนวนสต็อก (${item.stock} ชิ้น)`);
            return item;
          }
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const setDirectQuantity = (id, value) => {
    const qty = parseInt(value, 10);
    if (isNaN(qty) || qty <= 0) return;

    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (qty > item.stock) {
            toast.warning(`จำนวนสต็อกคงเหลือเพียง ${item.stock} ชิ้น`);
            return { ...item, quantity: item.stock };
          }
          return { ...item, quantity: qty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setIsClearConfirmOpen(false);
    toast.info('ล้างรายการในตะกร้าเรียบร้อย');
  };

  // 4. Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const calculatedDiscount = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (val <= 0) return 0;
    if (discountType === 'percent') {
      return (subtotal * Math.min(100, val)) / 100;
    }
    return Math.min(subtotal, val);
  }, [subtotal, discountType, discountValue]);

  const netTotal = Math.max(0, subtotal - calculatedDiscount);

  // 5. Checkout & Order Processing
  const handleProcessPayment = async ({ paymentMethod, amountReceived, changeAmount }) => {
    if (cart.length === 0) return;
    setIsProcessingOrder(true);

    try {
      const orderNumber = 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

      // Construct order items payload
      const orderItems = cart.map((c) => ({
        product_id: c.id,
        product_name: c.name,
        quantity: c.quantity,
        unit_price: c.price,
        cost_price: c.cost_price, // Snapshot of cost at sale!
        subtotal: c.price * c.quantity,
      }));

      if (isSupabaseConfigured()) {
        // Try atomic RPC process_pos_order first
        const { data: rpcData, error: rpcErr } = await supabase.rpc('process_pos_order', {
          p_customer_id: user?.id || null,
          p_cashier_id: user?.id || null,
          p_items: cart.map((c) => ({
            product_id: c.id,
            quantity: c.quantity,
            unit_price: c.price,
          })),
          p_payment_method: paymentMethod,
          p_subtotal: subtotal,
          p_discount: calculatedDiscount,
          p_total_amount: netTotal,
          p_amount_received: amountReceived,
          p_change_amount: changeAmount,
        });

        if (rpcErr) {
          console.warn('RPC process_pos_order failed, falling back to direct table inserts:', rpcErr.message);

          // Direct fallback transactions
          // 1. Insert Order
          const { data: newOrder, error: orderErr } = await supabase
            .from('orders')
            .insert({
              order_number: orderNumber,
              user_id: user?.id || null,
              cashier_id: user?.id || null,
              subtotal,
              discount: calculatedDiscount,
              total_amount: netTotal,
              payment_method: paymentMethod,
              payment_status: 'completed',
              order_status: 'completed',
            })
            .select()
            .single();

          if (orderErr) throw new Error('สร้าง Order ไม่สำเร็จ: ' + orderErr.message);

          // 2. Insert Order Items
          const itemsToInsert = orderItems.map((item) => ({
            ...item,
            order_id: newOrder.id,
          }));
          await supabase.from('order_items').insert(itemsToInsert);

          // 3. Deduct Stock & Record Movement for each item
          for (const item of cart) {
            const current = products.find((p) => p.id === item.id);
            const currentStock = current?.stock || 0;
            const newStock = Math.max(0, currentStock - item.quantity);

            await supabase.from('products').update({ stock: newStock }).eq('id', item.id);

            await supabase.from('inventory_movements').insert({
              product_id: item.id,
              quantity_before: currentStock,
              quantity_delta: -item.quantity,
              quantity_after: newStock,
              reason: 'sale',
              reference_id: newOrder.order_number,
              user_id: user?.id || null,
            });
          }

          // 4. Insert Payment
          await supabase.from('payments').insert({
            order_id: newOrder.id,
            payment_method: paymentMethod,
            amount: netTotal,
            amount_received: amountReceived,
            change_amount: changeAmount,
            status: 'completed',
          });

          // 5. Notification
          addNotification({
            type: 'new_order',
            title: `ออเดอร์ใหม่ #${newOrder.order_number}`,
            message: `ยอดชำระ ฿${netTotal.toLocaleString()} (${paymentMethod})`,
          });
        }
      } else {
        // Local mode fallback: update local products and save local order
        const updatedProds = products.map((p) => {
          const inCart = cart.find((c) => c.id === p.id);
          if (inCart) {
            return { ...p, stock: Math.max(0, (p.stock || 0) - inCart.quantity) };
          }
          return p;
        });
        setProducts(updatedProds);
        localStorage.setItem('nongkame_local_products', JSON.stringify(updatedProds));

        // Save local order history
        const localOrders = JSON.parse(localStorage.getItem('nongkame_local_orders') || '[]');
        const newLocalOrder = {
          id: 'ord-' + Date.now(),
          order_number: orderNumber,
          user_id: user?.id,
          cashier_id: user?.id,
          cashier_name: profile?.full_name || 'Cashier',
          subtotal,
          discount: calculatedDiscount,
          total_amount: netTotal,
          payment_method: paymentMethod,
          amount_received: amountReceived,
          change_amount: changeAmount,
          items: orderItems,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem('nongkame_local_orders', JSON.stringify([newLocalOrder, ...localOrders]));
      }

      // Prepare completed order details for ReceiptModal
      const receiptData = {
        id: 'ord-' + Date.now(),
        order_number: orderNumber,
        cashier_name: profile?.full_name || user?.email?.split('@')[0] || 'Staff',
        subtotal,
        discount: calculatedDiscount,
        total_amount: netTotal,
        payment_method: paymentMethod,
        amount_received: amountReceived,
        change_amount: changeAmount,
        items: orderItems,
        created_at: new Date().toISOString(),
      };

      setCompletedOrder(receiptData);
      setIsPaymentOpen(false);
      setIsReceiptOpen(true);
      setCart([]);
      setDiscountValue(0);
      toast.success(`ขายสินค้าสำเร็จ! เลขที่บิล #${orderNumber}`);
      fetchData(); // Refresh stock
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('เกิดข้อผิดพลาดในการทำรายการ: ' + err.message);
    } finally {
      setIsProcessingOrder(false);
    }
  };

  return (
    <AuthGuard allowedRoles={['admin', 'employee', 'customer']}>
      <div
        style={{
          display: 'flex',
          height: 'calc(100vh - 61px)',
          overflow: 'hidden',
          padding: '1rem',
          gap: '1rem',
        }}
      >
        {/* Left Side: Product Catalog (2/3 width) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            overflow: 'hidden',
          }}
        >
          {/* Top Bar: Search and Category Tabs */}
          <div
            className="glass"
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Search Bar */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '2rem',
                  padding: '0.5rem 1rem',
                }}
              >
                <Search size={18} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสินค้า หรือ รหัส SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-color)',
                    width: '100%',
                    marginLeft: '0.6rem',
                    fontSize: '0.9rem',
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}>
                    ✕
                  </button>
                )}
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchData}
                className="btn-secondary"
                style={{ padding: '0.55rem 0.85rem' }}
                title="รีเฟรชสต็อกสินค้า"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px' }}>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 600 : 500,
                      background: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      border: `1px solid ${isActive ? 'var(--primary)' : 'var(--card-border)'}`,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                กำลังโหลดรายการสินค้า...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '4rem 1rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <PackageX size={48} strokeWidth={1.5} />
                <p style={{ fontSize: '1rem' }}>ไม่พบสินค้าที่ตรงกับการค้นหา</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                  gap: '1rem',
                }}
              >
                {filteredProducts.map((product) => {
                  const inCartItem = cart.find((c) => c.id === product.id);
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAdd={addToCart}
                      cartQuantity={inCartItem?.quantity || 0}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart Sidebar (1/3 width, 380px) */}
        <aside
          className="glass-panel"
          style={{
            width: '380px',
            borderRadius: '1rem',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--card-border)',
          }}
        >
          {/* Cart Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag color="var(--primary)" size={20} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>รายการสั่งซื้อ</h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} /> ล้างตะกร้า
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            {cart.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-muted)',
                  gap: '0.75rem',
                }}
              >
                <ShoppingBag size={48} strokeWidth={1} />
                <p style={{ fontSize: '0.9rem' }}>ยังไม่มีสินค้าในตะกร้า</p>
                <span style={{ fontSize: '0.75rem', textAlign: 'center', opacity: 0.7 }}>
                  แตะที่สินค้าทางซ้ายเพื่อเพิ่มลงในรายการ
                </span>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop'}
                    alt={item.name}
                    style={{ width: '48px', height: '48px', borderRadius: '0.5rem', objectFit: 'cover' }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
                      {formatCurrency(item.price)}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Minus size={13} />
                    </button>

                    {/* Direct Quantity Input */}
                    <input
                      type="number"
                      min={1}
                      max={item.stock}
                      value={item.quantity}
                      onChange={(e) => setDirectQuantity(item.id, e.target.value)}
                      style={{
                        width: '38px',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--card-border)',
                        color: 'var(--text-color)',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        padding: '2px 0',
                      }}
                    />

                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} />
                    </button>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '2px',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer: Discount & Totals & Checkout */}
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'rgba(0, 0, 0, 0.25)',
              borderTop: '1px solid var(--card-border)',
            }}
          >
            {/* Discount Row */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ส่วนลด (Discount)</span>
                <div style={{ display: 'flex', gap: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={() => setDiscountType('baht')}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      background: discountType === 'baht' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                    }}
                  >
                    ฿ บาท
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      background: discountType === 'percent' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                    }}
                  >
                    %
                  </button>
                </div>
              </div>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="form-input"
                style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
              />
            </div>

            {/* Subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <span>ยอดรวม (Subtotal)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount Display */}
            {calculatedDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '0.35rem' }}>
                <span>ส่วนลด</span>
                <span>-{formatCurrency(calculatedDiscount)}</span>
              </div>
            )}

            {/* Net Total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontWeight: 800,
                fontSize: '1.25rem',
                color: 'var(--text-color)',
                paddingTop: '0.5rem',
                marginTop: '0.5rem',
                borderTop: '1px dashed var(--card-border)',
              }}
            >
              <span>ยอดสุทธิ</span>
              <span style={{ color: 'var(--primary)' }}>{formatCurrency(netTotal)}</span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => setIsPaymentOpen(true)}
              disabled={cart.length === 0}
              className="btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.9rem', fontSize: '1rem' }}
            >
              <CreditCard size={18} />
              <span>ชำระเงิน ({cart.reduce((s, i) => s + i.quantity, 0)} ชิ้น)</span>
            </button>
          </div>
        </aside>

        {/* Modals */}
        <PaymentModal
          isOpen={isPaymentOpen}
          totalAmount={netTotal}
          promptpayId={storeSettings.promptpay_id || '0812345678'}
          isProcessing={isProcessingOrder}
          onClose={() => setIsPaymentOpen(false)}
          onProcessPayment={handleProcessPayment}
        />

        <ReceiptModal
          isOpen={isReceiptOpen}
          order={completedOrder}
          storeSettings={storeSettings}
          onClose={() => setIsReceiptOpen(false)}
        />

        <ConfirmModal
          isOpen={isClearConfirmOpen}
          title="ยืนยันการล้างตะกร้าสินค้า"
          message="คุณต้องการล้างรายการสินค้าทั้งหมดในตะกร้าและเริ่มบิลใหม่หรือไม่?"
          confirmText="ล้างตะกร้า"
          isDanger={true}
          onConfirm={clearCart}
          onCancel={() => setIsClearConfirmOpen(false)}
        />
      </div>
    </AuthGuard>
  );
}
