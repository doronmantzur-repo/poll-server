const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db/pool");

const router = express.Router();
const SALT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/signup", async (req, res) => {
  const { user_name, password } = req.body;

  if (!user_name || !password) {
    return res.status(400).json({ error: "user_name and password are required" });
  }

  if (!EMAIL_PATTERN.test(user_name.trim())) {
    return res.status(400).json({ error: "user_name must be a valid email address" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      "INSERT INTO users (user_name, password) VALUES ($1, $2) RETURNING id, user_name",
      [user_name, passwordHash]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username already taken" });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { user_name, password } = req.body;

  if (!user_name || !password) {
    return res.status(400).json({ error: "user_name and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, user_name, password FROM users WHERE user_name = $1",
      [user_name]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.status(200).json({ user: { id: user.id, user_name: user.user_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
