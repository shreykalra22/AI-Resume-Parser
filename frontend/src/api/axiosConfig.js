// frontend/src/api/axiosConfig.js
// Single axios instance pointing at the deployed FastAPI backend.
// All components import from here — never hardcode URLs elsewhere.

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const instance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,  // parser can take time on cold Render starts
});

export default instance;