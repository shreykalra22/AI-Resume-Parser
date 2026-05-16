import axios from "axios";

const API = axios.create({
  baseURL: "https://ai-resume-parser-api-shrey.onrender.com",
  timeout: 60000,
  withCredentials: true,
});

export default API;