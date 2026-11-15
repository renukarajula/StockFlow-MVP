
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalQuantity: 0,
    lowStockItems: 0,
  });
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [auth, setAuth] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });

  const emptyProduct = {
    name: "",
    sku: "",
    description: "",
    quantity: 0,
    cost_price: "",
    selling_price: "",
    low_stock_threshold: 5,
  };

  const [product, setProduct] = useState(emptyProduct);

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Something went wrong");
    return data;
  }

  async function handleAuth(e) {
    e.preventDefault();
    setError("");

    try {
      const data = await request(
        isRegister ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(auth),
        }
      );

      if (isRegister) {
        setMessage("Account created! Please log in.");
        setIsRegister(false);
      } else {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadData() {
  try {
    const [productData, dashboardData, lowStockData] = await Promise.all([
      request(`/products?q=${encodeURIComponent(search)}`),
      request("/dashboard/stats"),
      request("/dashboard/low-stock"),
    ]);

    setProducts(productData);
    setStats(dashboardData);
    setLowStockProducts(lowStockData);

  } catch (err) {
    setError(err.message);
  }
}

  useEffect(() => {
    if (token) loadData();
  }, [token, search]);

  async function saveProduct(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = {
        ...product,
        quantity: Number(product.quantity),
        cost_price: product.cost_price === "" ? null : Number(product.cost_price),
        selling_price: product.selling_price === "" ? null : Number(product.selling_price),
        low_stock_threshold: Number(product.low_stock_threshold),
      };

      await request(
        editingId ? `/products/${editingId}` : "/products",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setProduct(emptyProduct);
      setEditingId(null);
      setMessage(editingId ? "Product updated successfully" : "Product added successfully");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function editProduct(item) {
    setEditingId(item.id);
    setProduct({
      name: item.name,
      sku: item.sku,
      description: item.description || "",
      quantity: item.quantity,
      cost_price: item.cost_price ?? "",
      selling_price: item.selling_price ?? "",
      low_stock_threshold: item.low_stock_threshold ?? 5,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProduct(id) {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await request(`/products/${id}`, { method: "DELETE" });
      setMessage("Product deleted successfully");
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setProducts([]);
  }

  if (!token) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={handleAuth}>
          <h1>StockFlow</h1>
          <p>Smart inventory management</p>
          <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>

          {isRegister && (
            <>
              <input placeholder="Full name" required value={auth.name}
                onChange={(e) => setAuth({ ...auth, name: e.target.value })} />
              <input placeholder="Organization name" required value={auth.organizationName}
                onChange={(e) => setAuth({ ...auth, organizationName: e.target.value })} />
            </>
          )}

          <input type="email" placeholder="Email address" required value={auth.email}
            onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
          <input type="password" placeholder="Password (minimum 8 characters)" required
            value={auth.password}
            onChange={(e) => setAuth({ ...auth, password: e.target.value })} />

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}

          <button type="submit">{isRegister ? "Create account" : "Login"}</button>
          <p className="switch">
            {isRegister ? "Already have an account?" : "Don't have an account?"}
            <button type="button" className="link-button"
              onClick={() => { setIsRegister(!isRegister); setError(""); setMessage(""); }}>
              {isRegister ? "Login" : "Sign up"}
            </button>
          </p>
        </form>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>StockFlow</h1>
        <div>
          <span>{user?.name || "Your workspace"}</span>
          <button className="logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="content">
        <h2>Dashboard</h2>
        <p className="subtitle">Overview of your inventory</p>

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        <section className="stats">
          <div className="stat-card">
            <span>Total Products</span>
            <strong>{stats.totalProducts}</strong>
          </div>
          <div className="stat-card">
            <span>Total Stock Quantity</span>
            <strong>{stats.totalQuantity}</strong>
          </div>
          <div className="stat-card warning">
            <span>Low Stock Items</span>
            <strong>{stats.lowStockItems}</strong>
          </div>
        </section>

        
          
        <section className="panel">
          <h2>{editingId ? "Edit Product" : "Add New Product"}</h2>
          <form className="product-form" onSubmit={saveProduct}>
            <input placeholder="Product name" required value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })} />
            <input placeholder="SKU" required value={product.sku}
              onChange={(e) => setProduct({ ...product, sku: e.target.value })} />
            <input placeholder="Description" value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })} />
            <input type="number" min="0" placeholder="Quantity" required value={product.quantity}
              onChange={(e) => setProduct({ ...product, quantity: e.target.value })} />
            <input type="number" min="0" step="0.01" placeholder="Cost price"
              value={product.cost_price}
              onChange={(e) => setProduct({ ...product, cost_price: e.target.value })} />
            <input type="number" min="0" step="0.01" placeholder="Selling price"
              value={product.selling_price}
              onChange={(e) => setProduct({ ...product, selling_price: e.target.value })} />
            <input type="number" min="0" placeholder="Low stock threshold"
              value={product.low_stock_threshold}
              onChange={(e) => setProduct({ ...product, low_stock_threshold: e.target.value })} />
            <button type="submit">{editingId ? "Update Product" : "Add Product"}</button>
            {editingId && <button type="button" className="cancel"
              onClick={() => { setEditingId(null); setProduct(emptyProduct); }}>Cancel</button>}
          </form>
        </section>

        <section className="panel">
          <div className="table-heading">
            <h2>Products</h2>
            <input className="search" placeholder="Search name or SKU..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>SKU</th><th>Quantity</th>
                  <th>Stock Status</th><th>Selling Price</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => {
                  const threshold = item.low_stock_threshold ?? 5;
                  const low = item.quantity <= threshold;
                  return (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.sku}</td>
                      <td>{item.quantity}</td>
                      <td><span className={low ? "status low" : "status good"}>
                        {low ? "Low Stock" : "In Stock"}
                      </span></td>
                      <td>{item.selling_price == null ? "—" : `₹${item.selling_price}`}</td>
                      <td>
                        <button className="small edit" onClick={() => editProduct(item)}>Edit</button>
                        <button className="small delete" onClick={() => deleteProduct(item.id)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr><td colSpan="6" className="empty">No products found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Low Stock Items</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Quantity on Hand</th>
                  <th>Low Stock Threshold</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.sku}</td>
                    <td>{item.quantity}</td>
                    <td>{item.lowStockThreshold}</td>
                  </tr>
                ))}
                {lowStockProducts.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty">No low stock items.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
