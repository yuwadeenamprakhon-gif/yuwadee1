-- ================================================================
-- NONGKAME888 POS - COMPLETE SUPABASE DATABASE SCHEMA & SETUP
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- 1. PROFILES TABLE (Linked with Supabase Auth users)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'employee', 'customer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------------
-- 3. PRODUCTS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category TEXT, -- kept for simple queries and backward compatibility
    image_url TEXT,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price NUMERIC(12, 2) GENERATED ALWAYS AS (selling_price) STORED, -- alias for backward compatibility
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for fast searching
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- ----------------------------------------------------------------
-- 4. ORDERS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Customer
    cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Cashier / Employee / Admin
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'promptpay')),
    payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    order_status TEXT NOT NULL DEFAULT 'completed' CHECK (order_status IN ('completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- ----------------------------------------------------------------
-- 5. ORDER ITEMS TABLE (Stores snapshot of cost & unit price at sale)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0, -- CRITICAL: Historical cost price at time of sale!
    price_at_time NUMERIC(12, 2) GENERATED ALWAYS AS (unit_price) STORED, -- alias for backward compatibility
    subtotal NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- ----------------------------------------------------------------
-- 6. PAYMENTS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'promptpay')),
    amount NUMERIC(12, 2) NOT NULL,
    amount_received NUMERIC(12, 2) DEFAULT 0,
    change_amount NUMERIC(12, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    transaction_ref TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- ----------------------------------------------------------------
-- 7. INVENTORY MOVEMENTS TABLE (Audit trail for stock changes)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_before INTEGER NOT NULL,
    quantity_delta INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('sale', 'restock', 'adjustment', 'return', 'initial')),
    reference_id TEXT, -- e.g. order_id or adjustment note
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory_movements(created_at);

-- ----------------------------------------------------------------
-- 8. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = broadcast to all staff
    type TEXT NOT NULL CHECK (type IN ('low_stock', 'out_of_stock', 'new_order', 'payment_success', 'stock_change', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- ----------------------------------------------------------------
-- 9. STORE SETTINGS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_name TEXT NOT NULL DEFAULT 'Nongkame888',
    address TEXT DEFAULT '123 Fashion Street, Bangkok, Thailand',
    phone TEXT DEFAULT '081-234-5678',
    tax_id TEXT DEFAULT '0105558123456',
    promptpay_id TEXT DEFAULT '0812345678',
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default store settings if none exists
INSERT INTO public.store_settings (store_name, address, phone, promptpay_id)
SELECT 'Nongkame888 - Women Fashion', '99/8 Fashion Avenue, Sukhumvit, Bangkok 10110', '081-234-5678', '0812345678'
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);

-- ----------------------------------------------------------------
-- TRIGGERS & FUNCTIONS
-- ----------------------------------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_products ON public.products;
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_orders ON public.orders;
CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for auto-creating profile when user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    first_user BOOLEAN;
BEGIN
    SELECT count(*) = 0 INTO first_user FROM public.profiles;
    
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN first_user THEN 'admin'
            WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'employee', 'customer') THEN NEW.raw_user_meta_data->>'role'
            ELSE 'customer'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- ATOMIC TRANSACTION RPC: PROCESS POS ORDER
