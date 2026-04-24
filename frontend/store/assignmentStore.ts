import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface QuestionType {
  id: string;
  type: string;
  count: number;
  marks: number;
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  questionTypes: QuestionType[];
  additionalInstructions: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  jobId?: string;
  result?: QuestionPaper;
  markingScheme?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  options?: string[];
  answer?: string;
}

export interface Section {
  title: string;
  instruction: string;
  questions: Question[];
}

export interface QuestionPaper {
  schoolName: string;
  subject: string;
  className: string;
  timeAllowed: string;
  totalMarks: number;
  sections: Section[];
}

export interface CreateAssignmentData {
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  questionTypes: QuestionType[];
  additionalInstructions: string;
  file?: File | null;
}

interface JobState {
  status: 'idle' | 'queued' | 'generating' | 'done' | 'error';
  stage: string | null;
  currentModel: string | null;
  assignmentId: string | null;
  errorMessage: string | null;
}

interface AssignmentStore {
  // List
  assignments: Assignment[];
  setAssignments: (a: Assignment[]) => void;
  addAssignment: (a: Assignment) => void;
  removeAssignment: (id: string) => void;

  // Current
  currentAssignment: Assignment | null;
  setCurrentAssignment: (a: Assignment | null) => void;

  // Job
  job: JobState;
  setJobStatus: (status: JobState['status'], stage?: string | null, currentModel?: string | null) => void;
  setJobAssignment: (id: string) => void;
  setJobError: (msg: string) => void;
  resetJob: () => void;

  // Search/filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // View state
  viewMode: 'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
}

const defaultJob: JobState = {
  status: 'idle',
  stage: null,
  currentModel: null,
  assignmentId: null,
  errorMessage: null,
};

export const useAssignmentStore = create<AssignmentStore>()(
  devtools(
    (set) => ({
      assignments: [],
      setAssignments: (assignments) => set({ assignments }),
      addAssignment: (a) =>
        set((s) => ({ assignments: [a, ...s.assignments] })),
      removeAssignment: (id) =>
        set((s) => ({ assignments: s.assignments.filter((a) => a._id !== id) })),

      currentAssignment: null,
      setCurrentAssignment: (a) => set({ currentAssignment: a }),

      job: defaultJob,
      setJobStatus: (status, stage = null, currentModel = null) =>
        set((s) => ({ job: { ...s.job, status, stage, currentModel } })),
      setJobAssignment: (id) =>
        set((s) => ({ job: { ...s.job, assignmentId: id, status: 'queued' } })),
      setJobError: (msg) =>
        set((s) => ({ job: { ...s.job, status: 'error', errorMessage: msg } })),
      resetJob: () => set({ job: defaultJob }),

      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),

      viewMode: 'grid',
      setViewMode: (v) => set({ viewMode: v }),
    }),
    { name: 'assignment-store' }
  )
);
