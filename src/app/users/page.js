"use client";

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import AuthGuard from '@/components/AuthGuard';
import ConfirmModal from '@/components/ConfirmModal';
import { formatDateTime } from '@/lib/formatters';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Edit,
  CheckCircle,
  X,
  Loader2,
} from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Role Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('customer');
  const [savingRole, setSavingRole] = useState(false);

  // Toggle Status Confirm Modal
  const [toggleStatusTarget, setToggleStatusTarget] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setUsers(data);
        }
      } else {
        const local = localStorage.getItem('nongkame_local_users');
        if (local) {
          setUsers(JSON.parse(local));
        } else {
          const sample = [
            { id: '1', email: 'admin@nongkame888.com', full_name: 'Store Manager (Admin)', role: 'admin', is_active: true, created_at: new Date().toISOString() },
            { id: '2', email: 'cashier@nongkame888.com', full_name: 'Somying Cashier', role: 'employee', is_active: true, created_at: new Date().toISOString() },
            { id: '3', email: 'customer1@gmail.com', full_name: 'Bella Fashion', role: 'customer', is_active: true, created_at: new Date().toISOString() },
            { id: '4', email: 'customer2@gmail.com', full_name: 'Praew VIP', role: 'customer', is_active: true, created_at: new Date().toISOString() },
          ];
          setUsers(sample);
          localStorage.setItem('nongkame_local_users', JSON.stringify(sample));
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  // Open Edit Role
  const openEditRole = (u) => {
    setSelectedUser(u);
    setNewRole(u.role || 'customer');
  };

  // Submit Role Change
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id && newRole !== 'admin') {
      toast.warning('คุณไม่สามารถปลดสิทธิ์ Admin ของตัวเองได้ เพื่อป้องกันระบบล็อค');
      return;
    }

    setSavingRole(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', selectedUser.id);
        if (error) throw error;
      } else {
        const updated = users.map((u) =>
          u.id === selectedUser.id ? { ...u, role: newRole } : u
        );
        setUsers(updated);
        localStorage.setItem('nongkame_local_users', JSON.stringify(updated));
      }

      toast.success(`เปลี่ยนสิทธิ์ ${selectedUser.full_name || selectedUser.email} เป็น ${newRole.toUpperCase()} สำเร็จ`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error('เปลี่ยนสิทธิ์ล้มเหลว: ' + err.message);
    } finally {
      setSavingRole(false);
    }
  };

  // Toggle Active/Disabled Status
  const handleConfirmToggleStatus = async () => {
    if (!toggleStatusTarget) return;

    if (toggleStatusTarget.id === currentUser?.id) {
      toast.warning('คุณไม่สามารถระงับบัญชีที่กำลังใช้งานอยู่ได้');
      setToggleStatusTarget(null);
      return;
    }

    const newStatus = !toggleStatusTarget.is_active;

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: newStatus })
          .eq('id', toggleStatusTarget.id);
        if (error) throw error;
      } else {
        const updated = users.map((u) =>
          u.id === toggleStatusTarget.id ? { ...u, is_active: newStatus } : u
        );
        setUsers(updated);
        localStorage.setItem('nongkame_local_users', JSON.stringify(updated));
      }

      toast.success(
        `${newStatus ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} บัญชี ${toggleStatusTarget.full_name || toggleStatusTarget.email} เรียบร้อย`
      );
      setToggleStatusTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error('เปลี่ยนสถานะล้มเหลว: ' + err.message);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-primary">ADMIN</span>;
      case 'employee':
        return <span className="badge badge-warning">EMPLOYEE</span>;
      default:
        return <span className="badge badge-success">CUSTOMER</span>;
    }
  };

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users color="var(--primary)" size={24} />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>จัดการผู้ใช้งาน (User Management)</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              ตรวจสอบรายชื่อ กำหนดระดับสิทธิ์ (Admin / Employee / Customer) และเปิด/ระงับการใช้งานบัญชี
            </p>
          </div>

          <button onClick={fetchUsers} className="btn-secondary">
            <RefreshCw size={16} />
            <span>รีเฟรช</span>
          </button>
        </div>

        {/* Search Bar */}
        <div
          className="glass"
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
          }}
        >
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, อีเมล หรือตำแหน่งผู้ใช้..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color)',
              width: '100%',
              marginLeft: '0.75rem',
              fontSize: '0.9rem',
            }}
          />
        </div>

        {/* Users Table */}
        <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>ผู้ใช้งาน</th>
                  <th style={{ padding: '0.85rem 1rem' }}>อีเมล</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>สิทธิ์ (Role)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>สถานะ</th>
                  <th style={{ padding: '0.85rem 1rem' }}>วันที่สมัคร</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      กำลังโหลดข้อมูลผู้ใช้งาน...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      ไม่พบผู้ใช้งานที่ตรงกับคำค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                            }}
                          >
                            {(u.full_name || u.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.full_name || 'ไม่ระบุชื่อ'}</div>
                            {u.id === currentUser?.id && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>(บัญชีของคุณ)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                        {u.email}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {getRoleBadge(u.role)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span className={u.is_active ? 'badge badge-success' : 'badge badge-danger'}>
                          {u.is_active ? 'ใช้งานได้' : 'ถูกระงับ'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                        {formatDateTime(u.created_at)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => openEditRole(u)}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title="เปลี่ยนสิทธิ์การใช้งาน"
                          >
                            <Edit size={13} />
                            <span>เปลี่ยนสิทธิ์</span>
                          </button>

                          <button
                            onClick={() => setToggleStatusTarget(u)}
                            disabled={u.id === currentUser?.id}
                            className={u.is_active ? 'btn-danger' : 'btn-primary'}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title={u.is_active ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}
                          >
                            {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                            <span>{u.is_active ? 'ระงับ' : 'เปิดใช้งาน'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Change Role */}
        {selectedUser && (
          <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '420px', padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>กำหนดสิทธิ์ผู้ใช้งาน</h3>
                <button onClick={() => setSelectedUser(null)} style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedUser.full_name || 'User'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedUser.email}</div>
              </div>

              <form onSubmit={handleSaveRole}>
                <div className="form-group">
                  <label className="form-label">เลือกระดับสิทธิ์ (Role)</label>
                  <select
                    className="form-input"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    style={{ background: 'var(--input-bg)' }}
                  >
                    <option value="admin" style={{ background: '#1e293b' }}>
                      Admin - ผู้ดูแลระบบ (เข้าถึงได้ทุกระบบ สินค้า สต็อก กำไร ผู้ใช้ ตั้งค่า)
                    </option>
                    <option value="employee" style={{ background: '#1e293b' }}>
                      Employee - พนักงาน (เข้าหน้า POS, ขายสินค้า, ปรับสต็อก, ดูออเดอร์)
                    </option>
                    <option value="customer" style={{ background: '#1e293b' }}>
                      Customer - ลูกค้า (ดูสินค้า ซื้อสินค้า ดูออเดอร์ของตนเอง)
                    </option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedUser(null)}
                    style={{ flex: 1 }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={savingRole}
                    style={{ flex: 1 }}
                  >
                    {savingRole ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirm Toggle Status */}
        <ConfirmModal
          isOpen={Boolean(toggleStatusTarget)}
          title={toggleStatusTarget?.is_active ? 'ยืนยันการระงับบัญชีผู้ใช้' : 'ยืนยันการเปิดใช้งานบัญชี'}
          message={`คุณต้องการ${toggleStatusTarget?.is_active ? 'ระงับ' : 'เปิด'}การใช้งานบัญชี "${toggleStatusTarget?.full_name || toggleStatusTarget?.email}" หรือไม่?`}
          confirmText={toggleStatusTarget?.is_active ? 'ระงับบัญชี' : 'เปิดใช้งาน'}
          isDanger={toggleStatusTarget?.is_active}
          onConfirm={handleConfirmToggleStatus}
          onCancel={() => setToggleStatusTarget(null)}
        />
      </div>
    </AuthGuard>
  );
}
