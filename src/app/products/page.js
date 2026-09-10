"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import AuthGuard from '@/components/AuthGuard';
import ConfirmModal from '@/components/ConfirmModal';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Upload,
  Image as ImageIcon,
  FolderPlus,
  X,
  Loader2,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Product Modal (Add/Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'Dress',
    cost_price: '',
    selling_price: '',
    stock: '',
    min_stock: '5',
    image_url: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Delete Confirm Modal
  const [deleteProductTarget, setDeleteProductTarget] = useState(null);

  // Category Management Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Fetch Products & Categories
  const fetchProductsAndCategories = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data: prods } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (prods) setProducts(prods);

        const { data: cats } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        if (cats) setCategories(cats);
      } else {
        const local = localStorage.getItem('nongkame_local_products');
        if (local) setProducts(JSON.parse(local));
        setCategories([
          { id: '1', name: 'Dress' },
          { id: '2', name: 'Top' },
          { id: '3', name: 'Bottom' },
          { id: '4', name: 'Outerwear' },
        ]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  // Open Add Product Modal
  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingId(null);
    setForm({
      name: '',
      sku: 'NK-' + Math.floor(1000 + Math.random() * 9000),
      category: categories[0]?.name || 'Dress',
      cost_price: '',
      selling_price: '',
      stock: '10',
      min_stock: '5',
      image_url: '',
    });
    setIsModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEdit = (p) => {
    setModalMode('edit');
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku || '',
      category: p.category || categories[0]?.name || 'Dress',
      cost_price: p.cost_price?.toString() || '',
      selling_price: (p.selling_price || p.price)?.toString() || '',
      stock: p.stock?.toString() || '0',
      min_stock: p.min_stock?.toString() || '5',
      image_url: p.image_url || '',
    });
    setIsModalOpen(true);
  };

  // Upload image to Supabase Storage
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      if (isSupabaseConfigured()) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        setForm((prev) => ({ ...prev, image_url: publicUrl }));
        toast.success('อัปโหลดรูปภาพขึ้น Supabase Storage สำเร็จ!');
      } else {
        // Local FileReader
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm((prev) => ({ ...prev, image_url: reader.result }));
          toast.success('อัปโหลดรูปภาพสำเร็จ');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Upload image error:', err);
      toast.error('อัปโหลดรูปล้มเหลว: ' + (err.message || 'โปรดตรวจสอบ Storage Bucket'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Save (Create or Update) Product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!form.name || !form.selling_price) {
      toast.error('กรุณากรอกชื่อและราคาขาย');
      return;
    }

    setSavingProduct(true);
    const cost = parseFloat(form.cost_price) || 0;
    const price = parseFloat(form.selling_price) || 0;
    const stockQty = parseInt(form.stock, 10) || 0;
    const minQty = parseInt(form.min_stock, 10) || 5;

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || `NK-${Date.now().toString().slice(-4)}`,
      category: form.category,
      cost_price: cost,
      selling_price: price,
      stock: stockQty,
      min_stock: minQty,
      image_url: form.image_url.trim() || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop',
      is_active: true,
    };

    try {
      if (isSupabaseConfigured()) {
        if (modalMode === 'add') {
          const { error } = await supabase.from('products').insert([payload]);
          if (error) throw error;
          toast.success(`เพิ่มสินค้า "${payload.name}" สำเร็จ`);
        } else {
          const { error } = await supabase
            .from('products')
            .update(payload)
            .eq('id', editingId);
          if (error) throw error;
          toast.success(`แก้ไขสินค้า "${payload.name}" สำเร็จ`);
        }
      } else {
        // Local state
        let updatedList = [];
        if (modalMode === 'add') {
          const newP = { ...payload, id: 'prod-' + Date.now() };
          updatedList = [newP, ...products];
        } else {
          updatedList = products.map((p) =>
            p.id === editingId ? { ...p, ...payload } : p
          );
        }
        setProducts(updatedList);
        localStorage.setItem('nongkame_local_products', JSON.stringify(updatedList));
        toast.success(`${modalMode === 'add' ? 'เพิ่ม' : 'แก้ไข'}สินค้าสำเร็จ`);
      }

      setIsModalOpen(false);
      fetchProductsAndCategories();
    } catch (err) {
      console.error('Save product error:', err);
      toast.error('บันทึกสินค้าล้มเหลว: ' + err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  // Delete Product
  const handleConfirmDelete = async () => {
    if (!deleteProductTarget) return;

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', deleteProductTarget.id);
        if (error) throw error;
      } else {
        const updated = products.filter((p) => p.id !== deleteProductTarget.id);
        setProducts(updated);
        localStorage.setItem('nongkame_local_products', JSON.stringify(updated));
      }

      toast.success(`ลบสินค้า "${deleteProductTarget.name}" เรียบร้อยแล้ว`);
      setDeleteProductTarget(null);
      fetchProductsAndCategories();
    } catch (err) {
      console.error('Delete product error:', err);
      toast.error('ลบสินค้าไม่สำเร็จ: ' + err.message);
    }
  };

  // Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('categories').insert([
          { name: newCatName.trim(), slug: newCatName.trim().toLowerCase() },
        ]);
        if (error) throw error;
      } else {
        setCategories((prev) => [...prev, { id: 'cat-' + Date.now(), name: newCatName.trim() }]);
      }

      toast.success(`เพิ่มหมวดหมู่ "${newCatName.trim()}" สำเร็จ`);
      setNewCatName('');
      fetchProductsAndCategories();
    } catch (err) {
      toast.error('เพิ่มหมวดหมู่ล้มเหลว: ' + err.message);
    }
  };

  // Form profit calculation
  const calculatedFormProfit = useMemo(() => {
    const cost = parseFloat(form.cost_price) || 0;
    const price = parseFloat(form.selling_price) || 0;
    const profit = price - cost;
    const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : 0;
    return { profit, margin };
  }, [form.cost_price, form.selling_price]);

  return (
    <AuthGuard allowedRoles={['admin', 'employee']}>
      <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package color="var(--primary)" size={24} />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>จัดการสินค้า (Product Management)</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              เพิ่ม แก้ไข กำหนดราคาทุน ราคาขาย สต็อก และอัปโหลดรูปภาพผ่าน Supabase Storage
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isAdmin && (
              <>
                <button
                  onClick={() => setIsCatModalOpen(true)}
                  className="btn-secondary"
                  style={{ padding: '0.6rem 1rem' }}
                >
                  <FolderPlus size={16} />
                  <span>หมวดหมู่</span>
                </button>
                <button
                  onClick={handleOpenAdd}
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.25rem' }}
                >
                  <Plus size={18} />
                  <span>เพิ่มสินค้าใหม่</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div
          className="glass"
          style={{
            padding: '1rem',
            borderRadius: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
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
              padding: '0.5rem 1rem',
              minWidth: '280px',
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
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
            {['All', ...categories.map((c) => c.name)].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: selectedCategory === cat ? 700 : 500,
                  background: selectedCategory === cat ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedCategory === cat ? '#ffffff' : 'var(--text-muted)',
                  border: `1px solid ${selectedCategory === cat ? 'var(--primary)' : 'var(--card-border)'}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>สินค้า</th>
                  <th style={{ padding: '0.85rem 1rem' }}>SKU</th>
                  <th style={{ padding: '0.85rem 1rem' }}>หมวดหมู่</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ราคาทุน</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ราคาขาย</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>กำไร/ชิ้น</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>คงเหลือ</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>สถานะสต็อก</th>
                  {isAdmin && <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      กำลังโหลดข้อมูลสินค้า...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      ไม่พบสินค้าที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const cost = Number(p.cost_price || 0);
                    const selling = Number(p.selling_price || p.price || 0);
                    const unitProfit = selling - cost;
                    const stock = p.stock || 0;
                    const isOut = stock <= 0;
                    const isLow = !isOut && stock <= (p.min_stock || 5);

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid var(--card-border)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <img
                              src={p.image_url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop'}
                              alt={p.name}
                              style={{ width: '40px', height: '40px', borderRadius: '0.4rem', objectFit: 'cover' }}
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
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {formatCurrency(cost)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          {formatCurrency(selling)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                          +{formatCurrency(unitProfit)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>
                          {stock}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {isOut ? (
                            <span className="badge badge-danger">หมดสต็อก</span>
                          ) : isLow ? (
                            <span className="badge badge-warning">ใกล้หมด</span>
                          ) : (
                            <span className="badge badge-success">ปกติ</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                style={{
                                  padding: '0.4rem',
                                  borderRadius: '0.4rem',
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  color: 'var(--text-color)',
                                  cursor: 'pointer',
                                }}
                                title="แก้ไขสินค้า"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteProductTarget(p)}
                                style={{
                                  padding: '0.4rem',
                                  borderRadius: '0.4rem',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: 'var(--danger)',
                                  cursor: 'pointer',
                                }}
                                title="ลบสินค้า"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add/Edit Product */}
        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '600px', padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {modalMode === 'add' ? 'เพิ่มสินค้าใหม่' : 'แก้ไขข้อมูลสินค้า'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Name */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">ชื่อสินค้า *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="เช่น เดรสสายเดี่ยวเกาหลีสีขาว"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* SKU */}
                  <div className="form-group">
                    <label className="form-label">รหัส SKU *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="NK-DRS-001"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      required
                    />
                  </div>

                  {/* Category */}
                  <div className="form-group">
                    <label className="form-label">หมวดหมู่</label>
                    <select
                      className="form-input"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      style={{ background: 'var(--input-bg)' }}
                    >
                      {categories.map((c) => (
                        <option key={c.id || c.name} value={c.name} style={{ background: '#1e293b' }}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cost Price */}
                  <div className="form-group">
                    <label className="form-label">ราคาทุน (บาท) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="350"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                      required
                    />
                  </div>

                  {/* Selling Price */}
                  <div className="form-group">
                    <label className="form-label">ราคาขาย (บาท) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="790"
                      value={form.selling_price}
                      onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                      required
                    />
                  </div>

                  {/* Profit Preview Banner */}
                  <div
                    style={{
                      gridColumn: 'span 2',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '0.65rem',
                      padding: '0.65rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}>
                      <TrendingUp size={16} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>กำไรต่อชิ้น (Profit Margin):</span>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.95rem' }}>
                      +{formatCurrency(calculatedFormProfit.profit)} ({calculatedFormProfit.margin}%)
                    </div>
                  </div>

                  {/* Initial Stock */}
                  <div className="form-group">
                    <label className="form-label">จำนวนสต็อกคงเหลือ *</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="20"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      required
                    />
                  </div>

                  {/* Min Stock */}
                  <div className="form-group">
                    <label className="form-label">สต็อกขั้นต่ำที่ต้องแจ้งเตือน</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="5"
                      value={form.min_stock}
                      onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                      required
                    />
                  </div>

                  {/* Image Upload / Storage */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">รูปภาพสินค้า (Supabase Storage)</label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {form.image_url ? (
                        <img
                          src={form.image_url}
                          alt="preview"
                          style={{ width: '60px', height: '60px', borderRadius: '0.5rem', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '0.5rem',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px dashed var(--card-border)',
                          }}
                        >
                          <ImageIcon size={20} color="var(--text-muted)" />
                        </div>
                      )}

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label
                          className="btn-secondary"
                          style={{ display: 'inline-flex', cursor: 'pointer', padding: '0.45rem 0.85rem' }}
                        >
                          <Upload size={15} />
                          <span>{uploadingImage ? 'กำลังอัปโหลด...' : 'เลือกไฟล์รูปภาพเพื่ออัปโหลด'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="หรือวาง URL รูปภาพโดยตรง..."
                          value={form.image_url}
                          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                          style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                    style={{ flex: 1 }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={savingProduct}
                    style={{ flex: 2 }}
                  >
                    {savingProduct ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <span>{modalMode === 'add' ? 'บันทึกสินค้า' : 'อัปเดตข้อมูล'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Category Management */}
        {isCatModalOpen && (
          <div className="modal-overlay" onClick={() => setIsCatModalOpen(false)}>
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '440px', padding: '1.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>จัดการหมวดหมู่สินค้า</h3>
                <button onClick={() => setIsCatModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ชื่อหมวดหมู่ใหม่ เช่น Shoes, Accessories"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="btn-primary">
                  <Plus size={16} /> เพิ่ม
                </button>
              </form>

              <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {categories.map((c) => (
                  <div
                    key={c.id || c.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span>{c.name}</span>
                    <span className="badge badge-secondary">{products.filter((p) => p.category === c.name).length} สินค้า</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation */}
        <ConfirmModal
          isOpen={Boolean(deleteProductTarget)}
          title="ยืนยันการลบสินค้า"
          message={`คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${deleteProductTarget?.name}"? การดำเนินการนี้ไม่สามารถเรียกคืนได้`}
          confirmText="ลบสินค้า"
          isDanger={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteProductTarget(null)}
        />
      </div>
    </AuthGuard>
  );
}
