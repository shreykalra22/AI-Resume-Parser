// const express = require("express");
// const router = express.Router();

// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// const {
//   uploadResume,
//   getResumes,
//   getResumeById,
//   rescoreResume,
//   deleteResume,
//   getAnalytics,
// } = require("../controllers/resumeController");

// /* -------------------------------------------------------------------------- */
// /*                               Upload Folder                                */
// /* -------------------------------------------------------------------------- */

// const uploadDir = path.join(
//   __dirname,
//   "../uploads"
// );

// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, {
//     recursive: true,
//   });
// }

// /* -------------------------------------------------------------------------- */
// /*                               Multer Config                                */
// /* -------------------------------------------------------------------------- */

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadDir);
//   },

//   filename: function (req, file, cb) {
//     const uniqueName =
//       Date.now() +
//       "-" +
//       Math.round(Math.random() * 1e9) +
//       path.extname(file.originalname);

//     cb(null, uniqueName);
//   },
// });

// const upload = multer({
//   storage,
// });

// /* -------------------------------------------------------------------------- */
// /*                                   Routes                                   */
// /* -------------------------------------------------------------------------- */

// router.post(
//   "/upload",
//   upload.single("resume"),
//   uploadResume
// );

// router.get("/", getResumes);

// router.get(
//   "/analytics/summary",
//   getAnalytics
// );

// router.get("/:id", getResumeById);

// router.post(
//   "/:id/ats-score",
//   rescoreResume
// );

// router.delete("/:id", deleteResume);

// module.exports = router;
const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  uploadResume,
  getResumes,
  getResumeById,
  rescoreResume,
  deleteResume,
} = require(
  "../controllers/resumeController"
);

/* -------------------------------------------------------------------------- */
/*                               Upload Folder                                */
/* -------------------------------------------------------------------------- */

const uploadDir = path.join(
  __dirname,
  "../uploads"
);
console.log("UPLOAD DIR =", uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

/* -------------------------------------------------------------------------- */
/*                               Multer Storage                               */
/* -------------------------------------------------------------------------- */

const storage = multer.diskStorage({

  destination: function (
    req,
    file,
    cb
  ) {

    console.log(
      "UPLOAD DIR =>",
      uploadDir
    );

    cb(null, uploadDir);
  },

  filename: function (
    req,
    file,
    cb
  ) {

    const uniqueName =
      Date.now() +
      "-" +
      Math.round(
        Math.random() * 1e9
      ) +
      path.extname(
        file.originalname
      );

    console.log(
      "SAVING FILE =>",
      uniqueName
    );

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
});

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

router.post(
  "/upload",
  upload.single("resume"),
  uploadResume
);

router.get("/", getResumes);

router.get("/:id", getResumeById);

router.post(
  "/:id/ats-score",
  rescoreResume
);

router.delete(
  "/:id",
  deleteResume
);

module.exports = router;