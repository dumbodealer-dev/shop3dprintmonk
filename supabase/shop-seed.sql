-- ─────────────────────────────────────────────────────────────────────────────
-- 3D PRINTMONK SHOP — SAMPLE DATA for development / staging.
-- Run after shop-schema.sql to try the store end-to-end. Safe to re-run.
-- Before launch: replace with your real catalogue in /shop/admin (or archive these),
-- add real photos, and delete the TEST coupons.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.shop_categories (slug, name, description, sort_order) values
  ('home-decor', 'Home & Decor', 'Planters, lamps and sculptural pieces printed in-house.', 10),
  ('desk-office', 'Desk & Office', 'Organisers, stands and cable management for a tidy workspace.', 20),
  ('toys-collectibles', 'Toys & Collectibles', 'Articulated toys, miniatures and display pieces.', 30),
  ('gadgets-accessories', 'Gadgets & Accessories', 'Practical prints for phones, headphones and everyday carry.', 40),
  ('personalised-gifts', 'Personalised Gifts', 'Made-to-order gifts with your name, text or colours.', 50)
on conflict (slug) do nothing;

insert into public.shop_categories (slug, name, parent_id, sort_order) values
  ('planters', 'Planters', (select id from public.shop_categories where slug = 'home-decor'), 11),
  ('lamps', 'Lamps & Lighting', (select id from public.shop_categories where slug = 'home-decor'), 12),
  ('miniatures', 'Resin Miniatures', (select id from public.shop_categories where slug = 'toys-collectibles'), 31)
on conflict (slug) do nothing;

-- Products ------------------------------------------------------------------
insert into public.shop_products
  (slug, name, short_description, description, category_id, status, print_technology, material, finish, colors,
   length_mm, width_mm, height_mm, weight_g, hsn_code, gst_rate, specifications, customization, lead_time_days,
   is_featured, is_bestseller, is_new, tags)
