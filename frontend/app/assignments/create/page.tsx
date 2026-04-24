'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  CalendarPlus, Plus, Minus, X, Mic, ChevronDown,
  ChevronLeft, ArrowRight, CloudUpload, FileText, LayoutGrid
} from 'lucide-react';
import { useAssignmentStore } from '@/store/assignmentStore';
import { createAssignment, extractTextFromFiles } from '@/lib/api';
import toast from 'react-hot-toast';

const CustomCalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="4" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <path d="M12 10v8M8 14h8" />
  </svg>
);

const QUESTION_TYPES = [
  'Multiple Choice Questions',
  'Short Questions',
  'Long Questions',
  'Diagram/Graph-Based Questions',
  'Numerical Problems',
  'Fill in the Blanks',
  'True / False',
  'Match the Following',
];

const questionTypeSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  count: z.number().min(1, 'At least 1 question'),
  marks: z.number().min(1, 'At least 1 mark'),
});

const formSchema = z.object({
  subject: z.string().min(2, 'Subject is required'),
  className: z.string().optional(),
  timeAllowed: z.string().min(1, 'Time is required'),
  dueDate: z.string().refine((val) => new Date(val) >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Due date must be today or future',
  }),
  questionTypes: z.array(questionTypeSchema).min(1, 'Add question type'),
  additionalInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId') || undefined;
  const { setJobAssignment } = useAssignmentStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      className: '',
      timeAllowed: '',
      dueDate: '',
      questionTypes: [
        { type: 'Multiple Choice Questions', count: 4, marks: 1 },
        { type: 'Short Questions', count: 3, marks: 2 },
        { type: 'Diagram/Graph-Based Questions', count: 5, marks: 5 },
        { type: 'Numerical Problems', count: 5, marks: 5 },
      ],
      additionalInstructions: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questionTypes' });

  const watchedQuestionTypes = watch('questionTypes');

  const totalQuestions = watchedQuestionTypes.reduce((s, q) => s + (q.count || 0), 0);
  const totalMarks = watchedQuestionTypes.reduce((s, q) => s + ((q.count || 0) * (q.marks || 0)), 0);

  const handlePreviousClick = () => {
    // Scroll to the top Assignment Details section smoothly
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      let fileContent = '';
      if (files.length > 0) {
        toast.loading('Extracting text from your files...', { id: 'extract' });
        try {
          fileContent = await extractTextFromFiles(files);
          toast.success('Files successfully processed!', { id: 'extract' });
        } catch(e) {
          toast.error('Failed to read some files. Proceeding with remaining text...', { id: 'extract' });
        }
      }

      const instructionsWithTime = data.timeAllowed
        ? `Time Allowed: ${data.timeAllowed}. \n${data.additionalInstructions || ''}`
        : data.additionalInstructions || '';

      const { assignmentId } = await createAssignment({
        title: data.subject,
        subject: data.subject,
        className: data.className || '',
        chapters: [],
        dueDate: new Date(data.dueDate).toISOString(),
        questionTypes: data.questionTypes,
        additionalInstructions: instructionsWithTime.trim(),
        groupId,
        fileContent,
      });
      setJobAssignment(assignmentId);
      router.push(`/assignments/${assignmentId}/generating`);
    } catch (err: any) {
      console.error('Create error:', err.response?.data);
      const serverMsg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg;
      toast.error(serverMsg || 'Failed to create assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  return (
    <div className="w-full max-w-[900px] mx-auto pb-24">
      
      {/* ─── STATIC HEADER SECTION ─── */}
      <div className="mb-6 mt-2 relative">
        <div className="max-w-[850px] mx-auto">
          
          {/* Breadcrumb */}
          <div 
            onClick={() => router.back()} 
            className="flex items-center gap-2 mb-8 text-[#6B7280] hover:text-black cursor-pointer transition w-fit"
          >
             <ChevronLeft className="w-5 h-5" />
             <LayoutGrid className="w-[18px] h-[18px]" />
             <span className="text-[14px] font-semibold">Assignment</span>
          </div>

          <div className="flex items-center gap-3 mb-1.5 ml-1">
            <div className="relative flex items-center justify-center w-[18px] h-[18px]">
              <div className="absolute w-full h-full bg-[#2ECA6A] opacity-25 rounded-full" />
              <div className="w-2.5 h-2.5 bg-[#2ECA6A] rounded-full shadow-sm" />
            </div>
            <h1 className="text-[22px] font-extrabold text-[#111827] tracking-tight">Create Assignment</h1>
          </div>
          
          <p className="text-[13px] text-[#8C8C8C] ml-8 mb-6 font-medium">Set up a new assignment for your students</p>

          <div className="flex gap-1.5 w-full">
            <div className="h-[6px] bg-[#4B5563] rounded-full flex-[1]" />
            <div className="h-[6px] bg-[#E5E7EB] rounded-full flex-[1]" />
          </div>
        </div>
      </div>

      {/* ─── SCROLLABLE FORM ─── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-[850px] mx-auto">
        <div className="bg-white rounded-[32px] p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white">
          
          {/* 1. Assignment Details Anchor */}
          <div ref={detailsRef} className="mb-8 pt-2">
            <h2 className="text-[18px] font-extrabold text-[#111827] mb-1">Assignment Details</h2>
            <p className="text-[13px] text-[#8C8C8C] font-medium tracking-tight">Basic information about your assignment</p>
          </div>

          {/* Upload Box */}
          <div
            className={`border-2 border-dashed rounded-[16px] p-6 md:p-10 text-center cursor-pointer transition-all mb-3 ${
              dragOver ? 'border-[#3B4254] bg-gray-50' : 'border-[#E5E7EB] hover:border-gray-300 bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              if (files.length === 0) fileRef.current?.click();
            }}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.txt,.png,.jpg,.jpeg,.ppt,.pptx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
            />
            {files.length > 0 ? (
              <div className="flex flex-col gap-3">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm relative z-10 hover:shadow-md transition">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-[14px] font-semibold text-gray-800 truncate" title={f.name}>{f.name}</span>
                    </div>
                    <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} type="button" className="text-gray-400 hover:text-red-500 p-2 shrink-0 ml-2 cursor-pointer relative z-20 hover:bg-red-50 rounded-lg transition">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => fileRef.current?.click()} className="mt-4 flex items-center gap-2 text-[14px] font-bold text-blue-600 hover:text-blue-700 w-fit mx-auto cursor-pointer relative z-20 px-4 py-2 hover:bg-blue-50 rounded-lg transition">
                  <Plus className="w-4 h-4 stroke-[2.5]" /> Add More Files
                </button>
              </div>
            ) : (
              <>
                <CloudUpload className="w-8 h-8 md:w-10 md:h-10 text-[#9DA4B0] mx-auto mb-4 stroke-[2]" />
                <p className="text-[15px] md:text-[16px] font-semibold text-[#1A1A1A]">Choose files or drag &amp; drop them here</p>
                <p className="text-[13px] md:text-[14px] text-[#6B7280] mt-1.5 mb-6">PDF, JPEG, PNG, upto 10MB each</p>
                <button type="button" onClick={() => fileRef.current?.click()} className="bg-[#F3F4F6] rounded-full px-6 py-2.5 text-[14px] font-semibold text-[#374151] hover:bg-gray-200 transition shadow-sm">
                  Browse Files
                </button>
              </>
            )}
          </div>
          <p className="text-center text-[13px] font-medium text-[#A0AEC0] mb-12">Upload images of your preferred document/image</p>

          {/* Required Assignment Info Fields styled beautifully */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-7 mb-7">
            <div>
              <label className="block text-[14px] font-bold text-[#1A1A1A] mb-3 ml-2">Class</label>
              <input
                {...register('className')}
                className="w-full bg-[#f8f9fa] border-transparent rounded-xl px-6 h-[52px] text-[14px] font-medium text-[#A0AEC0] focus:text-gray-800 focus:outline-none focus:bg-white focus:border-gray-200 border transition shadow-inner-xs placeholder-[#A0AEC0]"
                placeholder="e.g. Class 10"
              />
            </div>

            <div>
              <label className="block text-[14px] font-bold text-[#1A1A1A] mb-3 ml-2">Subject</label>
              <input
                {...register('subject')}
                className="w-full bg-[#f8f9fa] border-transparent rounded-xl px-6 h-[52px] text-[14px] font-medium text-[#A0AEC0] focus:text-gray-800 focus:outline-none focus:bg-white focus:border-gray-200 border transition shadow-inner-xs placeholder-[#A0AEC0]"
                placeholder="e.g. Physics"
              />
            </div>

            <div>
              <label className="block text-[14px] font-bold text-[#1A1A1A] mb-3 ml-2">Time Allowed</label>
              <input
                {...register('timeAllowed')}
                className="w-full bg-[#f8f9fa] border-transparent rounded-xl px-6 h-[52px] text-[14px] font-medium text-[#A0AEC0] focus:text-gray-800 focus:outline-none focus:bg-white focus:border-gray-200 border transition shadow-inner-xs placeholder-[#A0AEC0]"
                placeholder="e.g. 60 mins"
              />
            </div>
          </div>

          {/* Exact Figma "Due Date" */}
          <div className="mb-12 mt-2">
            <label className="block text-[14px] font-bold text-[#1A1A1A] mb-3 ml-2">Due Date</label>
            <div className="relative">
              <input
                type="text"
                onFocus={(e) => { e.target.type = 'date'; try { e.target.showPicker?.(); } catch(err) {} }}
                onClick={(e: any) => { try { e.target.showPicker?.(); } catch(err) {} }}
                placeholder="Choose a due date"
                {...register('dueDate')}
                className="w-full bg-[#f8f9fa] border-transparent rounded-xl px-6 h-[52px] text-[14px] font-medium text-[#A0AEC0] focus:text-gray-800 focus:outline-none focus:bg-white focus:border-gray-200 border transition shadow-inner-xs placeholder-[#A0AEC0] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <CustomCalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-[22px] h-[22px] text-[#6B7280] pointer-events-none" />
            </div>
            {errors.dueDate && <p className="text-xs text-red-500 mt-2 ml-4">{errors.dueDate.message}</p>}
          </div>


          {/* 2. Questions Configuration Table */}
          <div className="grid grid-cols-[1fr_24px_130px_110px] gap-4 items-end px-3 mb-5">
            <span className="text-[12px] font-semibold text-[#6B7280]">Question Type</span>
            <span></span>
            <span className="text-[12px] font-semibold text-[#6B7280] text-center">No. of Questions</span>
            <span className="text-[12px] font-semibold text-[#6B7280] text-center">Marks</span>
          </div>

          <div className="space-y-6 mb-8">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_24px_130px_110px] gap-4 items-center">
                
                {/* Select */}
                <div className="relative">
                  <select
                    {...register(`questionTypes.${i}.type`)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-6 h-[56px] text-[14px] font-medium text-[#1A1A1A] focus:outline-none appearance-none cursor-pointer"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* Remove 'X' */}
                <button type="button" onClick={() => remove(i)} className="w-[20px] h-[20px] rounded-full bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center">
                  <X className="w-3 h-3 stroke-[3]" />
                </button>

                {/* Count Pill */}
                <Controller
                  control={control}
                  name={`questionTypes.${i}.count`}
                  render={({ field: { value, onChange } }) => (
                    <div className="flex items-center justify-between bg-[#F9FAFB] rounded-lg px-3 h-[48px]">
                      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="text-[#A0AEC0] hover:text-gray-900 flex items-center justify-center p-0.5">
                        <Minus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <span className="text-[15px] font-semibold text-[#1A1A1A] w-6 text-center">{value}</span>
                      <button type="button" onClick={() => onChange(value + 1)} className="text-[#A0AEC0] hover:text-gray-900 flex items-center justify-center p-0.5">
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  )}
                />

                {/* Marks Pill */}
                <Controller
                  control={control}
                  name={`questionTypes.${i}.marks`}
                  render={({ field: { value, onChange } }) => (
                    <div className="flex items-center justify-between bg-[#F9FAFB] rounded-lg px-3 h-[48px]">
                      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="text-[#A0AEC0] hover:text-gray-900 flex items-center justify-center p-0.5">
                        <Minus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <span className="text-[15px] font-semibold text-[#1A1A1A] w-6 text-center">{value}</span>
                      <button type="button" onClick={() => onChange(value + 1)} className="text-[#A0AEC0] hover:text-gray-900 flex items-center justify-center p-0.5">
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  )}
                />
              </div>
            ))}
          </div>

          {/* Add button */}
          <div className="mb-12 pl-2">
            <button
              type="button"
              onClick={() => append({ type: QUESTION_TYPES[0], count: 1, marks: 1 })}
              className="flex items-center gap-2.5 text-[#1A1A1A] text-[13px] font-extrabold hover:text-black transition tracking-tight"
            >
              <span className="w-7 h-7 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center shadow-sm">
                <Plus className="w-4 h-4 stroke-[3]" />
              </span>
              Add Question Type
            </button>
          </div>

          {/* Totals Label */}
          <div className="flex flex-col items-end gap-1 mb-8 pr-5">
            <p className="text-[14px] text-[#6B7280]">
              Total Questions: <span className="font-bold text-[#1A1A1A] ml-1">{totalQuestions}</span>
            </p>
            <p className="text-[14px] text-[#6B7280]">
              Total Marks: <span className="font-bold text-[#1A1A1A] ml-1">{totalMarks}</span>
            </p>
          </div>

          {/* Additional Instructions */}
          <div className="mt-8">
            <label className="block text-[14px] font-bold text-[#1A1A1A] mb-3 ml-2">Additional Information (For better output)</label>
            <div className="relative">
              <textarea
                {...register('additionalInstructions')}
                className="w-full bg-[#f8f9fa] border-2 border-dashed border-[#E5E7EB] rounded-[24px] p-7 pb-16 min-h-[160px] text-[14px] font-medium text-gray-700 focus:outline-none focus:border-gray-300 focus:bg-white transition resize-none placeholder-gray-400"
                placeholder="e.g Generate a question paper for 3 hour exam duration..."
              />
              <button type="button" className="absolute right-6 bottom-6 w-10 h-10 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex items-center justify-center hover:bg-gray-50 transition">
                <Mic className="w-5 h-5 text-[#6B7280]" />
              </button>
            </div>
          </div>

        </div>

        {/* Floating Action Buttons placed OUTSIDE the card at the bottom */}
        <div className="flex justify-between items-center mt-6">
          <button
            type="button"
            onClick={handlePreviousClick}
            className="flex items-center gap-2.5 bg-transparent text-[#1A1A1A] px-8 py-3 rounded-full text-[14px] font-bold hover:bg-gray-100 transition"
          >
            <ChevronLeft className="w-5 h-5" /> Previous
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2.5 bg-[#1A1A1A] text-white px-10 py-3 rounded-full text-[14px] font-bold hover:bg-black transition disabled:opacity-70"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Next <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </form>

    </div>
  );
}
