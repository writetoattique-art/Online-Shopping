module.exports = function renderAdmin() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NovaCart 3D - Admin Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --primary: #7957F5; --blue: #4E8CFF; --coral: #FF718B; --mint: #57DDB0; --yellow: #FFD66B;
            --bg: #F3F0FF; --surface: #FFF9F0; --text-dark: #25233A; --text-muted: #77758E;
            --shadow-light: #ffffff; --shadow-dark: #d1cbf0;
            --clay: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light), inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.05);
            --clay-inset: inset 6px 6px 12px var(--shadow-dark), inset -6px -6px 12px var(--shadow-light);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background: var(--bg); color: var(--text-dark); display: flex; height: 100vh; overflow: hidden; }
        
        /* Login Overlay */
        #loginOverlay { position: fixed; inset: 0; background: var(--bg); z-index: 9999; display: flex; align-items: center; justify-content: center; }
        .login-box { background: var(--surface); padding: 40px; border-radius: 30px; box-shadow: var(--clay); width: 100%; max-width: 400px; text-align: center; }
        .clay-input { width: 100%; padding: 15px 20px; border: none; border-radius: 20px; background: var(--bg); box-shadow: var(--clay-inset); margin-bottom: 20px; color: var(--text-dark); font-weight: 600; outline: none; }
        .clay-btn { background: var(--primary); color: white; border: none; padding: 15px 30px; border-radius: 50px; font-weight: 700; cursor: pointer; box-shadow: 4px 4px 10px rgba(121,87,245,0.4), -4px -4px 10px rgba(255,255,255,0.8); width: 100%; transition: transform 0.2s; }
        .clay-btn:active { transform: scale(0.95); }
        
        /* Layout */
        .sidebar { width: 280px; background: var(--surface); padding: 30px 20px; display: flex; flex-direction: column; box-shadow: 10px 0 30px rgba(0,0,0,0.05); z-index: 10; }
        .logo { font-size: 1.5rem; font-weight: 800; color: var(--primary); margin-bottom: 40px; display: flex; align-items: center; gap: 10px; }
        .nav-item { display: flex; align-items: center; gap: 15px; padding: 15px 20px; border-radius: 20px; color: var(--text-muted); font-weight: 700; cursor: pointer; margin-bottom: 10px; transition: all 0.3s; }
        .nav-item.active { background: var(--bg); color: var(--primary); box-shadow: var(--clay-inset); }
        .main-content { flex: 1; padding: 40px; overflow-y: auto; }
        
        /* Dashboard */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .kpi-card { background: var(--surface); padding: 25px; border-radius: 25px; box-shadow: var(--clay); display: flex; flex-direction: column; gap: 10px; }
        .kpi-title { color: var(--text-muted); font-weight: 600; font-size: 0.9rem; }
        .kpi-val { font-size: 2rem; font-weight: 800; color: var(--primary); }
        .chart-container { background: var(--surface); padding: 30px; border-radius: 30px; box-shadow: var(--clay); margin-bottom: 40px; height: 400px; }
        
        /* Tables */
        .data-card { background: var(--surface); border-radius: 30px; box-shadow: var(--clay); padding: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 15px; color: var(--text-muted); border-bottom: 2px dashed #d1cbf0; }
        td { padding: 15px; border-bottom: 1px solid rgba(209,203,240,0.3); font-weight: 600; }
        .status { padding: 5px 12px; border-radius: 50px; font-size: 0.8rem; font-weight: 800; }
        .status.Confirmed { background: rgba(87, 221, 176, 0.2); color: #22B889; }
        .status.Pending { background: rgba(255, 214, 107, 0.3); color: #D49D00; }
        
        .toast { position: fixed; top: 30px; right: 30px; background: var(--text-dark); color: white; padding: 15px 25px; border-radius: 50px; z-index: 10000; opacity: 0; transition: 0.3s; }
    </style>
</head>
<body>
    <div id="loginOverlay">
        <div class="login-box">
            <h2 style="color:var(--primary); margin-bottom:10px;"><i data-lucide="lock"></i> Admin Access</h2>
            <p style="color:var(--text-muted); margin-bottom:30px;">NovaCart 3D Control Panel</p>
            <input type="text" id="adminUser" class="clay-input" placeholder="Username">
            <input type="password" id="adminPass" class="clay-input" placeholder="Password">
            <button class="clay-btn" onclick="login()">Sign In</button>
        </div>
    </div>

    <aside class="sidebar">
        <div class="logo"><i data-lucide="box"></i> NovaCart Admin</div>
        <div class="nav-item active" onclick="switchTab('dashboard', this)"><i data-lucide="layout-dashboard"></i> Dashboard</div>
        <div class="nav-item" onclick="switchTab('products', this)"><i data-lucide="package"></i> Products</div>
        <div class="nav-item" onclick="switchTab('orders', this)"><i data-lucide="shopping-bag"></i> Orders</div>
        <div style="margin-top:auto;" class="nav-item" onclick="logout()"><i data-lucide="log-out"></i> Logout</div>
    </aside>

    <main class="main-content">
        <!-- Dashboard Tab -->
        <div id="tab-dashboard">
            <h1 style="margin-bottom:30px;">Overview</h1>
            <div class="kpi-grid">
                <div class="kpi-card"><span class="kpi-title">Total Sales</span><span class="kpi-val" id="kpiSales">Rs. 0</span></div>
                <div class="kpi-card"><span class="kpi-title">Total Orders</span><span class="kpi-val" id="kpiOrders">0</span></div>
                <div class="kpi-card"><span class="kpi-title">Active Products</span><span class="kpi-val" id="kpiProducts">0</span></div>
                <div class="kpi-card"><span class="kpi-title">Low Stock Alerts</span><span class="kpi-val" style="color:var(--coral)" id="kpiStock">0</span></div>
            </div>
            <div class="chart-container"><canvas id="salesChart"></canvas></div>
            
            <div class="data-card">
                <h3 style="margin-bottom:20px;">Recent Orders</h3>
                <table>
                    <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody id="dashOrdersTable"></tbody>
                </table>
            </div>
        </div>
        
        <!-- Orders Tab -->
        <div id="tab-orders" style="display:none;">
            <h1 style="margin-bottom:30px;">Order Management</h1>
            <div class="data-card">
                <table>
                    <thead><tr><th>Date</th><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody id="fullOrdersTable"></tbody>
                </table>
            </div>
        </div>

        <!-- Products Tab (Simplified view) -->
        <div id="tab-products" style="display:none;">
            <h1 style="margin-bottom:30px;">Product Inventory</h1>
            <div class="data-card">
                <table>
                    <thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead>
                    <tbody id="fullProductsTable"></tbody>
                </table>
            </div>
        </div>
    </main>

    <div class="toast" id="toast">Message</div>

    <script>
        lucide.createIcons();
        let chartInst = null;
        
        const showToast = (msg) => {
            const t = document.getElementById('toast');
            t.innerText = msg; t.style.opacity = 1;
            setTimeout(() => t.style.opacity = 0, 3000);
        };

        const authFetch = async (url, options = {}) => {
            const res = await fetch(url, options);
            if (res.status === 401) { document.getElementById('loginOverlay').style.display = 'flex'; throw new Error('Unauth'); }
            return res.json();
        };

        async function login() {
            const u = document.getElementById('adminUser').value;
            const p = document.getElementById('adminPass').value;
            const res = await fetch('/api/admin/login', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({username: u, password: p})
            });
            if (res.ok) {
                document.getElementById('loginOverlay').style.display = 'none';
                loadDashboard();
            } else { showToast("Invalid Credentials"); }
        }

        async function logout() {
            await fetch('/api/admin/logout', { method: 'POST' });
            document.getElementById('loginOverlay').style.display = 'flex';
        }

        function switchTab(tab, el) {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            el.classList.add('active');
            ['dashboard', 'products', 'orders'].forEach(t => {
                document.getElementById('tab-' + t).style.display = (t === tab) ? 'block' : 'none';
            });
            if(tab === 'dashboard') loadDashboard();
            if(tab === 'orders') loadOrders();
            if(tab === 'products') loadProducts();
        }

        async function loadDashboard() {
            try {
                const data = await authFetch('/api/admin/dashboard');
                document.getElementById('kpiSales').innerText = 'Rs. ' + data.totalSales.toLocaleString();
                document.getElementById('kpiOrders').innerText = data.totalOrders;
                document.getElementById('kpiProducts').innerText = data.totalProducts;
                document.getElementById('kpiStock').innerText = data.lowStock;
                
                document.getElementById('dashOrdersTable').innerHTML = data.recentOrders.map(o => \`
                    <tr>
                        <td>\${o.orderNumber}</td>
                        <td>\${o.customer.name}</td>
                        <td>Rs. \${o.grandTotal.toLocaleString()}</td>
                        <td><span class="status \${o.orderStatus}">\${o.orderStatus}</span></td>
                    </tr>
                \`).join('');
                
                // Chart Setup (Mocking last 7 days from total)
                const ctx = document.getElementById('salesChart').getContext('2d');
                if(chartInst) chartInst.destroy();
                chartInst = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
                        datasets: [{ label: 'Sales (PKR)', data: [12000, 19000, 15000, 25000, 22000, 30000, data.totalSales], borderColor: '#7957F5', backgroundColor: 'rgba(121,87,245,0.1)', fill: true, tension: 0.4 }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            } catch(e) {} // handled by authFetch
        }

        async function loadOrders() {
            try {
                const orders = await authFetch('/api/admin/orders');
                document.getElementById('fullOrdersTable').innerHTML = orders.map(o => \`
                    <tr>
                        <td>\${new Date(o.createdAt).toLocaleDateString()}</td>
                        <td>\${o.orderNumber}</td>
                        <td>\${o.customer.name}<br><small style="color:var(--text-muted)">\${o.customer.mobile}</small></td>
                        <td>Rs. \${o.grandTotal.toLocaleString()}</td>
                        <td>
                            <select class="clay-input" style="padding:8px 12px; margin:0;" onchange="updateOrderStatus('\${o._id}', this.value)">
                                <option value="Pending" \${o.orderStatus==='Pending'?'selected':''}>Pending</option>
                                <option value="Confirmed" \${o.orderStatus==='Confirmed'?'selected':''}>Confirmed</option>
                                <option value="Shipped" \${o.orderStatus==='Shipped'?'selected':''}>Shipped</option>
                                <option value="Delivered" \${o.orderStatus==='Delivered'?'selected':''}>Delivered</option>
                            </select>
                        </td>
                        <td><button class="clay-btn" style="padding:8px 15px;" onclick="window.open('https://wa.me/\${o.customer.whatsapp||o.customer.mobile}?text=Update%20on%20\${o.orderNumber}', '_blank')">WhatsApp</button></td>
                    </tr>
                \`).join('');
            } catch(e){}
        }

        async function loadProducts() {
            try {
                const prods = await authFetch('/api/admin/products');
                document.getElementById('fullProductsTable').innerHTML = prods.map(p => \`
                    <tr>
                        <td>\${p.sku}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <img src="\${p.image}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
                                \${p.name}
                            </div>
                        </td>
                        <td>\${p.category}</td>
                        <td>Rs. \${p.price.toLocaleString()}</td>
                        <td>\${p.stock}</td>
                    </tr>
                \`).join('');
            } catch(e){}
        }

        async function updateOrderStatus(id, status) {
            await authFetch('/api/admin/orders/' + id, {
                method: 'PATCH', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({status})
            });
            showToast("Order Updated!");
        }

        // Try load on init to check auth
        loadDashboard();
    </script>
</body>
</html>`;
}
