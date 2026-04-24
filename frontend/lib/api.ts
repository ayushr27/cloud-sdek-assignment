import axios from 'axios';
import { Assignment, QuestionType } from '@/store/assignmentStore';
import { useAuthStore } from '../store/authStore';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { api };

export const googleLogin = (credential: string) =>
  api.post('/auth/google', { credential }).then((r) => r.data);

export const fetchAssignments = () =>
  api.get<Assignment[]>('/assignments').then((r) => r.data);

export const fetchAssignment = (id: string) =>
  api.get<Assignment>(`/assignments/${id}`).then((r) => r.data);

export const createAssignment = (data: {
  title: string;
  subject: string;
  className: string;
  chapters: string[];
  dueDate: string;
  questionTypes: Omit<QuestionType, 'id'>[];
  additionalInstructions: string;
  groupId?: string;
  fileContent?: string;
}) => api.post<{ assignmentId: string; jobId: string }>('/assignments', data).then((r) => r.data);

export const extractTextFromFiles = async (files: File[]) => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const { data } = await api.post<{ text: string }>('/assignments/extract-text', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.text;
};

export const deleteAssignment = (id: string) =>
  api.delete(`/assignments/${id}`).then((r) => r.data);

export const getPdfUrl = (id: string) => `${BASE}/assignments/${id}/pdf`;

export const regenerateAssignment = (id: string) =>
  api.post<{ message: string; assignmentId: string }>(`/assignments/${id}/regenerate`).then((r) => r.data);
