const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const adminUI = require('./admin');

const app = express();
app.use(express.json());
app.use(cookieParser());

// ==========================================
// MONGODB CONNECTION (Serverless optimized)
// ==========================================
let cachedDb = null;
const connectDB = async () => {
    if (cachedDb) return cachedDb;
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI environment variable is missing.");
    const conn = await mongoose.connect(uri);
    cachedDb = conn;
    console.log("MongoDB Connected");
    return conn;
};

// ==========================================
// SCHEMAS & MODELS
// ==========================================
const productSchema = new mongoose.Schema({
    sku: { type: String, unique: true },
    name: String,
    description: String,
    category: String,
    brand: String,
    price: Number,
    originalPrice: Number,
    image: String,
    stock: Number,
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false }
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
    name: String,
    icon: String,
    isActive: { type: Boolean, default: true }
});

const couponSchema = new mongoose.Schema({
    code: { type: String, unique: true },
    discountPercent: Number,
    discountFixed: Number,
    minOrder: Number,
    isActive: { type: Boolean, default: true }
});

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, unique: true },
    customer: {
        name: String,
        email: String,
        mobile: String,
        whatsapp: String,
        address: String,
        city: String
    },
    items: [{
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        sku: String,
        price: Number,
        quantity: Number
    }],
    subtotal: Number,
    discountAmount: Number,
    shippingCost: Number,
    grandTotal: Number,
    paymentMethod: String,
    paymentStatus: { type: String, default: 'Pending' },
    orderStatus: { type: String, default: 'Confirmed' }
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    passwordHash: String
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', adminSchema);

