import express from "express";
import db from "../models/db-stw.js";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/", async (req, res) => {
  const {
    email,
    username,
    phone,
    password,
    id,
    ordersCompleted,
    ordersRequested,
    rating,
  } = req.body;

  if (!email || !username || !phone || !password || !id) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }
  // 10 adalah tingkat kekuatan hashing
  const hashedPassword = await bcrypt.hash(password, 10);
  const nowDate = new Date();

  const query =
    "INSERT INTO user_stw (id, email, username, phone, user_password, created_at, orders_completed, orders_requested, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  db.query(
    query,
    [
      id,
      email,
      username,
      phone,
      hashedPassword,
      nowDate,
      ordersCompleted,
      ordersRequested,
      rating,
    ],
    (err, result) => {
      if (err) {
        console.error("Gagal menambahkan data: ", err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
      } else {
        res.status(201).json({ message: "Pengguna berhasil ditambahkan" });
      }
    }
  );
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password harus diisi" });
  }

  const query = "SELECT * FROM user_stw WHERE email = ?";

  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Database error: ", err);
      return res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Email tidak ditemukan" });
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.user_password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Password salah" });
    }

    const userData = {
      email: user.email,
      username: user.username,
      phone: user.phone,
      profilePicture: user.profile_picture,
      id: user.id,
      ordersCompleted: user.orders_completed,
      ordersRequested: user.orders_requested,
      rating: user.rating,
    };

    const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login berhasil",
      userData,
      token,
    });
  });
});

const upload = multer({ storage });
router.put(
  "/profile-picture/:id",
  upload.single("profilePicture"),
  (req, res) => {
    const { id } = req.params; // ID user dari URL
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "File gambar tidak ditemukan" });
    }

    const profilePicturePath = `${req.protocol}://${req.get("host")}/uploads/${
      file.filename
    }`;

    const query = "UPDATE user_stw SET profile_picture = ? WHERE id = ?";

    db.query(query, [profilePicturePath, id], (err, result) => {
      if (err) {
        console.error("Gagal mengupdate foto profil: ", err);
        return res.status(500).json({ message: "Terjadi kesalahan server" });
      }

      if (result.affectedRows === 0) {
        console.log(id);

        return res.status(404).json({ message: "Pengguna tidak ditemukan" });
      }

      res.status(200).json({
        message: "Foto profil berhasil diperbarui",
        profilePicture: profilePicturePath,
      });
    });
  }
);

router.post("/create-order", async (req, res) => {
  const {
    orderId,
    clientId,
    orderDate,
    purchaseLocation,
    dropOffLocation,
    orderTime,
    estimationPurchase,
    totalPurchase,
    fee,
    orderDetail,
  } = req.body;
  const query =
    "INSERT INTO orders_stw (order_id, client_id, order_date, purchase_location, dropoff_location, order_time, estimation_purchase, total_purchase, fee, order_detail, status_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')";
  db.query(
    query,
    [
      orderId,
      clientId,
      orderDate,
      purchaseLocation,
      dropOffLocation,
      orderTime,
      estimationPurchase,
      totalPurchase,
      fee,
      orderDetail,
    ],
    (err, result) => {
      if (err) {
        console.error("Gagal menambahkan data: ", err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
      } else {
        res.status(201).json({ message: "Pesanan berhasi dibuat" });
      }
    }
  );
});
router.get("/get-history-order", async (req, res) => {
  
});
router.put("/cancel-order", async (req, res) => {
  const { orderId } = req.body;
  db.query(
    "UPDATE orders_stw SET status_order = ? WHERE order_id = ?",
    ["cancelled", orderId],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: "Gagal membatalkan order" });
      } else if (results.affectedRows === 0) {
        res.status(404).json({ message: "Tidak ada order dibatalkan" });
      } else {
        res.status(200).json({ message: "Order berhasil dibatalkan" });
      }
    }
  );
});

router.put("/finished-order", async (req, res) => {
  const { orderData } = req.body;
  db.query(
    "UPDATE orders_stw SET status_order = ? WHERE order_id = ?",
    ["completed", orderData.orderId],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: "Gagal set order" });
      } else if (results.affectedRows === 0) {
        res.status(404).json({ message: "Tidak ada order diselesaikan" });
      } else {
        res.status(200).json({ message: "Order berhasil diselesaikan" });
      }
    }
  );
});

export default router;