values
  ('geometric-planter', 'Geometric Faceted Planter', 'Low-poly planter with drainage hole and drip tray.',
   E'A faceted, low-poly planter printed in PETG so it handles water and sunlight. Comes with a matching drip tray.\n\nPerfect for succulents, cacti and small indoor plants.',
   (select id from public.shop_categories where slug = 'planters'), 'active', 'fdm', 'PETG', 'As printed (matte layer lines)', array['Monk Orange', 'Charcoal', 'White'],
   120, 120, 110, 180, '3926', 18,
   '[{"label":"Layer height","value":"0.2 mm"},{"label":"Drainage","value":"Yes, with drip tray"},{"label":"Water resistant","value":"Yes (PETG)"}]',
   '[]', 2, true, true, false, array['planter', 'pot', 'succulent', 'home']),

  ('articulated-dragon', 'Articulated Flexi Dragon', 'Print-in-place dragon with fully moving joints.',
   E'Every segment moves — printed in one piece with no assembly. A favourite desk toy and gift.\n\nNot suitable for children under 3 (small parts).',
   (select id from public.shop_categories where slug = 'toys-collectibles'), 'active', 'fdm', 'PLA', 'Silk sheen', array['Silk Gold', 'Rainbow', 'Galaxy Black'],
   300, 140, 40, 95, '9503', 12,
   '[{"label":"Joints","value":"Print-in-place"},{"label":"Age","value":"3+"}]',
   '[]', 1, true, true, true, array['dragon', 'flexi', 'toy', 'gift']),

  ('custom-name-keychain', 'Custom Name Keychain', 'Your name or short text, printed in two colours.',
   E'Personalised two-colour keychain with a sturdy metal ring. Great for gifts, bags and event giveaways.',
   (select id from public.shop_categories where slug = 'personalised-gifts'), 'active', 'fdm', 'PLA', 'Two-colour', array['Orange on Black', 'White on Blue', 'Black on White'],
   70, 25, 5, 8, '3926', 18,
   '[{"label":"Ring","value":"Steel split ring"}]',
   '[{"id":"text","label":"Name or text","type":"text","required":true,"maxLength":14,"placeholder":"e.g. ANANYA","priceDelta":0},
     {"id":"font","label":"Font style","type":"select","required":true,"choices":[{"label":"Bold sans","priceDelta":0},{"label":"Script","priceDelta":20},{"label":"Stencil","priceDelta":0}]},
     {"id":"gift","label":"Gift wrap","type":"checkbox","required":false,"priceDelta":30}]',
   3, true, false, true, array['keychain', 'personalised', 'name', 'gift']),

  ('hex-desk-organiser', 'Hex Modular Desk Organiser', 'Stackable hexagon pen and tool holders.',
   E'A set of interlocking hexagonal cups that snap together in any layout. Holds pens, brushes, tools and cables.',
   (select id from public.shop_categories where slug = 'desk-office'), 'active', 'fdm', 'PLA', 'Matte', array['Charcoal', 'White', 'Monk Orange'],
   180, 150, 100, 210, '3926', 18,
   '[{"label":"Pieces","value":"Set of 5 cups"},{"label":"Modular","value":"Snap-fit"}]',
   '[]', 2, false, true, false, array['desk', 'organiser', 'pen holder', 'office']),

  ('headphone-stand', 'Curve Headphone Stand', 'Weighted, non-slip stand for over-ear headphones.',
   E'A sweeping curved stand with a weighted base and TPU non-slip pads.',
   (select id from public.shop_categories where slug = 'gadgets-accessories'), 'active', 'fdm', 'PETG', 'Matte', array['Charcoal', 'White'],
   140, 120, 260, 320, '3926', 18,
   '[{"label":"Pads","value":"TPU, non-slip"},{"label":"Fits","value":"All over-ear headphones"}]',
   '[]', 2, false, false, true, array['headphones', 'stand', 'gaming', 'desk']),

  ('lithophane-moon-lamp', 'Lithophane Moon Lamp', 'Realistic moon surface lamp with warm LED and USB power.',
   E'Printed from real lunar elevation data — the surface detail appears when the lamp is lit. Includes a warm-white USB LED base.',
   (select id from public.shop_categories where slug = 'lamps'), 'active', 'fdm', 'PLA', 'Translucent white', array['White'],
   150, 150, 160, 260, '9405', 18,
   '[{"label":"Power","value":"USB-C, 5 V"},{"label":"Light","value":"Warm white LED"}]',
   '[{"id":"engraving","label":"Engrave a message on the base","type":"text","required":false,"maxLength":30,"priceDelta":99}]',
   3, true, false, false, array['lamp', 'moon', 'lithophane', 'gift', 'night light']),

  ('resin-knight-miniature', 'Resin Knight Miniature (32 mm)', 'Highly detailed SLA resin miniature for tabletop gaming.',
   E'Printed on an SLA resin printer at 0.05 mm layers for crisp detail. Supplied unpainted and primed-ready.',
   (select id from public.shop_categories where slug = 'miniatures'), 'active', 'sla', 'Standard Resin', 'Unpainted, cleaned & cured', array['Grey'],
   32, 25, 40, 12, '9503', 12,
   '[{"label":"Scale","value":"32 mm"},{"label":"Layer height","value":"0.05 mm"}]',
   '[{"id":"painting","label":"Painting","type":"select","required":true,"choices":[{"label":"Unpainted","priceDelta":0},{"label":"Primed (grey)","priceDelta":60},{"label":"Hand-painted","priceDelta":650}]}]',
   4, false, false, true, array['miniature', 'resin', 'tabletop', 'dnd']),

  ('cable-clips-pack', 'Cable Clips (Pack of 10)', 'Adhesive-backed cable organisers for desks and walls.',
   E'Keep charging and monitor cables in place. Includes 3M adhesive pads.',
   (select id from public.shop_categories where slug = 'desk-office'), 'active', 'fdm', 'PETG', 'Matte', array['Black', 'White'],
   25, 20, 15, 30, '3926', 18,
   '[{"label":"Pack","value":"10 clips + adhesive pads"}]',
   '[]', 1, false, true, false, array['cable', 'clips', 'organiser'])
on conflict (slug) do nothing;

