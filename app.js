const API = "https://dummyjson.com";
const LIMIT = 12;
const CART_KEY = "simple-store-cart";
const INVENTORY_KEY = "simple-store-inventory";
const SHIPPING_FEE = 5;
const LOW_STOCK_THRESHOLD = 10;

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
const inventoryPanel = document.getElementById("inventoryPanel");
const inventoryRows = document.getElementById("inventoryRows");
const inventoryProductCount = document.getElementById("inventoryProductCount");
const inventoryUnitCount = document.getElementById("inventoryUnitCount");
const inventoryAlertCount = document.getElementById("inventoryAlertCount");

const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const closeCartBtn = document.getElementById("closeCartBtn");
const checkoutBtn = document.getElementById("checkoutBtn");
const checkoutDialog = document.getElementById("checkoutDialog");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutItems = document.getElementById("checkoutItems");
const checkoutSubtotal = document.getElementById("checkoutSubtotal");
const checkoutShipping = document.getElementById("checkoutShipping");
const checkoutTotal = document.getElementById("checkoutTotal");
const checkoutError = document.getElementById("checkoutError");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const closeCheckoutBtn = document.getElementById("closeCheckoutBtn");
const logoutBtn = document.getElementById("logoutBtn");
const toast = document.getElementById("toast");

let products = [];
let skip = 0;
let total = 0;
let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let selectedCartIds = new Set(cart.map(item => item.id));
let inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY)) || {};
let currentUser = localStorage.getItem("simple-store-user") || "";

const money = value => "$" + Number(value || 0).toFixed(2);
const isAdmin = () => currentUser === "admin";

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

  if (
    (username === "user123" && password === "password") ||
    (username === "admin" && password === "admin123")
  ) {
    currentUser = username;
    localStorage.setItem("simple-store-user", username);
    loginError.textContent = "";
    showApp();
  } else {
    loginError.textContent = "Invalid username or password.";
  }
}

function showApp() {
  const admin = isAdmin();
  loginPage.classList.add("hidden");
  app.classList.remove("hidden");
  sortSelect.classList.toggle("hidden", admin);
  cartBtn.classList.toggle("hidden", admin);
  cartDrawer.classList.toggle("hidden", admin);
  cartOverlay.classList.toggle("hidden", admin);
  grid.classList.toggle("hidden", admin);
  document.querySelector(".pagination").classList.toggle("hidden", admin);
  inventoryPanel.classList.toggle("hidden", !admin);
  searchInput.placeholder = admin ? "Search inventory..." : "Search products...";
  sectionTitle.textContent = admin ? "Inventory management" : "Suggested products";
  loadProducts();
}

function logout() {
  currentUser = "";
  localStorage.removeItem("simple-store-user");
  location.reload();
}