-- This performs stock check, order creation, order_items snapshot,
-- stock decrement, inventory movement, payment, and notification
-- in a single ACID transaction!
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_pos_order(
    p_customer_id UUID,
    p_cashier_id UUID,
    p_items JSONB, -- Array of { product_id, quantity, unit_price }
    p_payment_method TEXT,
    p_subtotal NUMERIC,
    p_discount NUMERIC,
    p_total_amount NUMERIC,
    p_amount_received NUMERIC,
    p_change_amount NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_number TEXT;
    v_item JSONB;
    v_product_id UUID;
    v_qty INT;
    v_unit_price NUMERIC;
    v_cost_price NUMERIC;
    v_product_name TEXT;
    v_current_stock INT;
    v_min_stock INT;
    v_new_stock INT;
    v_item_subtotal NUMERIC;
BEGIN
    -- 1. Validate Stock for all items first
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;

        SELECT name, stock, min_stock, cost_price
        INTO v_product_name, v_current_stock, v_min_stock, v_cost_price
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE; -- Row lock to prevent race conditions

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product with ID % not found', v_product_id;
        END IF;

        IF v_current_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product "%". Available: %, Requested: %', v_product_name, v_current_stock, v_qty;
        END IF;
    END LOOP;

    -- 2. Generate unique order number
    v_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

    -- 3. Insert into orders table
    INSERT INTO public.orders (
        order_number, user_id, cashier_id, subtotal, discount, total_amount,
        payment_method, payment_status, order_status, notes
    ) VALUES (
        v_order_number, p_customer_id, p_cashier_id, p_subtotal, p_discount, p_total_amount,
        p_payment_method, 'completed', 'completed', p_notes
    ) RETURNING id INTO v_order_id;

    -- 4. Insert items, deduct stock, record movements
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_item_subtotal := v_qty * v_unit_price;

        -- Get product snapshot
        SELECT name, stock, min_stock, cost_price
        INTO v_product_name, v_current_stock, v_min_stock, v_cost_price
        FROM public.products
        WHERE id = v_product_id;

        -- Insert order_item with HISTORICAL cost_price!
        INSERT INTO public.order_items (
            order_id, product_id, product_name, quantity, unit_price, cost_price, subtotal
        ) VALUES (
            v_order_id, v_product_id, v_product_name, v_qty, v_unit_price, v_cost_price, v_item_subtotal
        );

        -- Deduct stock
        v_new_stock := v_current_stock - v_qty;
        UPDATE public.products
        SET stock = v_new_stock
        WHERE id = v_product_id;

        -- Record inventory movement
        INSERT INTO public.inventory_movements (
            product_id, quantity_before, quantity_delta, quantity_after, reason, reference_id, user_id
        ) VALUES (
            v_product_id, v_current_stock, -v_qty, v_new_stock, 'sale', v_order_number, p_cashier_id
        );

        -- Check low stock or out of stock notification
        IF v_new_stock = 0 THEN
            INSERT INTO public.notifications (type, title, message)
            VALUES ('out_of_stock', 'สินค้าหมดสต็อก!', 'สินค้า "' || v_product_name || '" หมดสต็อกแล้ว');
        ELSIF v_new_stock <= v_min_stock THEN
            INSERT INTO public.notifications (type, title, message)
            VALUES ('low_stock', 'สินค้าใกล้หมดสต็อก', 'สินค้า "' || v_product_name || '" เหลือเพียง ' || v_new_stock || ' ชิ้น');
        END IF;
    END LOOP;

    -- 5. Insert payment
    INSERT INTO public.payments (
        order_id, payment_method, amount, amount_received, change_amount, status
    ) VALUES (
        v_order_id, p_payment_method, p_total_amount, p_amount_received, p_change_amount, 'completed'
    );

    -- 6. Insert new order notification
    INSERT INTO public.notifications (type, title, message)
    VALUES ('new_order', 'ออเดอร์ใหม่ #' || v_order_number, 'ยอดชำระ ฿' || p_total_amount || ' (' || p_payment_method || ')');

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', p_total_amount,
        'payment_method', p_payment_method
    );
END;
$$;

-- ----------------------------------------------------------------
-- STORAGE SETUP (For Product Images)
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage public read policy
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Storage upload policy for authenticated staff
DROP POLICY IF EXISTS "Staff Upload" ON storage.objects;
CREATE POLICY "Staff Upload" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND
    auth.role() = 'authenticated'
);

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles
FOR SELECT USING (
    auth.uid() = id OR public.get_current_role() IN ('admin', 'employee')
);

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" ON public.profiles
FOR UPDATE USING (
    auth.uid() = id OR public.get_current_role() = 'admin'
);

-- CATEGORIES
DROP POLICY IF EXISTS "Categories read policy" ON public.categories;
CREATE POLICY "Categories read policy" ON public.categories
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categories admin policy" ON public.categories;
CREATE POLICY "Categories admin policy" ON public.categories
FOR ALL USING (public.get_current_role() = 'admin');

-- PRODUCTS
DROP POLICY IF EXISTS "Products read policy" ON public.products;
CREATE POLICY "Products read policy" ON public.products
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products admin policy" ON public.products;
CREATE POLICY "Products admin policy" ON public.products
FOR ALL USING (public.get_current_role() = 'admin');

DROP POLICY IF EXISTS "Products employee update stock policy" ON public.products;
CREATE POLICY "Products employee update stock policy" ON public.products
FOR UPDATE USING (public.get_current_role() IN ('admin', 'employee'));

