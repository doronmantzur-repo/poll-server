require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const pollsRoutes = require("./routes/polls");
const pollAnswersRoutes = require("./routes/pollAnswers");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/polls", pollsRoutes);
app.use("/api/poll-answers", pollAnswersRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`poll-server listening on http://localhost:${PORT}`);
});
