const API = "https://dummyjson.com";
const LIMIT = 12;
const CART_KEY = "dummyjson-cart";
const USER_KEY = "dummyjson-user";

const grid = document.getElementById("grid");
const status = document.getElementById("status");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sortSelect");
const pageInfo = document.getElementById("pageInfo");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartDialog = document.getElementById("cartDialog");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const closeCartBtn = document.getElementById("closeCartBtn");
const checkoutBtn = document.getElementById("checkoutBtn");

const loginBtn = document.getElementById("loginBtn");
const loginDialog = document.getElementById("loginDialog");
const loginForm = document.getElementById("loginForm");
const loginCancelBtn = document.getElementById("loginCancelBtn");

const addBtn = document.getElementById("addBtn");
const productDialog = document.getElementById("productDialog");
const productForm = document.getElementById("productForm");
const dialogTitle = document.getElementById("dialogTitle");
const cancelBtn = document.getElementById("cancelBtn");

let skip = 0;
let total = 0;
let editingId = null;
let allProducts = [];
let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let currentUser = JSON.parse(localStorage.getItem(USER_KEY)) || null;

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = count;
}

function formatPrice(value) {
  return "$" + Number(value || 0).toFixed(2);
}

function getCartTotal() {
  return cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );
}

function createCard(product) {
  const card = document.createElement("article");
  card.className = "card";

  const stock = product.stock ?? 0;
  const stockClass = stock > 10 ? "stock" : "stock low";
  const stockText = stock > 10 ? `In stock: ${stock}` : `Low stock: ${stock}`;

  card.innerHTML = `
    <div class="image-wrap">
      <span class="badge">${product.category || "Product"}</span>
      <img src="${product.thumbnail}" alt="${product.title}" loading="lazy" />
    </div>

    <div class="card-body">
      <h3>${product.title}</h3>
      <div class="price">${formatPrice(product.price)}</div>
      <div class="meta">⭐ ${product.rating ?? "No rating"}</div>
      <div class="meta">${product.brand || "No brand"}</div>
      <div class="${stockClass}">${stockText}</div>

      <div class="actions">
        <button class="add-cart-btn">Add to cart</button>
        <button class="editBtn">Edit</button>
        <button class="deleteBtn">Delete</button>
      </div>
    </div>
  `;

  card.querySelector(".add-cart-btn").onclick = () => addToCart(product);
  card.querySelector(".editBtn").onclick = () => openProductForm(product);
  card.querySelector(".deleteBtn").onclick = () => deleteProduct(product);

  const image = card.querySelector("img");

  image.onerror = () => {
    image.src =
      "https://dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp";
  };

  return card;
}

async function loadProducts() {
  status.textContent = "Loading products...";

  try {
    const response = await fetch(`${API}/products?limit=0&skip=0`);

    if (!response.ok) {
      throw new Error("Could not load products");
    }

    const data = await response.json();
    allProducts = data.products;

    showProducts();
  } catch (error) {
    status.textContent = "Could not load products.";
  }
}

function getFilteredProducts() {
  const search = searchInput.value.trim().toLowerCase();
  const sortValue = sortSelect.value;

  let products = allProducts.filter(product =>
    product.title.toLowerCase().includes(search)
  );

  if (sortValue === "price-asc") {
    products.sort((a, b) => a.price - b.price);
  }

  if (sortValue === "price-desc") {
    products.sort((a, b) => b.price - a.price);
  }

  if (sortValue === "title-asc") {
    products.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sortValue === "title-desc") {
    products.sort((a, b) => b.title.localeCompare(a.title));
  }

  if (sortValue === "rating-desc") {
    products.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return products;
}

function showProducts() {
  grid.innerHTML = "";

  const products = getFilteredProducts();
  total = products.length;

  const visibleProducts = products.slice(skip, skip + LIMIT);

  visibleProducts.forEach(product => {
    grid.appendChild(createCard(product));
  });

  const page = Math.floor(skip / LIMIT) + 1;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  pageInfo.textContent = `Page ${page} of ${pages}`;
  prevBtn.disabled = skip === 0;
  nextBtn.disabled = skip + LIMIT >= total;

  status.textContent = `${total} product(s) found.`;
}

function addToCart(product) {
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      quantity: 1
    });
  }

  saveCart();
  status.textContent = `"${product.title}" added to cart.`;
}

