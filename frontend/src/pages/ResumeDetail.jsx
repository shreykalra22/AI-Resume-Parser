// frontend/src/pages/ResumeDetail.jsx
// Reads resume from localStorage by id.
// Re-scores via FastAPI POST /ats-score.
// No longer calls /api/resumes/:id on Express.

import { useEffect, useState }   from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getResumeById, updateAtsScore } from "../api/resumeStorage";
import apiClient from "../api/axiosConfig";
import toast from "react-hot-toast";
import {
  ArrowLeft, Mail, Phone, Briefcase, GraduationCap,
  Code2, FolderGit2, Star, Download, RefreshCw,
  Loader2, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, items = [], color = "green" }) {
  if (!items.length) return null;
  const iconColors = {
    green:  "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
    blue:   "text-blue-600  bg-blue-50  dark:bg-blue-900/20  dark:text-blue-400",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
    amber:  "text-amber-600 bg-amber-50  dark:bg-amber-900/20 dark:text-amber-400",
  };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColors[color]}`}>
          <Icon size={16} />
        </div>
        <h3 className="font-medium text-gray-900 dark:text-white text-sm">{title}</h3>
        <span className="ml-auto text-xs text-gray-400">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreRing({ score }) {
  const r    = 40;
  const circ = 2 * Math.PI * r;
  const dash = circ * ((100 - score) / 100);
  const color =
    score >= 70 ? "#16a34a" :
    score >= 40 ? "#d97706" : "#dc2626";
  const label =
    score >= 70 ? "Strong match" :
    score >= 40 ? "Partial match" : "Low match";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
          transform="rotate(-90 52 52)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="52" y="48" textAnchor="middle" fontSize="18" fontWeight="600" fill={color}>
          {score}%
        </text>
        <text x="52" y="64" textAnchor="middle" fontSize="10" fill="#9ca3af">
          ATS Score
        </text>
      </svg>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResumeDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [resume,    setResume]    = useState(null);
  const [rescoring, setRescoring] = useState(false);
  const [newJD,     setNewJD]     = useState("");
  const [showJD,    setShowJD]    = useState(false);

  useEffect(() => {
    const found = getResumeById(id);
    if (!found) {
      toast.error("Resume not found in browser storage");
      navigate("/");
      return;
    }
    setResume(found);
  }, [id]);

  // ── Re-score via FastAPI /ats-score ──────────────────────────────────────
  const handleRescore = async () => {
    if (!newJD.trim()) return toast.error("Paste a job description first");

    // Get the raw text stored at parse time, or fall back to skills list
    const resumeText =
      resume.rawText ||
      [
        resume.parsedData?.name,
        resume.parsedData?.email,
        (resume.parsedData?.skills || []).join(" "),
        (resume.parsedData?.experience || []).join(" "),
        (resume.parsedData?.education  || []).join(" "),
      ]
        .filter(Boolean)
        .join(" ");

    setRescoring(true);
    try {
      const { data } = await apiClient.post("/ats-score", {
        resume_text:     resumeText,
        job_description: newJD,
      });

      // Persist updated score to localStorage
      const updated = updateAtsScore(id, data, newJD);
      setResume(updated);
      toast.success("ATS score updated!");
      setShowJD(false);
      setNewJD("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Re-scoring failed");
    } finally {
      setRescoring(false);
    }
  };

  // ── Download parsed JSON ──────────────────────────────────────────────────
  const handleDownload = () => {
    if (!resume) return;
    const blob = new Blob(
      [JSON.stringify(resume.parsedData, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement("a"), {
      href:     url,
      download: `${resume.parsedData?.name || "resume"}-parsed.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON downloaded");
  };

  if (!resume) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-green-600" size={32} />
      </div>
    );
  }

  const p   = resume.parsedData || {};
  const ats = resume.atsScore;

  // Normalise ATS shape — FastAPI returns ats_score, localStorage may have either
  const atsScore   = ats?.ats_score   ?? ats?.score   ?? null;
  const matched    = ats?.matched_keywords  || [];
  const missing    = ats?.missing_keywords  || [];
  const matchedCount    = ats?.matched_count         ?? matched.length;
  const totalJdKeywords = ats?.total_jd_keywords     ?? (matched.length + missing.length);
  const matchPct        = ats?.keyword_match_percent ?? atsScore;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Back + actions ── */}
      <div className="flex items-center gap-3">
        <Link to="/"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowJD(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300
              dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={14} /> Re-score ATS
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600
              hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download size={14} /> Download JSON
          </button>
        </div>
      </div>

      {/* ── Re-score panel ── */}
      {showJD && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Paste a new job description to recalculate the ATS score
          </p>
          <textarea
            value={newJD}
            onChange={e => setNewJD(e.target.value)}
            rows={4}
            placeholder="Paste job description here…"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700
              rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-green-500 resize-none placeholder:text-gray-400"
          />
          <button
            onClick={handleRescore}
            disabled={rescoring}
            className="mt-2 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700
              disabled:opacity-60 text-white text-sm rounded-lg transition-colors"
          >
            {rescoring && <Loader2 size={14} className="animate-spin" />}
            {rescoring ? "Scoring…" : "Calculate score"}
          </button>
        </div>
      )}

      {/* ── Profile header ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900
            flex items-center justify-center text-green-700 dark:text-green-400
            font-bold text-2xl flex-shrink-0">
            {p.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {p.name || "Unknown Candidate"}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2">
              {p.email && (
                <a href={`mailto:${p.email}`}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition-colors">
                  <Mail size={14} /> {p.email}
                </a>
              )}
              {p.phone && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={14} /> {p.phone}
                </span>
              )}
              {p.experience_years > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Briefcase size={14} /> {p.experience_years} yr{p.experience_years !== 1 ? "s" : ""} exp
                </span>
              )}
            </div>
            {p.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.skills.map(s => (
                  <span key={s}
                    className="px-2.5 py-0.5 bg-green-50 text-green-700 dark:bg-green-900/30
                      dark:text-green-400 text-xs rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          {atsScore != null && <ScoreRing score={Math.round(atsScore)} />}
        </div>
      </div>

      {/* ── ATS breakdown ── */}
      {ats ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-green-600" />
            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
              ATS keyword analysis
            </h3>
            <span className="ml-auto text-xs text-gray-400">
              {matchedCount} / {totalJdKeywords} matched
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.round(matchPct || 0)}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-green-600 dark:text-green-400
                flex items-center gap-1 mb-2">
                <CheckCircle2 size={13} /> Matched keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matched.length
                  ? matched.map(k => (
                      <span key={k}
                        className="px-2 py-0.5 bg-green-50 text-green-700 dark:bg-green-900/30
                          dark:text-green-400 text-xs rounded-md">
                        {k}
                      </span>
                    ))
                  : <span className="text-xs text-gray-400">None</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-red-500 flex items-center gap-1 mb-2">
                <XCircle size={13} /> Missing keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missing.length
                  ? missing.map(k => (
                      <span key={k}
                        className="px-2 py-0.5 bg-red-50 text-red-600 dark:bg-red-900/20
                          dark:text-red-400 text-xs rounded-md">
                        {k}
                      </span>
                    ))
                  : <span className="text-xs text-gray-400">None missing</span>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10
          border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            No ATS score yet.{" "}
            <button onClick={() => setShowJD(true)} className="underline font-medium">
              Add a job description
            </button>{" "}
            to calculate keyword compatibility.
          </p>
        </div>
      )}

      {/* ── Parsed sections ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section icon={Briefcase}     title="Work experience" items={p.experience} color="blue"   />
        <Section icon={GraduationCap} title="Education"       items={p.education}  color="purple" />
        <Section icon={FolderGit2}    title="Projects"        items={p.projects}   color="amber"  />
        <Section icon={Code2}         title="All skills"      items={p.skills}     color="green"  />
      </div>

      {/* ── Metadata ── */}
      <div className="text-xs text-gray-400 flex flex-wrap gap-x-5 gap-y-1 pb-4">
        <span>File: {resume.fileName}</span>
        <span>
          Parsed:{" "}
          {new Date(resume.createdAt).toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}