-- ORDERS
DROP POLICY IF EXISTS "Orders select policy" ON public.orders;
CREATE POLICY "Orders select policy" ON public.orders
FOR SELECT USING (
    public.get_current_role() IN ('admin', 'employee') OR
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "Orders insert policy" ON public.orders;
CREATE POLICY "Orders insert policy" ON public.orders
FOR INSERT WITH CHECK (
    public.get_current_role() IN ('admin', 'employee') OR
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Orders admin update policy" ON public.orders;
CREATE POLICY "Orders admin update policy" ON public.orders
FOR UPDATE USING (public.get_current_role() = 'admin');

-- ORDER ITEMS
DROP POLICY IF EXISTS "Order items select policy" ON public.order_items;
CREATE POLICY "Order items select policy" ON public.order_items
FOR SELECT USING (
    public.get_current_role() IN ('admin', 'employee') OR
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Order items insert policy" ON public.order_items;
CREATE POLICY "Order items insert policy" ON public.order_items
FOR INSERT WITH CHECK (
    public.get_current_role() IN ('admin', 'employee') OR
    auth.uid() IS NOT NULL
);

-- PAYMENTS
DROP POLICY IF EXISTS "Payments select policy" ON public.payments;
CREATE POLICY "Payments select policy" ON public.payments
FOR SELECT USING (
    public.get_current_role() IN ('admin', 'employee') OR
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Payments insert policy" ON public.payments;
CREATE POLICY "Payments insert policy" ON public.payments
FOR INSERT WITH CHECK (public.get_current_role() IN ('admin', 'employee') OR auth.uid() IS NOT NULL);

-- INVENTORY MOVEMENTS
DROP POLICY IF EXISTS "Inventory movements policy" ON public.inventory_movements;
CREATE POLICY "Inventory movements policy" ON public.inventory_movements
FOR SELECT USING (public.get_current_role() IN ('admin', 'employee'));

DROP POLICY IF EXISTS "Inventory movements insert policy" ON public.inventory_movements;
CREATE POLICY "Inventory movements insert policy" ON public.inventory_movements
FOR INSERT WITH CHECK (public.get_current_role() IN ('admin', 'employee'));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
CREATE POLICY "Notifications select policy" ON public.notifications
FOR SELECT USING (
    public.get_current_role() IN ('admin', 'employee') OR
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "Notifications update policy" ON public.notifications;
CREATE POLICY "Notifications update policy" ON public.notifications
FOR UPDATE USING (
    public.get_current_role() IN ('admin', 'employee') OR
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "Notifications insert policy" ON public.notifications;
CREATE POLICY "Notifications insert policy" ON public.notifications
FOR INSERT WITH CHECK (true);

-- STORE SETTINGS
DROP POLICY IF EXISTS "Store settings read policy" ON public.store_settings;
CREATE POLICY "Store settings read policy" ON public.store_settings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Store settings admin policy" ON public.store_settings;
CREATE POLICY "Store settings admin policy" ON public.store_settings
FOR ALL USING (public.get_current_role() = 'admin');

-- Enable Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products, public.orders, public.inventory_movements, public.notifications;
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$;

-- ----------------------------------------------------------------
-- SEED DATA: CATEGORIES & PRODUCTS
-- ----------------------------------------------------------------
INSERT INTO public.categories (id, name, slug) VALUES
('11111111-1111-1111-1111-111111111111', 'Dress', 'dress'),
('22222222-2222-2222-2222-222222222222', 'Top', 'top'),
('33333333-3333-3333-3333-333333333333', 'Bottom', 'bottom'),
('44444444-4444-4444-4444-444444444444', 'Outerwear', 'outerwear')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.products (name, sku, category_id, category, cost_price, selling_price, stock, min_stock, image_url) VALUES
('White Off-Shoulder Ruffle Dress', 'NK-DRS-001', '11111111-1111-1111-1111-111111111111', 'Dress', 450.00, 890.00, 25, 5, 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&h=800&fit=crop'),
('Floral Sweetheart Mini Dress', 'NK-DRS-002', '11111111-1111-1111-1111-111111111111', 'Dress', 380.00, 790.00, 18, 5, 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=800&fit=crop'),
('Minimalist Cafe Hopping Dress', 'NK-DRS-003', '11111111-1111-1111-1111-111111111111', 'Dress', 500.00, 950.00, 12, 4, 'https://images.unsplash.com/photo-1502716115624-b12a8069d2f2?w=600&h=800&fit=crop'),
('Pastel Blue Pleated Skirt', 'NK-BTM-001', '33333333-3333-3333-3333-333333333333', 'Bottom', 280.00, 590.00, 30, 8, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop'),
('Cute Ribbon Tie Crop Top', 'NK-TOP-001', '22222222-2222-2222-2222-222222222222', 'Top', 200.00, 450.00, 35, 10, 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&h=800&fit=crop'),
('Vintage Plaid Midi Dress', 'NK-DRS-004', '11111111-1111-1111-1111-111111111111', 'Dress', 600.00, 1190.00, 8, 3, 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=800&fit=crop'),
('Chiffon Long Sleeve Blouse', 'NK-TOP-002', '22222222-2222-2222-2222-222222222222', 'Top', 320.00, 650.00, 22, 6, 'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=600&h=800&fit=crop'),
('High-Waist Denim Skirt', 'NK-BTM-002', '33333333-3333-3333-3333-333333333333', 'Bottom', 300.00, 590.00, 15, 5, 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=800&fit=crop'),
('Elegant Knitted Cardigan', 'NK-OUT-001', '44444444-4444-4444-4444-444444444444', 'Outerwear', 400.00, 790.00, 14, 4, 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&h=800&fit=crop'),
('Summer Breeze Linen Dress', 'NK-DRS-005', '11111111-1111-1111-1111-111111111111', 'Dress', 420.00, 850.00, 16, 5, 'https://images.unsplash.com/photo-1524041255072-7da0525d6b34?w=600&h=800&fit=crop'),
('Casual Oversized Blazer', 'NK-OUT-002', '44444444-4444-4444-4444-444444444444', 'Outerwear', 650.00, 1290.00, 9, 3, 'https://images.unsplash.com/photo-1550614000-4b95d466e319?w=600&h=800&fit=crop'),
('Sweet Pink Slip Dress', 'NK-DRS-006', '11111111-1111-1111-1111-111111111111', 'Dress', 390.00, 750.00, 20, 5, 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&h=800&fit=crop')
ON CONFLICT (sku) DO NOTHING;
