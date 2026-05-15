// frontend/src/pages/Upload.jsx
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import axiosInstance from "../api/axiosConfig"
import toast from 'react-hot-toast'
import {
  UploadCloud, FileText, X, Loader2,
  CheckCircle2, AlertCircle, ChevronRight
} from 'lucide-react'

const MAX_MB = 5

export default function Upload() {
  const navigate              = useNavigate()
  const [file, setFile]       = useState(null)
  const [jobDesc, setJobDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback(accepted => {
    const f = accepted[0]
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_MB} MB`)
      return
    }
    setFile(f)
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    multiple: false,
  })

  const handleSubmit = async () => {
    if (!file)
    return toast.error(
      "Please select a resume file first"
    );

  setLoading(true);
  setProgress(0);

  try {

    const formData =
      new FormData();

    formData.append(
      "resume",
      file
    );

    if (jobDesc.trim()) {
      formData.append(
        "jobDescription",
        jobDesc
      );
    }

    const { data } =
      await axiosInstance.post(
        "/resumes/upload",
        formData,
        {
          onUploadProgress: (e) => {
            setProgress(
              Math.round(
                (e.loaded / e.total) * 100
              )
            );
          },
        }
      );

    toast.success(
      "Resume uploaded successfully!"
    );

    navigate(
      `/resume/${data.resume._id}`
    );

  } catch (err) {

    toast.error(
      err.message ||
      "Upload failed"
    );

  } finally {

    setLoading(false);
    setProgress(0);

  }
};
  const fileExt = file?.name?.split('.').pop()?.toUpperCase()

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Resume</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload a PDF or DOCX — our AI will extract and score it instantly
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer
          transition-all duration-200 select-none
          ${isDragReject
            ? 'border-red-400   bg-red-50   dark:bg-red-900/10'
            : isDragActive
            ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
            : file
            ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
            : 'border-gray-300  bg-white dark:bg-gray-900 hover:border-green-400 hover:bg-green-50/30'}
        `}
      >
        <input {...getInputProps()} />

        {file ? (
          /* File selected state */
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <FileText size={28} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {fileExt} · {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle2 size={15} /> Ready to parse
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setFile(null) }}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        ) : isDragReject ? (
          <div className="flex flex-col items-center gap-2 text-red-500">
            <AlertCircle size={36} />
            <p className="font-medium">Only PDF and DOCX files are accepted</p>
          </div>
        ) : (
          /* Default idle state */
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors
              ${isDragActive ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <UploadCloud
                size={28}
                className={isDragActive ? 'text-green-600' : 'text-gray-400'}
              />
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or <span className="text-green-600 font-medium">click to browse</span>
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><FileText size={12} /> PDF</span>
              <span className="flex items-center gap-1"><FileText size={12} /> DOCX</span>
              <span>· Max {MAX_MB} MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Job description */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Job description
          <span className="ml-1.5 text-xs font-normal text-gray-400">(optional — enables ATS scoring)</span>
        </label>
        <textarea
          value={jobDesc}
          onChange={e => setJobDesc(e.target.value)}
          placeholder="Paste the job description here to get an ATS compatibility score and keyword analysis…"
          rows={5}
          className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700
            rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-green-500
            placeholder:text-gray-400 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1.5">
          {jobDesc.length} characters · {jobDesc.trim().split(/\s+/).filter(Boolean).length} words
        </p>
      </div>

      {/* Upload progress */}
      {loading && progress > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Uploading & parsing…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !file}
        className="w-full flex items-center justify-center gap-2 py-3 px-4
          bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
          text-white font-medium rounded-lg transition-colors text-sm"
      >
        {loading ? (
          <><Loader2 size={17} className="animate-spin" /> Parsing with AI…</>
        ) : (
          <> Parse Resume <ChevronRight size={17} /></>
        )}
      </button>

      {/* Tips */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tips for best results</p>
        {[
          'Use a text-based PDF — scanned images cannot be parsed',
          'Clearly label sections: Experience, Education, Skills',
          'Paste the full job description for an accurate ATS score',
        ].map(tip => (
          <div key={tip} className="flex items-start gap-2">
            <CheckCircle2 size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  )
}