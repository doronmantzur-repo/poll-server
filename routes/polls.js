const express = require("express");
const pool = require("../db/pool");

const router = express.Router();
const MAX_ANSWERS = 8;
const MIN_ANSWERS = 2;

router.get("/", async (req, res) => {
  const { user_id } = req.query;

  try {
    const result = user_id
      ? await pool.query("SELECT * FROM polls WHERE user_id = $1 ORDER BY id DESC", [user_id])
      : await pool.query("SELECT * FROM polls ORDER BY id DESC");

    res.status(200).json({ polls: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/browse", async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  try {
    const result = await pool.query(
      `SELECT p.*,
              COALESCE(
                array_agg(pa.answer) FILTER (WHERE pa.answer IS NOT NULL),
                '{}'
              ) AS my_answers
       FROM polls p
       LEFT JOIN poll_answers pa ON pa.poll_id = p.id AND pa.user_id = $1
       WHERE p.user_id = $1 OR p.is_public = true
       GROUP BY p.id
       ORDER BY p.id DESC`,
      [user_id]
    );

    res.status(200).json({ polls: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const { question, answers, is_public, user_id } = req.body;

  if (!question || !user_id || typeof is_public !== "boolean") {
    return res.status(400).json({ error: "question, user_id, and is_public are required" });
  }

  const trimmedAnswers = Array.isArray(answers)
    ? answers.map((a) => (typeof a === "string" ? a.trim() : "")).filter((a) => a.length > 0)
    : [];

  if (trimmedAnswers.length < MIN_ANSWERS || trimmedAnswers.length > MAX_ANSWERS) {
    return res.status(400).json({
      error: `answers must contain between ${MIN_ANSWERS} and ${MAX_ANSWERS} non-empty options`,
    });
  }

  const answerColumns = Array.from({ length: MAX_ANSWERS }, (_, i) => trimmedAnswers[i] ?? null);

  try {
    const result = await pool.query(
      `INSERT INTO polls
        (user_id, question, answer_1, answer_2, answer_3, answer_4, answer_5, answer_6, answer_7, answer_8, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [user_id, question, ...answerColumns, is_public]
    );

    res.status(201).json({ poll: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
