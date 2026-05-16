const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config();

const resumeRoutes = require("./routes/resumeRoutes");

const app = express();

/* -------------------------------------------------------------------------- */
/*                                 CORS CONFIG                                */
/* -------------------------------------------------------------------------- */

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://ai-resume-frontend-35jw.onrender.com",
  ],
  credentials: true,
};
/* -------------------------------------------------------------------------- */
/*                                 Middleware                                 */
/* -------------------------------------------------------------------------- */

app.use(cors(corsOptions));

app.use(express.json());

/* -------------------------------------------------------------------------- */
/*                            STATIC FILE ACCESS                              */
/* -------------------------------------------------------------------------- */
console.log(
  "STATIC PATH =",
  path.join(__dirname, "uploads")
);
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

/* -------------------------------------------------------------------------- */
/*                             MongoDB Connection                             */
/* -------------------------------------------------------------------------- */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.error(
      "MongoDB Connection Error:",
      err
    );
  });

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

app.use(
  "/api/resumes",
  resumeRoutes
);

app.get("/", (req, res) => {
  res.send(
    "Backend Running Successfully"
  );
});

/* -------------------------------------------------------------------------- */
/*                                   Server                                   */
/* -------------------------------------------------------------------------- */

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});