async function loadProducts() {
  status.textContent = "Loading products...";

  try {
    const response = await fetch(`${API}/products?limit=0`);
    if (!response.ok) {
      throw new Error(`Product request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.products)) {
      throw new Error("Product response did not contain a product list");
    }

    products = data.products;
    initializeInventory();
    if (isAdmin()) {
      renderInventory();
    } else {
      renderProducts();
    }
  } catch (error) {
    status.textContent = "Could not load products.";
  }
}

function initializeInventory() {
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    inventory = {};
  }

  products.forEach(product => {
    if (!Number.isInteger(inventory[product.id]) || inventory[product.id] < 0) {
      const stock = Number(product.stock);
      inventory[product.id] = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
    }
  });

  saveInventory();
}

function saveInventory() {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
}

function getStock(productId) {
  return Number.isInteger(inventory[productId]) ? inventory[productId] : 0;
}

function renderInventory() {
  inventoryRows.innerHTML = "";

  const search = searchInput.value.trim().toLowerCase();
  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(search)
  );
  const totalUnits = products.reduce((sum, product) => sum + getStock(product.id), 0);
  const alertCount = products.filter(product =>
    getStock(product.id) <= LOW_STOCK_THRESHOLD
  ).length;

  inventoryProductCount.textContent = products.length;
  inventoryUnitCount.textContent = totalUnits;
  inventoryAlertCount.textContent = alertCount;
  status.textContent = `${filteredProducts.length} inventory products found`;

  filteredProducts.forEach(product => {
    const stock = getStock(product.id);
    const row = document.createElement("tr");
    row.className = stock === 0 ? "out-of-stock" : stock <= LOW_STOCK_THRESHOLD ? "low-stock" : "";

    const productCell = document.createElement("td");
    const productInfo = document.createElement("div");
    productInfo.className = "inventory-product";
    const image = document.createElement("img");
    image.src = product.thumbnail;
    image.alt = "";
    const title = document.createElement("span");
    title.textContent = product.title;
    productInfo.append(image, title);
    productCell.appendChild(productInfo);

    const priceCell = document.createElement("td");
    priceCell.textContent = money(product.price);

    const stockCell = document.createElement("td");
    stockCell.textContent = stock;

    const statusCell = document.createElement("td");
    statusCell.textContent = stock === 0
      ? "Out of stock"
      : stock <= LOW_STOCK_THRESHOLD
        ? "Low stock"
        : "In stock";

    const updateCell = document.createElement("td");
    const updateForm = document.createElement("form");
    updateForm.className = "stock-update";
    const stockInput = document.createElement("input");
    stockInput.type = "number";
    stockInput.min = "0";
    stockInput.step = "1";
    stockInput.value = stock;
    stockInput.setAttribute("aria-label", `New stock quantity for ${product.title}`);
    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "ghost-button";
    saveButton.textContent = "Save";

    updateForm.append(stockInput, saveButton);
    updateForm.onsubmit = event => {
      event.preventDefault();
      const nextStock = Number(stockInput.value);
      if (!Number.isInteger(nextStock) || nextStock < 0) {
        stockInput.setCustomValidity("Enter a whole number of zero or more.");
        stockInput.reportValidity();
        return;
      }

      stockInput.setCustomValidity("");
      inventory[product.id] = nextStock;
      saveInventory();
      renderInventory();
      showToast("Inventory updated");
    };
    updateCell.appendChild(updateForm);

    row.append(productCell, priceCell, stockCell, statusCell, updateCell);
    inventoryRows.appendChild(row);
  });
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

  if (getStock(product.id) === 0 || (existing && existing.quantity >= getStock(product.id))) {
    showToast("Not enough stock available");
    return;
  }

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

  selectedCartIds.add(product.id);
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
        <label class="cart-select">
          <input class="cart-checkbox" type="checkbox" />
          Include in checkout
        </label>
        <div class="qty">
          <button class="minus">−</button>
          <span>${item.quantity}</span>
          <button class="plus">+</button>
          <button class="remove">Remove</button>
        </div>
      </div>
      <strong>${money(item.price * item.quantity)}</strong>
    `;

    const checkbox = row.querySelector(".cart-checkbox");
    checkbox.checked = selectedCartIds.has(item.id);
    checkbox.setAttribute("aria-label", `Include ${item.title} in checkout`);
    checkbox.onchange = () => {
      if (checkbox.checked) {
        selectedCartIds.add(item.id);
      } else {
        selectedCartIds.delete(item.id);
      }

      renderCart();
    };

    row.querySelector(".plus").onclick = () => {
      if (item.quantity >= getStock(item.id)) {
        showToast("Not enough stock available");
        return;
      }

      item.quantity++;
      saveCart();
      renderCart();
    };

    row.querySelector(".minus").onclick = () => {
      item.quantity--;

      if (item.quantity <= 0) {
        cart = cart.filter(cartItem => cartItem.id !== item.id);
        selectedCartIds.delete(item.id);
      }

      saveCart();
      renderCart();
    };

    row.querySelector(".remove").onclick = () => {
      cart = cart.filter(cartItem => cartItem.id !== item.id);
      selectedCartIds.delete(item.id);
      saveCart();
      renderCart();
    };

    cartItems.appendChild(row);
  });

  const totalPrice = cart.reduce(
    (sum, item) => sum + (
      selectedCartIds.has(item.id) ? item.price * item.quantity : 0
    ),
    0
  );

  cartTotal.textContent = money(totalPrice);
  checkoutBtn.disabled = cart.length === 0;
}

function getSelectedCartItems() {
  return cart.filter(item => selectedCartIds.has(item.id));
}

function renderCheckoutSummary() {
  const selectedItems = getSelectedCartItems();
  checkoutItems.innerHTML = "";

  if (selectedItems.length === 0) {
    checkoutItems.textContent = "No products selected. Close checkout and select products in your cart.";
  }

  selectedItems.forEach(item => {
    const row = document.createElement("div");
    row.className = "checkout-item";
    const name = document.createElement("span");
    name.textContent = `${item.title} × ${item.quantity}`;
    const price = document.createElement("strong");
    price.textContent = money(item.price * item.quantity);
    row.append(name, price);
    checkoutItems.appendChild(row);
  });

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  checkoutSubtotal.textContent = money(subtotal);
  checkoutShipping.textContent = money(SHIPPING_FEE);
  checkoutTotal.textContent = money(subtotal + SHIPPING_FEE);
  placeOrderBtn.disabled = selectedItems.length === 0;
}

function checkout() {
  if (cart.length === 0) {
    showToast("Your cart is empty");
    return;
  }

  if (getSelectedCartItems().length === 0) {
    showToast("Select at least one product to check out");
    return;
  }

  closeCart();
  checkoutError.textContent = "";
  renderCheckoutSummary();
  checkoutDialog.showModal();
}

async function placeOrder(event) {
  event.preventDefault();
  checkoutError.textContent = "";

  if (isAdmin()) {
    checkoutError.textContent = "Checkout is only available to customers.";
    return;
  }

  if ([...checkoutForm.elements]
    .filter(element => element.tagName === "INPUT")
    .some(element => !element.value.trim())) {
    checkoutError.textContent = "Complete all shipping address fields.";
    return;
  }

  const postalCodeInput = checkoutForm.elements.postalCode;
  postalCodeInput.setCustomValidity("");
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{0,11}$/.test(postalCodeInput.value.trim())) {
    postalCodeInput.setCustomValidity("Enter a valid postal code.");
    checkoutForm.reportValidity();
    return;
  }

  if (!checkoutForm.reportValidity()) {
    return;
  }

  const selectedItems = getSelectedCartItems();
  if (selectedItems.length === 0) {
    checkoutError.textContent = "Select at least one product to check out.";
    return;
  }

  const unavailableItem = selectedItems.find(item => item.quantity > getStock(item.id));
  if (unavailableItem) {
    checkoutError.textContent = `There is not enough stock for ${unavailableItem.title}. Update your cart and try again.`;
    return;
  }

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const order = {
    userId: 1,
    products: selectedItems.map(item => ({
      id: item.id,
      quantity: item.quantity
    }))
  };

  placeOrderBtn.disabled = true;
  placeOrderBtn.textContent = "Placing order...";

  try {
    const response = await fetch(`${API}/carts/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(order)
    });
    if (!response.ok) {
      throw new Error(`Checkout request failed with status ${response.status}`);
    }
    await response.json();

    const purchasedIds = new Set(selectedItems.map(item => item.id));
    selectedItems.forEach(item => {
      inventory[item.id] = getStock(item.id) - item.quantity;
    });
    saveInventory();
    cart = cart.filter(item => !purchasedIds.has(item.id));
    purchasedIds.forEach(id => selectedCartIds.delete(id));
    saveCart();
    checkoutForm.reset();
    checkoutDialog.close();
    showToast(`Purchase complete: ${money(subtotal + SHIPPING_FEE)} including shipping`);
  } catch (error) {
    checkoutError.textContent = "Checkout failed. Please check your connection and try again.";
  } finally {
    placeOrderBtn.disabled = getSelectedCartItems().length === 0;
    placeOrderBtn.textContent = "Place order";
    renderCart();
  }
}

loginForm.addEventListener("submit", login);
logoutBtn.onclick = logout;

searchInput.addEventListener("input", () => {
  if (isAdmin()) {
    renderInventory();
  } else {
    skip = 0;
    renderProducts();
  }
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
checkoutForm.addEventListener("submit", placeOrder);
closeCheckoutBtn.onclick = () => checkoutDialog.close();

saveCart();

if (localStorage.getItem("simple-store-user")) {
  showApp();
}