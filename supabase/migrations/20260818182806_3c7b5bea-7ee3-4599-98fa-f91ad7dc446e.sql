-- ===== Enums =====
CREATE TYPE public.plant_size AS ENUM ('xs','s','m','l','xl');
CREATE TYPE public.listing_status AS ENUM ('draft','active','reserved','sold','archived');
CREATE TYPE public.order_status AS ENUM ('placed','accepted','ready','in_transit','delivered','completed','cancelled','refunded','disputed');
CREATE TYPE public.delivery_method AS ENUM ('pickup','shipping');
CREATE TYPE public.box_size AS ENUM ('s','m','l','xl');
CREATE TYPE public.disclosure_kind AS ENUM ('disease','pest','leaf_damage','repot','other');
CREATE TYPE public.wallet_txn_kind AS ENUM ('sale','commission','shipping','refund','payout','adjustment');
CREATE TYPE public.payout_status AS ENUM ('requested','approved','paid','rejected');

-- ===== user_plants overrides =====
ALTER TABLE public.user_plants
  ADD COLUMN IF NOT EXISTS size public.plant_size,
  ADD COLUMN IF NOT EXISTS acquired_at date;

-- ===== settings =====
CREATE TABLE public.marketplace_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  commission_bps integer NOT NULL DEFAULT 700,
  active_countries text[] NOT NULL DEFAULT ARRAY['NL','BE','DE'],
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_settings TO authenticated;
GRANT ALL ON public.marketplace_settings TO service_role;
ALTER TABLE public.marketplace_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.marketplace_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin write" ON public.marketplace_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.marketplace_settings (id) VALUES (true);

-- ===== listings =====
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_id uuid REFERENCES public.user_plants(id) ON DELETE SET NULL,
  species_id uuid REFERENCES public.plant_species(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  size public.plant_size,
  age_months integer,
  health_rating integer CHECK (health_rating BETWEEN 1 AND 5),
  country_code text NOT NULL DEFAULT 'NL',
  allow_pickup boolean NOT NULL DEFAULT true,
  allow_shipping boolean NOT NULL DEFAULT false,
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  box_size public.box_size,
  cover_photo_path text,
  status public.listing_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  sold_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.marketplace_listings (status, created_at DESC);
CREATE INDEX ON public.marketplace_listings (seller_id);
GRANT SELECT, INSERT, UPDATE ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings public read active" ON public.marketplace_listings FOR SELECT TO authenticated
  USING (status IN ('active','reserved','sold') AND archived_at IS NULL);
CREATE POLICY "listings owner read" ON public.marketplace_listings FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "listings owner insert" ON public.marketplace_listings FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());
CREATE POLICY "listings owner update" ON public.marketplace_listings FOR UPDATE TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER marketplace_listings_set_updated_at BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== disclosures =====
CREATE TABLE public.listing_disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  kind public.disclosure_kind NOT NULL,
  description text NOT NULL,
  occurred_on date,
  resolved_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.listing_disclosures (listing_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_disclosures TO authenticated;
GRANT ALL ON public.listing_disclosures TO service_role;
ALTER TABLE public.listing_disclosures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disclosures readable with listing" ON public.listing_disclosures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id
    AND (l.seller_id = auth.uid() OR l.status IN ('active','reserved','sold'))));
CREATE POLICY "disclosures owner write" ON public.listing_disclosures FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id AND l.seller_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id AND l.seller_id = auth.uid()));

-- ===== orders =====
CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_cents integer NOT NULL,
  shipping_cents integer NOT NULL DEFAULT 0,
  commission_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  payment_provider text NOT NULL DEFAULT 'simulated',
  status public.order_status NOT NULL DEFAULT 'placed',
  delivery_method public.delivery_method NOT NULL,
  box_size public.box_size,
  pickup_slot timestamptz,
  ship_by date,
  expected_delivery date,
  carrier text,
  tracking_number text,
  buyer_note text,
  buyer_address text,
  pickup_address text,
  accepted_at timestamptz,
  ready_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.marketplace_orders (buyer_id, created_at DESC);
CREATE INDEX ON public.marketplace_orders (seller_id, created_at DESC);
GRANT SELECT ON public.marketplace_orders TO authenticated;
GRANT ALL ON public.marketplace_orders TO service_role;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders party read" ON public.marketplace_orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER marketplace_orders_set_updated_at BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  actor_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.order_events (order_id, created_at);
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order events party read" ON public.order_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id
    AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- ===== wallet =====
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_cents integer NOT NULL DEFAULT 0,
  pending_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet owner read" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER wallets_set_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.marketplace_orders(id) ON DELETE SET NULL,
  kind public.wallet_txn_kind NOT NULL,
  amount_cents integer NOT NULL,
  balance_after_cents integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.wallet_transactions (user_id, created_at DESC);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet txn owner read" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  iban_last4 text,
  status public.payout_status NOT NULL DEFAULT 'requested',
  admin_id uuid,
  admin_note text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payout_requests (status, created_at);
GRANT SELECT ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts owner read" ON public.payout_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER payout_requests_set_updated_at BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== marketplace seller profile prefs =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketplace_show_avatar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketplace_sales_count integer NOT NULL DEFAULT 0;