function showCart() {
  cartItems.innerHTML = "";

  if (cart.length === 0) {
    cartItems.innerHTML = `<p class="empty-cart">Your cart is empty.</p>`;
    cartTotal.textContent = formatPrice(0);
    cartDialog.showModal();
    return;
  }

  cart.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <img src="${item.thumbnail}" alt="${item.title}" />
      <div>
        <h4>${item.title}</h4>
        <div class="meta">${formatPrice(item.price)} each</div>
        <div class="quantity-controls">
          <button class="decrease">−</button>
          <span>${item.quantity}</span>
          <button class="increase">+</button>
          <button class="remove">Remove</button>
        </div>
      </div>
      <div class="cart-item-price">
        <strong>${formatPrice(item.price * item.quantity)}</strong>
      </div>
    `;

    row.querySelector(".increase").onclick = () => {
      item.quantity += 1;
      saveCart();
      showCart();
    };

    row.querySelector(".decrease").onclick = () => {
      item.quantity -= 1;

      if (item.quantity <= 0) {
        cart = cart.filter(cartItem => cartItem.id !== item.id);
      }

      saveCart();
      showCart();
    };

    row.querySelector(".remove").onclick = () => {
      cart = cart.filter(cartItem => cartItem.id !== item.id);
      saveCart();
      showCart();
    };

    cartItems.appendChild(row);
  });

  cartTotal.textContent = formatPrice(getCartTotal());
  cartDialog.showModal();
}

async function purchaseCart() {
  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  if (!currentUser) {
    alert("Please log in before purchasing.");
    loginDialog.showModal();
    return;
  }

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Processing...";

  const payload = {
    userId: currentUser.id,
    products: cart.map(item => ({
      id: item.id,
      quantity: item.quantity
    }))
  };

  try {
    const response = await fetch(`${API}/carts/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUser.accessToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Purchase failed");
    }

    const result = await response.json();

    alert(
      `Purchase successful!\n\n` +
      `Order total: ${formatPrice(result.total)}\n` +
      `Items: ${result.totalProducts}`
    );

    cart = [];
    saveCart();
    cartDialog.close();
  } catch (error) {
    alert("Could not complete the purchase. Please try again.");
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Purchase";
  }
}

async function login(event) {
  event.preventDefault();

  const username = loginForm.username.value.trim();
  const password = loginForm.password.value;

  status.textContent = "Logging in...";

  try {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        expiresInMins: 60
      })
    });

    if (!response.ok) {
      throw new Error("Invalid username or password");
    }

    currentUser = await response.json();

    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));

    loginBtn.textContent = `Hi, ${currentUser.firstName}`;
    loginDialog.close();
    status.textContent = `Welcome, ${currentUser.firstName}!`;
  } catch (error) {
    status.textContent = "Invalid username or password.";
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem(USER_KEY);
  loginBtn.textContent = "Log in";
  status.textContent = "You are logged out.";
}

function openProductForm(product = null) {
  editingId = product ? product.id : null;

  dialogTitle.textContent = editingId ? "Edit Product" : "Add Product";
  productForm.reset();

  if (product) {
    productForm.title.value = product.title;
    productForm.description.value = product.description || "";
    productForm.price.value = product.price;
    productForm.stock.value = product.stock || 0;
    productForm.thumbnail.value = product.thumbnail || "";
  }

  productDialog.showModal();
}

function getNextId() {
  const localIds = allProducts.map(product => product.id);
  return Math.max(1000, ...localIds) + 1;
}

async function saveProduct(event) {
  event.preventDefault();

  const productData = {
    title: productForm.title.value.trim(),
    description: productForm.description.value.trim(),
    price: Number(productForm.price.value),
    stock: Number(productForm.stock.value),
    thumbnail:
      productForm.thumbnail.value.trim() ||
      "https://dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp"
  };

  try {
    if (editingId) {
      await fetch(`${API}/products/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      const index = allProducts.findIndex(
        product => product.id === editingId
      );

      if (index !== -1) {
        allProducts[index] = {
          ...allProducts[index],
          ...productData
        };
      }

      status.textContent = "Product updated.";
    } else {
      const response = await fetch(`${API}/products/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        throw new Error("Could not add product");
      }

      const newProduct = await response.json();

      allProducts.unshift({
        ...newProduct,
        ...productData,
        id: getNextId()
      });

      status.textContent = "Product added.";
    }

    productDialog.close();
    showProducts();
  } catch (error) {
    status.textContent = "Could not save product.";
  }
}

async function deleteProduct(product) {
  const confirmed = confirm(`Delete "${product.title}"?`);

  if (!confirmed) return;

  try {
    await fetch(`${API}/products/${product.id}`, {
      method: "DELETE"
    });

    allProducts = allProducts.filter(
      item => item.id !== product.id
    );

    status.textContent = "Product deleted.";
    showProducts();
  } catch (error) {
    status.textContent = "Could not delete product.";
  }
}

searchInput.addEventListener("input", () => {
  skip = 0;
  showProducts();
});

sortSelect.addEventListener("change", () => {
  skip = 0;
  showProducts();
});

prevBtn.onclick = () => {
  skip = Math.max(0, skip - LIMIT);
  showProducts();
};

nextBtn.onclick = () => {
  if (skip + LIMIT < total) {
    skip += LIMIT;
    showProducts();
  }
};

cartBtn.onclick = showCart;
closeCartBtn.onclick = () => cartDialog.close();
checkoutBtn.onclick = purchaseCart;

loginBtn.onclick = () => {
  if (currentUser) {
    const confirmLogout = confirm("Log out?");
    if (confirmLogout) logout();
    return;
  }

  loginDialog.showModal();
};

loginCancelBtn.onclick = () => loginDialog.close();
loginForm.addEventListener("submit", login);

addBtn.onclick = () => openProductForm();
cancelBtn.onclick = () => productDialog.close();
productForm.addEventListener("submit", saveProduct);

updateCartCount();

if (currentUser) {
  loginBtn.textContent = `Hi, ${currentUser.firstName}`;
}

loadProducts();