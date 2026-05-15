const mongoose = require("mongoose");

const ResumeSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
    },

    parsedData: {
      type: Object,
      required: true,
    },

    atsScore: {
      type: Object,
      default: null,
    },

    jobDescription: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Resume", ResumeSchema);