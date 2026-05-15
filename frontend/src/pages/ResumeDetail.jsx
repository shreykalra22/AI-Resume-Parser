import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api/axiosConfig";
import toast from "react-hot-toast";

import {
  ArrowLeft,
  Download,
  RefreshCcw,
  Mail,
  Phone,
  GraduationCap,
  FolderKanban,
  Star,
} from "lucide-react";

import {
  CircularProgressbar,
  buildStyles,
} from "react-circular-progressbar";

import "react-circular-progressbar/dist/styles.css";

import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function ResumeDetail() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [resume, setResume] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [newJD, setNewJD] =
    useState("");

  const [numPages, setNumPages] =
    useState(0);

  useEffect(() => {
    fetchResume();
  }, []);

  const fetchResume = async () => {
    try {
      const { data } =
        await axios.get(
          `/resumes/${id}`
        );

      console.log(
        "RESUME DATA =>",
        data
      );

      setResume(data);
    } catch (err) {
      console.error(err);

      toast.error(
        "Failed to load resume"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRescore =
    async () => {
      if (!newJD.trim()) {
        return toast.error(
          "Please enter job description"
        );
      }

      try {
        const { data } =
          await axios.post(
            `/resumes/${id}/ats-score`,
            {
              jobDescription:
                newJD,
            }
          );

        setResume(data);

        toast.success(
          "ATS score updated"
        );
      } catch (err) {
        console.error(err);

        toast.error(
          "Re-scoring failed"
        );
      }
    };

  const downloadJSON = () => {
    const blob = new Blob([
      JSON.stringify(
        resume,
        null,
        2
      ),
    ]);

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement(
        "a"
      );

    a.href = url;

    a.download =
      "resume-data.json";

    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        Loading...
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        Resume not found
      </div>
    );
  }

  const parsed =
    resume.parsedData || {};

  const atsScore =
    resume?.atsScore?.score ||
    0;

  const matchedKeywords =
    resume?.atsScore
      ?.matched_keywords || [];

  const missingKeywords =
    resume?.atsScore
      ?.missing_keywords || [];

  const suggestions =
    missingKeywords.map(
      (skill) => {
        return `Add experience or projects related to ${skill}`;
      }
    );

  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-6">

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur bg-gray-950/70 py-4 mb-4 flex items-center justify-between">

        <button
          onClick={() =>
            navigate(-1)
          }
          className="flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="flex gap-3">

          <button
            onClick={
              handleRescore
            }
            className="px-4 py-2 rounded-xl border border-gray-700 hover:bg-gray-800 flex items-center gap-2"
          >
            <RefreshCcw
              size={16}
            />
            Re-score ATS
          </button>

          <button
            onClick={
              downloadJSON
            }
            className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            <Download
              size={16}
            />
            Download JSON
          </button>

        </div>
      </div>

      {/* ATS Input */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">

        <h2 className="text-lg font-semibold mb-4">
          Paste Job Description
        </h2>

        <textarea
          rows={6}
          value={newJD}
          onChange={(e) =>
            setNewJD(
              e.target.value
            )
          }
          placeholder="Paste job description here..."
          className="w-full rounded-xl bg-gray-800 border border-gray-700 p-4 text-sm outline-none focus:border-green-500"
        />

        <button
          onClick={
            handleRescore
          }
          className="mt-4 bg-green-600 hover:bg-green-700 px-5 py-2 rounded-xl"
        >
          Calculate ATS Score
        </button>
      </div>

      {/* Resume Header */}
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mb-6 flex flex-col lg:flex-row justify-between gap-8">

        <div className="flex gap-6">

          <div className="w-24 h-24 rounded-full bg-green-700 flex items-center justify-center text-4xl font-bold">
            {parsed?.name?.charAt(
              0
            ) || "R"}
          </div>

          <div>

            <h1 className="text-4xl font-bold mb-3 uppercase">
              {parsed?.name}
            </h1>

            <div className="flex flex-wrap gap-6 text-gray-400 mb-5">

              <div className="flex items-center gap-2">
                <Mail
                  size={18}
                />
                {parsed?.email}
              </div>

              <div className="flex items-center gap-2">
                <Phone
                  size={18}
                />
                {parsed?.phone}
              </div>

            </div>

            <div className="flex flex-wrap gap-3">

              {parsed?.skills?.map(
                (
                  skill,
                  index
                ) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
                  >
                    {skill}
                  </span>
                )
              )}

            </div>
          </div>
        </div>

        {/* ATS Circle */}
        <div className="flex flex-col items-center justify-center">

          <div className="w-36 h-36">

            <CircularProgressbar
              value={
                atsScore
              }
              text={`${atsScore}%`}
              styles={buildStyles(
                {
                  textColor:
                    "#fff",

                  pathColor:
                    atsScore >=
                    75
                      ? "#22c55e"
                      : atsScore >=
                        50
                      ? "#facc15"
                      : "#ef4444",

                  trailColor:
                    "#1f2937",
                }
              )}
            />

          </div>

          <p className="mt-4 text-lg font-semibold">

            {atsScore >= 75
              ? "Excellent Match"
              : atsScore >=
                50
              ? "Moderate Match"
              : "Low Match"}

          </p>
        </div>
      </div>

      {/* ATS Analysis */}
      {resume?.atsScore && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">

          <div className="flex items-center justify-between mb-6">

            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Star className="text-green-400" />
              ATS Keyword
              Analysis
            </h2>

            <p className="text-gray-400">
              {
                matchedKeywords.length
              }{" "}
              /{" "}
              {matchedKeywords.length +
                missingKeywords.length}{" "}
              keywords matched
            </p>
          </div>

          <div className="w-full bg-gray-800 rounded-full h-3 mb-8 overflow-hidden">

            <div
              className="bg-green-500 h-3 rounded-full"
              style={{
                width: `${atsScore}%`,
              }}
            />

          </div>

          <div className="grid md:grid-cols-2 gap-10">

            {/* Matched */}
            <div>

              <h3 className="text-green-400 text-lg font-semibold mb-4">
                Matched
                Keywords
              </h3>

              <div className="flex flex-wrap gap-3">

                {matchedKeywords.map(
                  (
                    keyword,
                    index
                  ) => (
                    <span
                      key={
                        index
                      }
                      className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
                    >
                      {
                        keyword
                      }
                    </span>
                  )
                )}

              </div>
            </div>

            {/* Missing */}
            <div>

              <h3 className="text-red-400 text-lg font-semibold mb-4">
                Missing
                Keywords
              </h3>

              <div className="flex flex-wrap gap-3">

                {missingKeywords.map(
                  (
                    keyword,
                    index
                  ) => (
                    <span
                      key={
                        index
                      }
                      className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                      {
                        keyword
                      }
                    </span>
                  )
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">

        <h2 className="text-2xl font-bold mb-6">
          AI Resume
          Suggestions
        </h2>

        <div className="space-y-4">

          {suggestions.length >
          0 ? (
            suggestions.map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-300"
                >
                  ✅ {item}
                </div>
              )
            )
          ) : (
            <div className="text-gray-400">
              No suggestions
              available.
            </div>
          )}

        </div>
      </div>

      {/* PDF Preview */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">

        <h2 className="text-2xl font-bold mb-6">
          Resume Preview
        </h2>

        {!resume?.filePath ? (
          <div className="text-red-400">
            PDF not found
          </div>
        ) : (
          <div className="overflow-auto rounded-xl border border-gray-700 bg-white flex justify-center p-4">

            <Document
              file={{
                url: `http://localhost:5000/${resume.filePath}`,
              }}
              loading={
                <div className="text-black">
                  Loading PDF...
                </div>
              }
              onLoadSuccess={({
                numPages,
              }) => {
                console.log(
                  "PDF Loaded"
                );

                setNumPages(
                  numPages
                );
              }}
              onLoadError={(
                error
              ) => {
                console.error(
                  "PDF ERROR =>",
                  error
                );
              }}
            >
              {Array.from(
                new Array(
                  numPages
                ),
                (
                  _,
                  index
                ) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={
                      index +
                      1
                    }
                    width={
                      700
                    }
                  />
                )
              )}
            </Document>

          </div>
        )}
      </div>

      {/* Education + Projects */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Education */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">

          <div className="flex items-center justify-between mb-6">

            <h2 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="text-purple-400" />
              Education
            </h2>

            <span className="text-gray-400 text-sm">
              {parsed
                ?.education
                ?.length ||
                0}{" "}
              items
            </span>
          </div>

          <ul className="space-y-4 text-gray-300">

            {parsed?.education?.map(
              (
                edu,
                index
              ) => (
                <li
                  key={
                    index
                  }
                  className="leading-relaxed"
                >
                  • {edu}
                </li>
              )
            )}

          </ul>
        </div>

        {/* Projects */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">

          <div className="flex items-center justify-between mb-6">

            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FolderKanban className="text-yellow-400" />
              Projects
            </h2>

            <span className="text-gray-400 text-sm">
              {parsed
                ?.projects
                ?.length ||
                0}{" "}
              items
            </span>
          </div>

          <ul className="space-y-4 text-gray-300">

            {parsed?.projects?.map(
              (
                project,
                index
              ) => (
                <li
                  key={
                    index
                  }
                  className="leading-relaxed"
                >
                  •{" "}
                  {
                    project
                  }
                </li>
              )
            )}

          </ul>
        </div>
      </div>
    </div>
  );
}