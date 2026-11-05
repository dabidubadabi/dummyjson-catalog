const API = "https://dummyjson.com";
const LIMIT = 12;
const STORAGE_KEY = "dummyjson-catalog-changes";

const grid = document.getElementById("grid");
const status = document.getElementById("status");
const searchInput = document.getElementById("search");
const pageInfo = document.getElementById("pageInfo");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const addBtn = document.getElementById("addBtn");
const dialog = document.getElementById("productDialog");
const form = document.getElementById("productForm");
const dialogTitle = document.getElementById("dialogTitle");
const cancelBtn = document.getElementById("cancelBtn");

let skip = 0;
let total = 0;
let editingId = null;
let allProducts = [];

function getLocalChanges() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    added: [],
    updated: {},
    deleted: []
  };
}

function saveLocalChanges(changes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(changes));
}

function applyLocalChanges(products) {
  const changes = getLocalChanges();

  const remaining = products.filter(
    product => !changes.deleted.includes(product.id)
  );

  const edited = remaining.map(product => {
    if (changes.updated[product.id]) {
      return { ...product, ...changes.updated[product.id] };
    }
    return product;
  });

  return [...changes.added, ...edited];
}

async function fetchProducts() {
  const response = await fetch(
    `${API}/products?limit=0&skip=0`
  );

  if (!response.ok) {
    throw new Error("Could not load products from DummyJSON");
  }

  const data = await response.json();
  return applyLocalChanges(data.products);
}

function formatPrice(value) {
  return "$" + Number(value).toFixed(2);
}

function createCard(product) {
  const card = document.createElement("article");
  card.className = "card";

  card.innerHTML = `
    <img src="${product.thumbnail}" alt="${product.title}" />
    <div class="card-body">
      <h3>${product.title}</h3>
      <div class="price">${formatPrice(product.price)}</div>
      <div class="meta">${product.brand || "No brand"}</div>
      <div class="meta">Stock: ${product.stock ?? 0}</div>
      <div class="actions">
        <button class="editBtn">Edit</button>
        <button class="deleteBtn">Delete</button>
      </div>
    </div>
  `;

  card.querySelector(".editBtn").onclick = () => openForm(product);
  card.querySelector(".deleteBtn").onclick = () => deleteProduct(product);

  return card;
}

function showProducts() {
  grid.innerHTML = "";

  const search = searchInput.value.trim().toLowerCase();

  const filtered = allProducts.filter(product =>
    product.title.toLowerCase().includes(search)
  );

  total = filtered.length;
  const visibleProducts = filtered.slice(skip, skip + LIMIT);

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

async function loadProducts() {
  status.textContent = "Loading products...";

  try {
    allProducts = await fetchProducts();
    showProducts();
  } catch (error) {
    status.textContent = "Could not load products.";
  }
}

function openForm(product = null) {
  editingId = product ? product.id : null;

  dialogTitle.textContent = editingId ? "Edit Product" : "Add Product";
  form.reset();

  if (product) {
    form.title.value = product.title;
    form.description.value = product.description || "";
    form.price.value = product.price;
    form.stock.value = product.stock || 0;
    form.thumbnail.value = product.thumbnail || "";
  }

  dialog.showModal();
}

function getNextId() {
  const changes = getLocalChanges();
  const localIds = changes.added.map(product => product.id);
  return Math.max(1000, ...localIds) + 1;
}

async function saveProduct(event) {
  event.preventDefault();

  const productData = {
    title: form.title.value.trim(),
    description: form.description.value.trim(),
    price: Number(form.price.value),
    stock: Number(form.stock.value),
    thumbnail:
      form.thumbnail.value.trim() ||
      "https://dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp"
  };

  const changes = getLocalChanges();

  try {
    if (editingId) {
      await fetch(`${API}/products/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      changes.updated[editingId] = productData;
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
      changes.added.push({
        ...newProduct,
        ...productData,
        id: getNextId()
      });

      status.textContent = "Product added.";
    }

    saveLocalChanges(changes);
    dialog.close();
    await loadProducts();
  } catch (error) {
    status.textContent = "Could not save product.";
  }
}

async function deleteProduct(product) {
  const confirmed = confirm(`Delete "${product.title}"?`);

  if (!confirmed) return;

  const changes = getLocalChanges();

  try {
    await fetch(`${API}/products/${product.id}`, {
      method: "DELETE"
    });

    if (!changes.deleted.includes(product.id)) {
      changes.deleted.push(product.id);
    }

    changes.added = changes.added.filter(
      item => item.id !== product.id
    );

    delete changes.updated[product.id];

    saveLocalChanges(changes);
    status.textContent = "Product deleted.";
    await loadProducts();
  } catch (error) {
    status.textContent = "Could not delete product.";
  }
}

searchInput.addEventListener("input", () => {
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

addBtn.onclick = () => openForm();
cancelBtn.onclick = () => dialog.close();
form.addEventListener("submit", saveProduct);

loadProducts();