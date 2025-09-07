const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Models
const User = require("./models/user");
const Item = require("./models/item");
const Cart = require("./models/cart");

// Middleware
const auth = require("./middleware/auth");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const PORT = process.env.PORT || 5000;

// =====================
// ROOT TEST ROUTE
// =====================
app.get("/api", (req, res) => {
  res.send("Hello Ecom API 🚀");
});

// =====================
// USER AUTH
// =====================

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profile (Protected)
app.get("/api/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// ITEM CRUD
// =====================

// Create Item (Protected)
app.post("/api/items", auth, async (req, res) => {
  try {
    const { title, des, price, image } = req.body;
    const item = await Item.create({ title, des, price, image });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get All Items
app.get("/api/items", async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Item
app.get("/api/items/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Item (Protected)
app.put("/api/items/:id", auth, async (req, res) => {
  try {
    const { title, des, price, image } = req.body;
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      { title, des, price, image },
      { new: true }
    );
    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Item (Protected)
app.delete("/api/items/:id", auth, async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    res.json(deletedItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// CART ROUTES (User-specific)
// =====================

// Add to Cart
app.post("/api/cart", auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    const product = await Item.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    // Only add if it doesn't exist
    const exists = cart.items.find((item) => item.product.toString() === productId);
    if (!exists) {
      cart.items.push({
        product: product._id,
        name: product.title,
        image: product.image,
        price: product.price,
      });
    }

    await cart.save();
    res.status(201).json(cart);
  } catch (err) {
    console.error("Add to cart error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get Cart
app.get("/api/cart", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    res.json(cart || { items: [] });
  } catch (err) {
    console.error("Get cart error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Remove Item from Cart
app.delete("/api/cart/:productId", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== req.params.productId
    );

    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error("Remove cart item error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Clear Cart
app.delete("/api/cart", auth, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user.id });
    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("Clear cart error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =====================
// START SERVER
// =====================
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