// ==========================================
// DATABASE SEEDING
// ==========================================
async function seedDatabase() {
    try {
        const adminCount = await AdminUser.countDocuments();
        if (adminCount === 0) {
            const defaultUser = process.env.ADMIN_USERNAME || 'admin';
            const defaultPass = process.env.ADMIN_PASSWORD || 'admin123';
            const hash = await bcrypt.hash(defaultPass, 10);
            await AdminUser.create({ username: defaultUser, passwordHash: hash });
        }

        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            const categories = [
                { name: 'Electronics', icon: 'smartphone' }, { name: 'Fashion', icon: 'shirt' },
                { name: 'Home & Living', icon: 'sofa' }, { name: 'Beauty', icon: 'sparkles' },
                { name: 'Sports & Fitness', icon: 'dumbbell' }, { name: 'Accessories', icon: 'watch' },
                { name: 'Footwear', icon: 'footprints' }, { name: 'Kitchen', icon: 'utensils' }
            ];
            await Category.insertMany(categories);

            const sampleProducts = [
                { sku: 'EL-001', name: 'Nova X Pro Smartphone', category: 'Electronics', brand: 'Nova', price: 89999, originalPrice: 104999, image: 'https://images.unsplash.com/photo-1598327105666-5b89351cb31b?w=600&q=80', stock: 50, isFeatured: true },
                { sku: 'EL-002', name: 'SonicBeat Wireless Headphones', category: 'Electronics', brand: 'Sonic', price: 8499, originalPrice: 10999, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80', stock: 120, isFeatured: true },
                { sku: 'EL-003', name: 'Pulse Smartwatch', category: 'Electronics', brand: 'Pulse', price: 12999, originalPrice: 15999, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80', stock: 85 },
                { sku: 'EL-004', name: 'AirLite Laptop Stand', category: 'Electronics', brand: 'AirLite', price: 3499, originalPrice: 4499, image: 'https://images.unsplash.com/photo-1621252179027-94459d278660?w=600&q=80', stock: 200 },
                { sku: 'FW-001', name: 'UrbanFlex Sneakers', category: 'Footwear', brand: 'UrbanFlex', price: 5999, originalPrice: 7499, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', stock: 60, isFeatured: true },
                { sku: 'FA-001', name: 'Classic Oxford Shirt', category: 'Fashion', brand: 'Classic', price: 2499, originalPrice: 3199, image: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e23?w=600&q=80', stock: 150 },
                { sku: 'FA-002', name: 'Everyday Premium Hoodie', category: 'Fashion', brand: 'Everyday', price: 3999, originalPrice: 4999, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80', stock: 90 },
                { sku: 'AC-001', name: 'Luxe Minimal Handbag', category: 'Accessories', brand: 'Luxe', price: 6499, originalPrice: 7999, image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=600&q=80', stock: 40 },
                { sku: 'BE-001', name: 'Aura Skin Care Set', category: 'Beauty', brand: 'Aura', price: 4499, originalPrice: 5499, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80', stock: 100 },
                { sku: 'BE-002', name: 'Velvet Matte Lipstick', category: 'Beauty', brand: 'Velvet', price: 1799, originalPrice: 2499, image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80', stock: 200 },
                { sku: 'HL-001', name: 'CloudSoft Cushion Set', category: 'Home & Living', brand: 'CloudSoft', price: 2999, originalPrice: 3799, image: 'https://images.unsplash.com/photo-1579656592043-a20e25a4aa4b?w=600&q=80', stock: 75 },
                { sku: 'HL-002', name: 'Modern Table Lamp', category: 'Home & Living', brand: 'Modern', price: 4299, originalPrice: 5499, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80', stock: 45 },
                { sku: 'KI-001', name: 'Ceramic Dinner Set', category: 'Kitchen', brand: 'Ceramic', price: 6999, originalPrice: 8499, image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&q=80', stock: 30 },
                { sku: 'KI-002', name: 'ProBlend Kitchen Blender', category: 'Kitchen', brand: 'ProBlend', price: 7499, originalPrice: 9499, image: 'https://images.unsplash.com/photo-1585237842672-04ce19e83ec9?w=600&q=80', stock: 25 },
                { sku: 'SP-001', name: 'FlexFit Yoga Mat', category: 'Sports & Fitness', brand: 'FlexFit', price: 2199, originalPrice: 2799, image: 'https://images.unsplash.com/photo-1601614947936-e0e640e0cf42?w=600&q=80', stock: 150 },
                { sku: 'SP-002', name: 'ActiveMove Resistance Bands', category: 'Sports & Fitness', brand: 'ActiveMove', price: 1499, originalPrice: 1999, image: 'https://images.unsplash.com/photo-1598266663412-7bb8c5a2c266?w=600&q=80', stock: 300 }
            ];
            await Product.insertMany(sampleProducts);
            
            const sampleCoupons = [
                { code: 'NOVA10', discountPercent: 10, minOrder: 2000 },
                { code: 'SAVE500', discountFixed: 500, minOrder: 5000 }
            ];
            await Coupon.insertMany(sampleCoupons);
        }
    } catch (e) { console.error("Seeding Error", e); }
}

// Ensure DB connects on every request (Vercel warm-up)
app.use(async (req, res, next) => {
    try { await connectDB(); await seedDatabase(); next(); } 
    catch (err) { res.status(500).send("Database connection error"); }
});

// ==========================================
// MIDDLEWARE
// ==========================================
const authMiddleware = (req, res, next) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        jwt.verify(token, process.env.SESSION_SECRET || 'novacart_secret');
        next();
    } catch (e) { res.status(401).json({ error: "Unauthorized" }); }
};

// ==========================================
// PUBLIC API ROUTES
// ==========================================
app.get('/api/products', async (req, res) => {
    try {
        let query = { isActive: true };
        if (req.query.category) query.category = req.query.category;
        if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };
        if (req.query.featured) query.isFeatured = true;
        
        let sortQuery = {};
        if (req.query.sort === 'price_asc') sortQuery.price = 1;
        if (req.query.sort === 'price_desc') sortQuery.price = -1;
        
        const products = await Product.find(query).sort(sortQuery);
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/categories', async (req, res) => {
    const categories = await Category.find({ isActive: true });
    res.json(categories);
});

app.post('/api/coupons/validate', async (req, res) => {
    const { code, subtotal } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(400).json({ error: "Invalid or expired coupon" });
    if (subtotal < coupon.minOrder) return res.status(400).json({ error: `Minimum order Rs. ${coupon.minOrder} required` });
    
    let discount = 0;
    if (coupon.discountPercent) discount = (subtotal * coupon.discountPercent) / 100;
    else if (coupon.discountFixed) discount = coupon.discountFixed;
    
    res.json({ success: true, discount, code: coupon.code });
});

app.post('/api/orders', async (req, res) => {
    const { customer, cart, couponCode, deliveryMethod, paymentMethod } = req.body;
    try {
        let subtotal = 0;
        let orderItems = [];

        for (let item of cart) {
            const dbProduct = await Product.findById(item._id);
            if (!dbProduct || !dbProduct.isActive) return res.status(400).json({ error: `Product ${item.name} is unavailable.` });
            if (dbProduct.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${dbProduct.name}.` });
            
            subtotal += dbProduct.price * item.quantity;
            orderItems.push({
                productId: dbProduct._id, name: dbProduct.name,
                sku: dbProduct.sku, price: dbProduct.price, quantity: item.quantity
            });
        }

        let discount = 0;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
            if (coupon && subtotal >= coupon.minOrder) {
                discount = coupon.discountPercent ? (subtotal * coupon.discountPercent) / 100 : coupon.discountFixed;
            }
        }

        let shipping = (subtotal >= 5000 || deliveryMethod === 'Free') ? 0 : (deliveryMethod === 'Express' ? 400 : 200);
        let grandTotal = subtotal - discount + shipping;

        const orderNum = `NC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const order = new Order({
            orderNumber: orderNum, customer, items: orderItems,
            subtotal, discountAmount: discount, shippingCost: shipping,
            grandTotal, paymentMethod, paymentStatus: 'Pending', orderStatus: 'Confirmed'
        });

        await order.save();
        for (let item of orderItems) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }

        res.json({ success: true, orderNumber: orderNum, grandTotal });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders/track', async (req, res) => {
    const { orderNumber, verify } = req.query;
    const order = await Order.findOne({ orderNumber });
    if (!order || (order.customer.email !== verify && order.customer.mobile !== verify)) {
        return res.status(404).json({ error: "Order not found or verification failed." });
    }
    res.json(order);
});

// ==========================================
// ADMIN API ROUTES
// ==========================================
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await AdminUser.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, process.env.SESSION_SECRET || 'novacart_secret', { expiresIn: '1d' });
    res.cookie('admin_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ success: true });
});

app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true });
});

app.get('/api/admin/dashboard', authMiddleware, async (req, res) => {
    const totalOrders = await Order.countDocuments();
    const totalSalesAggr = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$grandTotal" } } }]);
    const totalSales = totalSalesAggr[0]?.total || 0;
    const totalProducts = await Product.countDocuments();
    const lowStock = await Product.countDocuments({ stock: { $lt: 10 } });
    
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(10);
    res.json({ totalOrders, totalSales, totalProducts, lowStock, recentOrders });
});

app.get('/api/admin/products', authMiddleware, async (req, res) => { res.json(await Product.find().sort({ createdAt: -1 })); });
app.get('/api/admin/orders', authMiddleware, async (req, res) => { res.json(await Order.find().sort({ createdAt: -1 })); });
app.patch('/api/admin/orders/:id', authMiddleware, async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { orderStatus: req.body.status });
    res.json({ success: true });
});

// ==========================================
// FRONTEND STOREFRONT GENERATOR
// ==========================================
function renderStorefront() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NovaCart 3D - Discover More. Shop Smarter.</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {
            --primary: #7957F5; --primary-dark: #5e3cc9;
            --blue: #4E8CFF; --coral: #FF718B; --mint: #57DDB0; --yellow: #FFD66B;
            --bg: #F3F0FF; --surface: #FFF9F0;
            --text-dark: #25233A; --text-muted: #77758E;
            --shadow-light: #ffffff; --shadow-dark: #d1cbf0;
            --clay-shadow: 10px 10px 20px var(--shadow-dark), -10px -10px 20px var(--shadow-light), inset 2px 2px 5px rgba(255,255,255,0.7), inset -2px -2px 5px rgba(0,0,0,0.03);
            --clay-btn: 6px 6px 12px rgba(121, 87, 245, 0.3), -4px -4px 8px rgba(255,255,255,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 4px rgba(0,0,0,0.1);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background: var(--bg); color: var(--text-dark); overflow-x: hidden; }
        
        /* Typography */
        h1, h2, h3 { font-weight: 800; letter-spacing: -0.5px; }
        
        /* Clay Components */
        .clay-card { background: var(--surface); border-radius: 28px; box-shadow: var(--clay-shadow); padding: 24px; transition: transform 0.3s, box-shadow 0.3s; }
        .clay-card:hover { transform: translateY(-5px); box-shadow: 15px 15px 30px var(--shadow-dark), -15px -15px 30px var(--shadow-light), inset 2px 2px 5px rgba(255,255,255,0.7); }
        .clay-btn { background: var(--primary); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-weight: 700; cursor: pointer; box-shadow: var(--clay-btn); transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px;}
        .clay-btn:active { transform: scale(0.95); box-shadow: inset 4px 4px 8px rgba(0,0,0,0.2), inset -4px -4px 8px rgba(255,255,255,0.2); }
        .clay-btn.secondary { background: var(--surface); color: var(--primary); box-shadow: var(--clay-shadow); }
        .clay-input { width: 100%; padding: 14px 20px; border: none; border-radius: 16px; background: var(--bg); box-shadow: inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light); color: var(--text-dark); font-weight: 600; outline: none; margin-bottom: 16px;}
        
        /* Layouts */
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        
        /* Header */
        .top-bar { background: linear-gradient(90deg, var(--primary), var(--blue)); color: white; text-align: center; padding: 8px; font-size: 0.85rem; font-weight: 700; animation: slideDown 0.5s ease; }
        header { position: sticky; top: 0; background: rgba(243, 240, 255, 0.9); backdrop-filter: blur(10px); z-index: 100; padding: 16px 0; }
        .nav-inner { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.8rem; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 8px; cursor: pointer;}
        .logo svg { filter: drop-shadow(2px 4px 6px rgba(121,87,245,0.4)); }
        .nav-links { display: flex; gap: 24px; list-style: none; }
        .nav-links a { text-decoration: none; color: var(--text-dark); font-weight: 600; transition: color 0.2s; }
        .nav-links a:hover { color: var(--primary); }
        .header-actions { display: flex; gap: 16px; align-items: center; }
        .cart-btn { position: relative; background: var(--surface); width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: var(--clay-shadow); cursor: pointer; color: var(--primary); transition: transform 0.2s; }
        .cart-btn:hover { transform: scale(1.05); }
        .cart-badge { position: absolute; top: -5px; right: -5px; background: var(--coral); color: white; font-size: 0.7rem; font-weight: 800; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        
        /* Hero */
        .hero { padding: 60px 0; display: flex; align-items: center; gap: 40px; }
        .hero-text { flex: 1; }
        .hero-text h1 { font-size: 4rem; line-height: 1.1; margin-bottom: 20px; color: var(--text-dark); text-shadow: 2px 4px 10px rgba(0,0,0,0.05); }
        .hero-text p { font-size: 1.2rem; color: var(--text-muted); margin-bottom: 30px; }
        .hero-image { flex: 1; position: relative; }
        .blob { position: absolute; width: 400px; height: 400px; background: linear-gradient(135deg, var(--blue), var(--mint)); border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; animation: morph 8s ease-in-out infinite; z-index: -1; right: 0; top: -50px; opacity: 0.6; filter: blur(20px); }
        
        /* Categories */
        .section-title { font-size: 2rem; margin: 60px 0 30px; text-align: center; }
        .category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 20px; }
        .cat-card { text-align: center; padding: 20px 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .cat-card i { color: var(--primary); }
        .cat-card span { font-weight: 700; font-size: 0.9rem; }
        
        /* Products */
        .filters { display: flex; gap: 15px; margin-bottom: 30px; justify-content: center; flex-wrap: wrap;}
        .filter-btn { padding: 10px 20px; border-radius: 20px; border: none; background: var(--surface); box-shadow: var(--clay-shadow); font-weight: 600; cursor: pointer; color: var(--text-muted); }
        .filter-btn.active { background: var(--primary); color: white; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 30px; }
        .product-card { position: relative; display: flex; flex-direction: column; }
        .badge { position: absolute; top: 15px; left: 15px; background: var(--coral); color: white; padding: 5px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 800; z-index: 2; box-shadow: 2px 2px 8px rgba(255,113,139,0.4); }
        .product-img { width: 100%; height: 200px; object-fit: contain; margin-bottom: 15px; border-radius: 16px; mix-blend-mode: multiply; }
        .product-brand { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 800; margin-bottom: 4px; }
        .product-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; flex: 1; }
        .product-price { display: flex; align-items: baseline; gap: 8px; margin-bottom: 15px; }
        .price-current { font-size: 1.4rem; font-weight: 800; color: var(--primary); }
        .price-old { font-size: 0.9rem; color: var(--text-muted); text-decoration: line-through; }
        
        /* Cart Drawer */
        .cart-overlay { position: fixed; inset: 0; background: rgba(37,35,58,0.3); backdrop-filter: blur(5px); z-index: 999; display: none; opacity: 0; transition: opacity 0.3s; }
        .cart-drawer { position: fixed; top: 0; right: -450px; width: 100%; max-width: 450px; height: 100vh; background: var(--bg); z-index: 1000; box-shadow: -10px 0 30px rgba(0,0,0,0.1); padding: 30px; display: flex; flex-direction: column; transition: right 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .cart-drawer.open { right: 0; }
        .cart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .cart-items { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        .cart-item { display: flex; gap: 15px; align-items: center; background: var(--surface); padding: 15px; border-radius: 20px; box-shadow: var(--clay-shadow); }
        .cart-item img { width: 70px; height: 70px; object-fit: contain; border-radius: 12px; }
        .cart-item-info { flex: 1; }
        .cart-item-title { font-weight: 700; font-size: 0.95rem; }
        .cart-item-price { color: var(--primary); font-weight: 800; margin-top: 5px; }
        .qty-controls { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
        .qty-btn { width: 30px; height: 30px; border-radius: 50%; border: none; background: var(--bg); box-shadow: inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light); cursor: pointer; font-weight: 800; }
        .cart-footer { margin-top: 20px; padding-top: 20px; border-top: 2px dashed #d1cbf0; }
        .cart-summary-line { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 600; color: var(--text-muted); }
        .cart-total { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 1.4rem; font-weight: 800; color: var(--text-dark); }
        
        /* Modal Checkout */
        .modal { position: fixed; inset: 0; z-index: 10000; background: rgba(37,35,58,0.5); backdrop-filter: blur(8px); display: none; align-items: center; justify-content: center; }
        .modal-content { background: var(--bg); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; border-radius: 32px; padding: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        
        /* Toast */
        .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px); background: var(--text-dark); color: white; padding: 12px 24px; border-radius: 50px; font-weight: 600; opacity: 0; transition: all 0.3s; z-index: 9999; box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
        
        /* WhatsApp */
        .wa-float { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: #25D366; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(37,211,102,0.4); z-index: 900; cursor: pointer; transition: transform 0.3s; }
        .wa-float:hover { transform: scale(1.1) rotate(-10deg); }

        /* Animations */
        @keyframes morph { 0%, 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; } 50% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; } }
        @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        
        @media(max-width: 768px) {
            .hero { flex-direction: column; text-align: center; padding: 30px 0; }
            .hero-text h1 { font-size: 2.5rem; }
            .blob { width: 300px; height: 300px; }
            .nav-links { display: none; }
        }
    </style>
</head>
<body>
    <div class="top-bar">FREE DELIVERY ON ORDERS ABOVE Rs. 5,000 | USE NOVA10 FOR 10% OFF</div>
    
    <header>
        <div class="container nav-inner">
            <div class="logo" onclick="goHome()"><i data-lucide="box"></i> NovaCart 3D</div>
            <ul class="nav-links">
                <li><a href="#" onclick="goHome()">Home</a></li>
                <li><a href="#products">Shop</a></li>
                <li><a href="#categories">Categories</a></li>
            </ul>
            <div class="header-actions">
                <div class="clay-input" style="margin:0; padding: 8px 15px; width: 200px; display:flex; align-items:center;">
                    <i data-lucide="search" style="width:16px; margin-right:8px; color:var(--text-muted)"></i>
                    <input type="text" id="searchInput" placeholder="Search..." style="border:none; background:transparent; outline:none; width:100%;" onkeyup="if(event.key==='Enter') searchProducts()">
                </div>
                <div class="cart-btn" onclick="toggleCart()">
                    <i data-lucide="shopping-bag"></i>
                    <div class="cart-badge" id="cartCount">0</div>
                </div>
            </div>
        </div>
    </header>

    <div id="mainContent">
        <section class="hero container">
            <div class="hero-text">
                <h1>Shopping That Feels Extraordinary.</h1>
                <p>Explore your favorite brands, discover exciting deals, and enjoy a smarter way to shop with NovaCart 3D.</p>
                <button class="clay-btn" onclick="document.getElementById('products').scrollIntoView({behavior:'smooth'})">Explore Collection <i data-lucide="arrow-right"></i></button>
            </div>
            <div class="hero-image">
                <div class="blob"></div>
                <img src="https://images.unsplash.com/photo-1605464315542-bda3e2f4e605?w=600&q=80" style="width:100%; border-radius:32px; box-shadow:var(--clay-shadow); transform: rotate(5deg);" alt="Hero Product">
            </div>
        </section>

        <section id="categories" class="container">
            <h2 class="section-title">Shop by Category</h2>
            <div class="category-grid" id="catGrid"></div>
        </section>

        <section id="products" class="container">
            <h2 class="section-title">Featured Products</h2>
            <div class="filters" id="filtersContainer">
                <button class="filter-btn active" onclick="loadProducts()">All Products</button>
                <button class="filter-btn" onclick="loadProducts('Electronics')">Electronics</button>
                <button class="filter-btn" onclick="loadProducts('Fashion')">Fashion</button>
                <button class="filter-btn" onclick="loadProducts('Beauty')">Beauty</button>
            </div>
            <div class="product-grid" id="prodGrid"></div>
        </section>
    </div>

    <!-- Cart Drawer -->
    <div class="cart-overlay" id="cartOverlay" onclick="toggleCart()"></div>
    <div class="cart-drawer" id="cartDrawer">
        <div class="cart-header">
            <h2>Your Cart</h2>
            <button class="qty-btn" onclick="toggleCart()"><i data-lucide="x"></i></button>
        </div>
        <div class="cart-items" id="cartItems"></div>
        <div class="cart-footer">
            <div class="clay-input" style="display:flex; margin-bottom:15px; padding:5px;">
                <input type="text" id="couponCode" placeholder="Promo code" style="border:none; background:transparent; outline:none; padding:10px; width:100%;">
                <button class="clay-btn" style="padding: 10px 15px;" onclick="applyCoupon()">Apply</button>
            </div>
            <div class="cart-summary-line"><span>Subtotal</span> <span id="cartSubtotal">Rs. 0</span></div>
            <div class="cart-summary-line" style="color:var(--mint)"><span>Discount</span> <span id="cartDiscount">Rs. 0</span></div>
            <div class="cart-summary-line"><span>Delivery (Est)</span> <span id="cartShipping">Rs. 0</span></div>
            <div class="cart-total"><span>Total</span> <span id="cartTotal">Rs. 0</span></div>
            <button class="clay-btn" style="width:100%; padding:16px; font-size:1.1rem;" onclick="openCheckout()">Proceed to Checkout</button>
        </div>
    </div>

    <!-- Checkout Modal -->
    <div class="modal" id="checkoutModal">
        <div class="modal-content">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <h2>Complete Order</h2>
                <button class="qty-btn" onclick="closeModal('checkoutModal')"><i data-lucide="x"></i></button>
            </div>
            <form id="checkoutForm" onsubmit="submitOrder(event)">
                <input type="text" id="cName" class="clay-input" placeholder="Full Name" required>
                <input type="email" id="cEmail" class="clay-input" placeholder="Email Address" required>
                <input type="tel" id="cPhone" class="clay-input" placeholder="Mobile Number (e.g. 03001234567)" required>
                <input type="text" id="cAddress" class="clay-input" placeholder="Complete Delivery Address" required>
                <input type="text" id="cCity" class="clay-input" placeholder="City" required>
                
                <h4 style="margin: 15px 0 10px;">Delivery Method</h4>
                <select id="cDelivery" class="clay-input" onchange="updateCheckoutTotal()">
                    <option value="Standard">Standard Delivery (Rs. 200) - Free > Rs. 5000</option>
                    <option value="Express">Express Delivery (Rs. 400)</option>
                </select>

                <h4 style="margin: 15px 0 10px;">Payment Method</h4>
                <select id="cPayment" class="clay-input">
                    <option value="COD">Cash on Delivery</option>
                    <option value="BankTransfer">Bank Transfer</option>
                </select>

                <div style="background:var(--surface); padding:20px; border-radius:20px; margin: 20px 0; box-shadow:var(--clay-shadow);">
                    <h3 style="display:flex; justify-content:space-between; color:var(--primary);">
                        <span>Grand Total:</span> <span id="checkoutGrandTotal">Rs. 0</span>
                    </h3>
                </div>

                <button type="submit" class="clay-btn" style="width:100%; padding:16px; font-size:1.1rem;" id="submitOrderBtn">Place Secure Order <i data-lucide="lock"></i></button>
            </form>
        </div>
    </div>

    <!-- Success Modal -->
    <div class="modal" id="successModal">
        <div class="modal-content" style="text-align:center;">
            <div style="width:80px; height:80px; background:var(--mint); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; box-shadow:var(--clay-shadow);">
                <i data-lucide="check" style="width:40px; height:40px;"></i>
            </div>
            <h2>Order Confirmed!</h2>
            <p style="color:var(--text-muted); margin: 15px 0;">Thank you for shopping with NovaCart 3D.</p>
            <div style="background:var(--bg); padding:15px; border-radius:16px; margin-bottom:20px; font-weight:800; font-size:1.2rem;">
                Order #<span id="succOrderNum"></span>
            </div>
            <button class="clay-btn" style="width:100%; margin-bottom:15px;" onclick="contactWhatsAppOrder()"><i data-lucide="message-circle"></i> Send to WhatsApp</button>
            <button class="clay-btn secondary" style="width:100%;" onclick="closeModal('successModal'); goHome();">Continue Shopping</button>
        </div>
    </div>

    <div class="toast" id="toast">Message</div>
    <a href="https://wa.me/923001234567?text=Hello%20NovaCart%203D!" target="_blank" class="wa-float"><i data-lucide="message-circle"></i></a>

    <script>
        lucide.createIcons();
        
        let cart = JSON.parse(localStorage.getItem('novacart_cart')) || [];
        let appliedCoupon = null;
        let lastCheckoutTotals = { subtotal: 0, discount: 0, shipping: 0, grand: 0 };
        
        const formatRs = (num) => 'Rs. ' + num.toLocaleString();
        const showToast = (msg) => {
            const t = document.getElementById('toast');
            t.innerText = msg; t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3000);
        };

        async function init() {
            updateCartBadge();
            const [prods, cats] = await Promise.all([
                fetch('/api/products').then(r=>r.json()),
                fetch('/api/categories').then(r=>r.json())
            ]);
            renderCategories(cats);
            renderProducts(prods);
        }

        function renderCategories(cats) {
            document.getElementById('catGrid').innerHTML = cats.map(c => 
                \`<div class="cat-card clay-card" onclick="loadProducts('\${c.name}')">
                    <i data-lucide="\${c.icon || 'box'}" style="width:32px; height:32px;"></i>
                    <span>\${c.name}</span>
                </div>\`
            ).join('');
            lucide.createIcons();
        }

        async function loadProducts(category = '') {
            let url = '/api/products';
            if (category) url += '?category=' + category;
            const prods = await fetch(url).then(r=>r.json());
            renderProducts(prods);
        }

        async function searchProducts() {
            const q = document.getElementById('searchInput').value;
            const prods = await fetch('/api/products?search=' + q).then(r=>r.json());
            renderProducts(prods);
            document.getElementById('products').scrollIntoView({behavior:'smooth'});
        }

        function renderProducts(prods) {
            document.getElementById('prodGrid').innerHTML = prods.map(p => {
                const disc = p.originalPrice > p.price ? Math.round((1 - p.price/p.originalPrice)*100) : 0;
                return \`
                <div class="product-card clay-card">
                    \${disc ? \`<div class="badge">-\${disc}% OFF</div>\` : ''}
                    <img src="\${p.image}" class="product-img" alt="\${p.name}" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'">
                    <div class="product-brand">\${p.brand}</div>
                    <div class="product-title">\${p.name}</div>
                    <div class="product-price">
                        <span class="price-current">\${formatRs(p.price)}</span>
                        \${disc ? \`<span class="price-old">\${formatRs(p.originalPrice)}</span>\` : ''}
                    </div>
                    <button class="clay-btn" style="width:100%" onclick="addToCart('\${p._id}', '\${p.name}', \${p.price}, '\${p.image}', \${p.stock})">
                        <i data-lucide="shopping-cart"></i> Add to Cart
                    </button>
                </div>\`
            }).join('');
            lucide.createIcons();
        }

        function addToCart(id, name, price, img, stock) {
            const ext = cart.find(i => i._id === id);
            if (ext) {
                if (ext.quantity >= stock) return showToast("Max stock reached");
                ext.quantity++;
            } else {
                cart.push({ _id: id, name, price, image: img, quantity: 1, stock });
            }
            saveCart();
            showToast("Added to Cart!");
        }

        function saveCart() {
            localStorage.setItem('novacart_cart', JSON.stringify(cart));
            updateCartBadge();
            renderCart();
        }

        function updateCartBadge() {
            const count = cart.reduce((acc, item) => acc + item.quantity, 0);
            document.getElementById('cartCount').innerText = count;
        }

        function toggleCart() {
            const d = document.getElementById('cartDrawer');
            const o = document.getElementById('cartOverlay');
            if (d.classList.contains('open')) {
                d.classList.remove('open');
                setTimeout(() => { o.style.display = 'none'; o.style.opacity = 0; }, 300);
            } else {
                renderCart();
                o.style.display = 'block';
                setTimeout(() => { d.classList.add('open'); o.style.opacity = 1; }, 10);
            }
        }

        function changeQty(id, delta) {
            const item = cart.find(i => i._id === id);
            if (!item) return;
            item.quantity += delta;
            if (item.quantity <= 0) cart = cart.filter(i => i._id !== id);
            else if (item.quantity > item.stock) { item.quantity = item.stock; showToast("Stock limit reached"); }
            saveCart();
            if (appliedCoupon) applyCoupon(true); 
        }

        async function applyCoupon(silent = false) {
            const code = document.getElementById('couponCode').value || (appliedCoupon ? appliedCoupon.code : '');
            if (!code) return;
            const sub = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
            try {
                const res = await fetch('/api/coupons/validate', {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ code, subtotal: sub })
                });
                const data = await res.json();
                if (data.error) {
                    appliedCoupon = null;
                    if(!silent) showToast(data.error);
                } else {
                    appliedCoupon = data;
                    if(!silent) showToast("Coupon Applied!");
                }
                renderCart();
            } catch(e) { console.error(e); }
        }

        function renderCart() {
            const itemsCont = document.getElementById('cartItems');
            if (cart.length === 0) {
                itemsCont.innerHTML = '<div style="text-align:center; padding:50px 0; color:var(--text-muted);"><i data-lucide="shopping-bag" style="width:64px; height:64px; margin-bottom:15px; opacity:0.5;"></i><br>Your cart is empty</div>';
            } else {
                itemsCont.innerHTML = cart.map(i => \`
                <div class="cart-item">
                    <img src="\${i.image}" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'">
                    <div class="cart-item-info">
                        <div class="cart-item-title">\${i.name}</div>
                        <div class="cart-item-price">\${formatRs(i.price)}</div>
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="changeQty('\${i._id}', -1)">-</button>
                            <span style="font-weight:700;">\${i.quantity}</span>
                            <button class="qty-btn" onclick="changeQty('\${i._id}', 1)">+</button>
                        </div>
                    </div>
                </div>\`).join('');
            }
            lucide.createIcons();
            
            const sub = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
            let disc = appliedCoupon ? appliedCoupon.discount : 0;
            if(sub < (appliedCoupon?.minOrder || 0)) { appliedCoupon = null; disc = 0; }
            let ship = sub > 0 ? (sub >= 5000 ? 0 : 200) : 0;
            const total = sub - disc + ship;
            
            document.getElementById('cartSubtotal').innerText = formatRs(sub);
            document.getElementById('cartDiscount').innerText = formatRs(disc);
            document.getElementById('cartShipping').innerText = ship === 0 && sub > 0 ? 'FREE' : formatRs(ship);
            document.getElementById('cartTotal').innerText = formatRs(total);
            
            lastCheckoutTotals = { subtotal: sub, discount: disc, shipping: ship, grand: total };
        }

        function openCheckout() {
            if(cart.length === 0) return showToast("Cart is empty");
            toggleCart();
            updateCheckoutTotal();
            document.getElementById('checkoutModal').style.display = 'flex';
        }
        
        function updateCheckoutTotal() {
            const isExpress = document.getElementById('cDelivery').value === 'Express';
            const sub = lastCheckoutTotals.subtotal;
            let ship = isExpress ? 400 : (sub >= 5000 ? 0 : 200);
            const total = sub - lastCheckoutTotals.discount + ship;
            document.getElementById('checkoutGrandTotal').innerText = formatRs(total);
        }

        function closeModal(id) { document.getElementById(id).style.display = 'none'; }

        async function submitOrder(e) {
            e.preventDefault();
            const btn = document.getElementById('submitOrderBtn');
            btn.innerHTML = '<i data-lucide="loader"></i> Processing...';
            btn.disabled = true;

            const payload = {
                customer: {
                    name: document.getElementById('cName').value,
                    email: document.getElementById('cEmail').value,
                    mobile: document.getElementById('cPhone').value,
                    address: document.getElementById('cAddress').value,
                    city: document.getElementById('cCity').value
                },
                cart, couponCode: appliedCoupon ? appliedCoupon.code : null,
                deliveryMethod: document.getElementById('cDelivery').value,
                paymentMethod: document.getElementById('cPayment').value
            };

            try {
                const res = await fetch('/api/orders', {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if (data.error) {
                    showToast(data.error);
                } else {
                    cart = []; saveCart(); appliedCoupon = null;
                    closeModal('checkoutModal');
                    document.getElementById('succOrderNum').innerText = data.orderNumber;
                    document.getElementById('successModal').style.display = 'flex';
                }
            } catch(e) { showToast("An error occurred. Please try again."); }
            
            btn.innerHTML = 'Place Secure Order <i data-lucide="lock"></i>';
            btn.disabled = false;
            lucide.createIcons();
        }

        function contactWhatsAppOrder() {
            const num = document.getElementById('succOrderNum').innerText;
            const text = encodeURIComponent(\`Hello NovaCart, I just placed order \${num}. Could you confirm?\`);
            window.open(\`https://wa.me/923001234567?text=\${text}\`, '_blank');
        }

        function goHome() {
            window.scrollTo({top:0, behavior:'smooth'});
            loadProducts(); // reset filters
        }

        window.onload = init;
    </script>
</body>
</html>`;
}

// Routes serving Frontend & Admin
app.get('/', (req, res) => { res.send(renderStorefront()); });
app.get('/admin', (req, res) => { res.send(adminUI()); });

// Vercel / Local handling
if (process.env.VERCEL !== '1' && require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`NovaCart running on http://localhost:${PORT}`));
}
module.exports = app;
