-- Seed: Products
INSERT INTO products (
    sku, barcode, name_en, name_si, name_ta, unit, category_id, is_scale_item, 
    tax_code, price_retail, price_wholesale, price_credit, price_other, 
    cost, reorder_level, preferred_supplier_id, is_active
) VALUES 
-- Rice (Grocery)
('RICE5', '1234567890123', 'Basmati Rice 5kg', 'බස්මති බත් 5කිලෝ', 'பஸ்மதி அரிசி 5கிலோ', 'pc', 1, false, 'TAX15', 1450.00, 1400.00, 1425.00, 1475.00, 1200.00, 10, 1, true),

-- Sugar (Grocery, Scale Item)
('SUGAR1', '1234567890124', 'White Sugar 1kg', 'සුදු සීනි 1කිලෝ', 'வெள்ளை சர்க்கரை 1கிலோ', 'kg', 1, true, 'TAX15', 210.00, 205.00, 207.50, 212.50, 180.00, 50, 2, true),

-- Flour (Grocery)
('FLOUR1', '1234567890125', 'Wheat Flour 1kg', 'ගම්මිරිස් පිටි 1කිලෝ', 'கோதுமை மாவு 1கிலோ', 'pc', 1, false, 'TAX15', 260.00, 250.00, 255.00, 265.00, 220.00, 20, 3, true),

-- Milk (Grocery)
('MILK1L', '1234567890126', 'Fresh Milk 1L', 'තැනුම් කිරි 1ලීටර්', 'புதிய பால் 1லிட்டர்', 'pc', 1, false, 'TAX15', 390.00, 370.00, 380.00, 400.00, 320.00, 30, 4, true),

-- Eggs (Grocery)
('EGG10', '1234567890127', 'Chicken Eggs 10pcs', 'කුකුල් බිත්තර 10ක්', 'கோழி முட்டைகள் 10', 'pc', 1, false, 'TAX15', 520.00, 500.00, 510.00, 530.00, 450.00, 20, 5, true),

-- Dal (Grocery)
('DAL1', '1234567890128', 'Red Lentils 1kg', 'රතු මසූර් 1කිලෝ', 'சிவப்பு பருப்பு 1கிலோ', 'pc', 1, false, 'TAX15', 480.00, 460.00, 470.00, 490.00, 400.00, 15, 1, true),

-- Tea (Grocery)
('TEA200', '1234567890129', 'Ceylon Tea 200g', 'ශ්‍රී ලංකා තේ 200ග්‍රෑම්', 'சிலோன் தேயிலை 200கிராம்', 'pc', 1, false, 'TAX15', 780.00, 750.00, 765.00, 795.00, 650.00, 10, 2, true),

-- Apple (Produce, Scale Item)
('APPLE', '1234567890130', 'Red Apples', 'රතු ඇපල්', 'சிவப்பு ஆப்பிள்கள்', 'kg', 2, true, 'TAX15', 950.00, 900.00, 925.00, 975.00, 800.00, 25, 3, true),

-- Banana (Produce, Scale Item)
('BANANA', '1234567890131', 'Yellow Bananas', 'කහ කෙසෙල්', 'மஞ்சள் வாழைப்பழங்கள்', 'kg', 2, true, 'TAX15', 200.00, 190.00, 195.00, 205.00, 170.00, 30, 3, true),

-- Bread (Bakery)
('BREAD', '1234567890132', 'White Bread Loaf', 'සුදු රොටි පෙති', 'வெள்ளை ரொட்டி துண்டு', 'pc', 3, false, 'TAX15', 190.00, 180.00, 185.00, 195.00, 160.00, 20, 4, true),

-- Salt (Grocery)
('SALT1', '1234567890133', 'Table Salt 1kg', 'මේස ලුණු 1කිලෝ', 'மேஜை உப்பு 1கிலோ', 'pc', 1, false, 'TAX15', 120.00, 115.00, 117.50, 122.50, 100.00, 15, 5, true),

-- Oil (Grocery)
('OIL1L', '1234567890134', 'Coconut Oil 1L', 'පොල් තෙල් 1ලීටර්', 'தேங்காய் எண்ணெய் 1லிட்டர்', 'pc', 1, false, 'TAX15', 980.00, 950.00, 965.00, 995.00, 820.00, 10, 1, true)
ON CONFLICT (sku) DO NOTHING;




