const API = "https://dummyjson.com";
const LIMIT = 12;
const CART_KEY = "simple-store-cart";

const loginPage = document.getElementById("loginPage");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const app = document.getElementById("app");

const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sortSelect");
const grid = document.getElementById("grid");
const status = document.getElementById("status");
const sectionTitle = document.getElementById("sectionTitle");
const pageInfo = document.getElementById("pageInfo");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const closeCartBtn = document.getElementById("closeCartBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const logoutBtn = document.getElementById("logoutBtn");
const toast = document.getElementById("toast");

let products = [];
let skip = 0;
let total = 0;
let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];

const money = value => "$" + Number(value || 0).toFixed(2);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

function login(event) {
  event.preventDefault();

  const username = loginForm.username.value.trim();
  const password = loginForm.password.value;

  if (username === "user123" && password === "password") {
    localStorage.setItem("simple-store-user", username);
    loginError.textContent = "";
    showApp();
  } else {
    loginError.textContent = "Invalid username or password.";
  }
}

function showApp() {
  loginPage.classList.add("hidden");
  app.classList.remove("hidden");
  loadProducts();
}

function logout() {
  localStorage.removeItem("simple-store-user");
  location.reload();
}

async function loadProducts() {
  status.textContent = "Loading products...";

  try {
    const response = await fetch(`${API}/products?limit=0`);
    const data = await response.json();

    products = data.products;
    renderProducts();
  } catch (error) {
    status.textContent = "Could not load products.";
  }
}

function getSortedProducts() {
  const search = searchInput.value.trim().toLowerCase();
  const sort = sortSelect.value;

  let list = products.filter(product =>
    product.title.toLowerCase().includes(search)
  );

  if (sort === "price-asc") {
    list.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-desc") {
    list.sort((a, b) => b.price - a.price);
  }

  if (sort === "title-asc") {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sort === "rating-desc") {
    list.sort((a, b) => b.rating - a.rating);
  }

  return list;
}

function renderProducts() {
  grid.innerHTML = "";

  const list = getSortedProducts();
  total = list.length;

  sectionTitle.textContent =
    sortSelect.value === "suggested" ? "Suggested products" : "Products";

  list.slice(skip, skip + LIMIT).forEach(product => {
    grid.appendChild(createProductCard(product));
  });

  const page = Math.floor(skip / LIMIT) + 1;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  pageInfo.textContent = `Page ${page} of ${pages}`;
  prevBtn.disabled = skip === 0;
  nextBtn.disabled = skip + LIMIT >= total;

  status.textContent = `${total} products found`;
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product";

  card.innerHTML = `
    <div class="product-image">
      <img src="${product.thumbnail}" alt="${product.title}" />
    </div>

    <div class="product-body">
      <h3 class="product-title">${product.title}</h3>
      <p class="product-meta">${product.brand || "No brand"}</p>

      <div class="price-row">
        <span class="price">${money(product.price)}</span>
        <span class="rating">★ ${product.rating}</span>
      </div>

      <button class="add-button">Add to cart</button>
    </div>
  `;

  card.querySelector(".add-button").onclick = () => addToCart(product);

  return card;
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
  showToast("Added to cart");
}

function openCart() {
  renderCart();
  cartDrawer.classList.add("open");
  cartOverlay.classList.add("show");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("show");
}

function renderCart() {
  cartItems.innerHTML = "";

  if (cart.length === 0) {
    cartItems.innerHTML = `<p class="muted">Your cart is empty.</p>`;
  }

  cart.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <img src="${item.thumbnail}" alt="${item.title}" />
      <div>
        <h4>${item.title}</h4>
        <p>${money(item.price)} each</p>
        <div class="qty">
          <button class="minus">−</button>
          <span>${item.quantity}</span>
          <button class="plus">+</button>
          <button class="remove">Remove</button>
        </div>
      </div>
      <strong>${money(item.price * item.quantity)}</strong>
    `;

    row.querySelector(".plus").onclick = () => {
      item.quantity++;
      saveCart();
      renderCart();
    };

    row.querySelector(".minus").onclick = () => {
      item.quantity--;

      if (item.quantity <= 0) {
        cart = cart.filter(cartItem => cartItem.id !== item.id);
      }

      saveCart();
      renderCart();
    };

    row.querySelector(".remove").onclick = () => {
      cart = cart.filter(cartItem => cartItem.id !== item.id);
      saveCart();
      renderCart();
    };

    cartItems.appendChild(row);
  });

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  cartTotal.textContent = money(totalPrice);
}

function checkout() {
  if (cart.length === 0) {
    showToast("Your cart is empty");
    return;
  }

  const order = {
    userId: 1,
    products: cart.map(item => ({
      id: item.id,
      quantity: item.quantity
    }))
  };

  fetch(`${API}/carts/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(order)
  })
    .then(response => response.json())
    .then(result => {
      showToast(`Purchase complete: ${money(result.total)}`);
      cart = [];
      saveCart();
      closeCart();
    })
    .catch(() => {
      showToast("Checkout failed");
    });
}

loginForm.addEventListener("submit", login);
logoutBtn.onclick = logout;

searchInput.addEventListener("input", () => {
  skip = 0;
  renderProducts();
});

sortSelect.addEventListener("change", () => {
  skip = 0;
  renderProducts();
});

prevBtn.onclick = () => {
  skip = Math.max(0, skip - LIMIT);
  renderProducts();
};

nextBtn.onclick = () => {
  if (skip + LIMIT < total) {
    skip += LIMIT;
    renderProducts();
  }
};

cartBtn.onclick = openCart;
closeCartBtn.onclick = closeCart;
cartOverlay.onclick = closeCart;
checkoutBtn.onclick = checkout;

saveCart();

if (localStorage.getItem("simple-store-user")) {
  showApp();
}