-- Variants (price & stock) ------------------------------------------------------
insert into public.shop_variants (product_id, sku, title, options, price, sale_price, stock, low_stock_threshold, weight_g, sort_order)
select p.id, v.sku, v.title, v.options::jsonb, v.price, v.sale_price, v.stock, 5, v.weight_g, v.sort_order
  from (values
    ('geometric-planter', 'PLN-GEO-S-ORG', 'Small / Monk Orange', '{"Size":"Small","Color":"Monk Orange"}', 449, 399, 25, 140, 1),
    ('geometric-planter', 'PLN-GEO-S-CHR', 'Small / Charcoal', '{"Size":"Small","Color":"Charcoal"}', 449, 399, 18, 140, 2),
    ('geometric-planter', 'PLN-GEO-L-ORG', 'Large / Monk Orange', '{"Size":"Large","Color":"Monk Orange"}', 749, null, 8, 320, 3),
    ('geometric-planter', 'PLN-GEO-L-WHT', 'Large / White', '{"Size":"Large","Color":"White"}', 749, null, 0, 320, 4),
    ('articulated-dragon', 'TOY-DRG-GOLD', 'Silk Gold', '{"Color":"Silk Gold"}', 699, 599, 30, 95, 1),
    ('articulated-dragon', 'TOY-DRG-RNBW', 'Rainbow', '{"Color":"Rainbow"}', 749, null, 12, 95, 2),
    ('articulated-dragon', 'TOY-DRG-GLXY', 'Galaxy Black', '{"Color":"Galaxy Black"}', 699, null, 3, 95, 3),
    ('custom-name-keychain', 'GFT-KEY-OB', 'Orange on Black', '{"Color":"Orange on Black"}', 199, null, 200, 8, 1),
    ('custom-name-keychain', 'GFT-KEY-WB', 'White on Blue', '{"Color":"White on Blue"}', 199, null, 200, 8, 2),
    ('custom-name-keychain', 'GFT-KEY-BW', 'Black on White', '{"Color":"Black on White"}', 199, null, 200, 8, 3),
    ('hex-desk-organiser', 'DSK-HEX-CHR', 'Charcoal', '{"Color":"Charcoal"}', 899, 799, 15, 210, 1),
    ('hex-desk-organiser', 'DSK-HEX-WHT', 'White', '{"Color":"White"}', 899, null, 10, 210, 2),
    ('hex-desk-organiser', 'DSK-HEX-ORG', 'Monk Orange', '{"Color":"Monk Orange"}', 899, null, 4, 210, 3),
    ('headphone-stand', 'GDG-HPS-CHR', 'Charcoal', '{"Color":"Charcoal"}', 999, null, 20, 320, 1),
    ('headphone-stand', 'GDG-HPS-WHT', 'White', '{"Color":"White"}', 999, null, 6, 320, 2),
    ('lithophane-moon-lamp', 'LMP-MOON-15', '15 cm', '{"Size":"15 cm"}', 1499, 1299, 10, 260, 1),
    ('lithophane-moon-lamp', 'LMP-MOON-20', '20 cm', '{"Size":"20 cm"}', 2199, null, 5, 480, 2),
    ('resin-knight-miniature', 'MIN-KNT-32', 'Default', '{}', 349, null, 40, 12, 1),
    ('cable-clips-pack', 'DSK-CBL-BLK', 'Black', '{"Color":"Black"}', 249, 199, 60, 30, 1),
    ('cable-clips-pack', 'DSK-CBL-WHT', 'White', '{"Color":"White"}', 249, 199, 60, 30, 2)
  ) as v(slug, sku, title, options, price, sale_price, stock, weight_g, sort_order)
  join public.shop_products p on p.slug = v.slug
on conflict do nothing;

-- Collections & homepage content ------------------------------------------------
insert into public.shop_collections (slug, name, description, is_featured, is_seasonal, sort_order) values
  ('desk-setup', 'The Desk Setup', 'Everything for a clean, functional workspace.', true, false, 10),
  ('gift-guide', 'Festive Gift Guide', 'Personalised and playful gifts, printed to order.', true, true, 20)
on conflict (slug) do nothing;

insert into public.shop_collection_products (collection_id, product_id, sort_order)
select c.id, p.id, x.sort_order
  from (values ('desk-setup', 'hex-desk-organiser', 1), ('desk-setup', 'headphone-stand', 2), ('desk-setup', 'cable-clips-pack', 3),
               ('gift-guide', 'custom-name-keychain', 1), ('gift-guide', 'lithophane-moon-lamp', 2), ('gift-guide', 'articulated-dragon', 3)) as x(c, p, sort_order)
  join public.shop_collections c on c.slug = x.c
  join public.shop_products p on p.slug = x.p
on conflict do nothing;

insert into public.shop_banners (placement, title, subtitle, cta_label, cta_url, theme, sort_order)
select * from (values
  ('hero', 'Printed in Delhi. Designed to be used.', 'Functional, decorative and personalised 3D printed products — made layer by layer in our own print farm.', 'Shop all products', '/products', 'dark', 10),
  ('promo', 'Personalise it', 'Add your name, colours or a message to selected products.', 'Shop personalised gifts', '/category/personalised-gifts', 'accent', 20),
  ('promo', 'Free shipping over ₹999', 'On all prepaid orders across India.', 'Start shopping', '/products', 'light', 30),
  ('strip', 'Free shipping on prepaid orders over ₹999 · Printed to order in Delhi', null, null, null, 'dark', 40)
) as b(placement, title, subtitle, cta_label, cta_url, theme, sort_order)
where not exists (select 1 from public.shop_banners);

-- TEST coupons — delete before launch.
insert into public.shop_coupons (code, description, type, value, max_discount, min_order_value, usage_limit, per_customer_limit, first_order_only)
values ('WELCOME10', '10% off your first order (max ₹200)', 'percent', 10, 200, 499, null, 1, true),
       ('FLAT100', '₹100 off orders above ₹999', 'fixed', 100, null, 999, 500, null, false),
       ('FREESHIP', 'Free shipping, no minimum', 'free_shipping', 0, null, 0, null, null, false)
on conflict do nothing;
