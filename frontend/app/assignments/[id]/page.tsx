'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Assignment, Section, Question } from '@/store/assignmentStore';
import { fetchAssignment, getPdfUrl } from '@/lib/api';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ChevronLeft, Loader2, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

// Helper logic is inline inside the component now.

const AIFileIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    className={className}
    fill="none" 
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v10m10-12v6h6m-6-6l6 6v10a2 2 0 0 1-2 2H10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 11l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill="currentColor"/>
  </svg>
);

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { setCurrentAssignment, setJobAssignment } = useAssignmentStore();
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchAssignment(id)
      .then((a: any) => { setAssignment(a); setCurrentAssignment(a); })
      .catch(() => toast.error('Failed to load assignment'))
      .finally(() => setLoading(false));
  }, [id, setCurrentAssignment]);



  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const url = getPdfUrl(id);
      const token = useAuthStore.getState().token;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${assignment?.title || 'question-paper'}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF. Make sure Puppeteer is running on the server.');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-24">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h3 className="font-bold text-gray-900">Assignment not found</h3>
        <Link href="/assignments" className="btn-outline">
          <ChevronLeft className="w-4 h-4" /> Back to Assignments
        </Link>
      </div>
    );
  }

  const paper = assignment?.result;

  return (
    <div className="w-full pb-24 font-sans text-[#1A1A1A]">
      
      {paper ? (
        <div className="bg-[#71717A] rounded-[40px] shadow-md p-3 overflow-hidden">
          <div className="flex flex-col gap-3">
            
            {/* Dark Header Card */}
            <div className="bg-[#2A2B2D] rounded-[32px] px-8 py-8 md:px-10 md:py-10 shadow-sm flex flex-col gap-6">
              <h2 className="text-white text-[16px] md:text-[18px] font-bold leading-relaxed tracking-tight max-w-[900px] mb-0">
                Certainly, {user?.name ? user.name.split(' ')[0] : 'User'}! Here are customized Question Paper for your CBSE Grade {paper?.className} {paper?.subject} classes on the NCERT chapters:
              </h2>
            
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading}
                  className="flex items-center gap-2.5 bg-white text-[#1A1A1A] rounded-full px-5 py-[10px] text-[14px] font-bold hover:bg-gray-100 transition shadow-sm disabled:opacity-60 tracking-tight"
                >
                  {pdfLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <AIFileIcon className="w-[18px] h-[18px]" />
                  )}
                  Download as PDF
                </button>
              </div>
            </div>

          {/* White Paper Card */}
          <div className="bg-white rounded-[32px] md:rounded-[40px] px-10 py-16 md:px-20 md:py-24 shadow-sm w-full min-h-[1000px]">
            {/* School Header */}
            <div className="text-center font-bold text-gray-900 mb-10">
              <h1 className="text-3xl tracking-tight mb-2">
                {paper?.schoolName || 'Your School Name'}
              </h1>
              <h2 className="text-xl mb-1">
                Subject: {paper?.subject}
              </h2>
              <h3 className="text-xl">
                Class: {paper?.className}
              </h3>
            </div>

            {/* Meta Row (Time & Marks) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-bold text-gray-900 text-lg mb-8">
              <div>
                Time Allowed: {paper?.timeAllowed || '____'}
              </div>
              <div>
                Maximum Marks: {paper?.totalMarks || '____'}
              </div>
            </div>

            {/* General Instructions */}
            <p className="font-bold text-gray-900 text-lg mb-8">
              All questions are compulsory unless stated otherwise.
            </p>

            {/* Student Info Lines */}
            <div className="flex flex-col gap-3 font-bold text-gray-900 text-lg mb-16 w-full max-w-xl">
              <div className="flex items-end">
                <span>Name:</span>
                <div className="flex-1 border-b-2 border-gray-900 ml-2 h-5" />
              </div>
              <div className="flex items-end">
                <span>Roll Number:</span>
                <div className="flex-1 border-b-2 border-gray-900 ml-2 h-5" />
              </div>
              <div className="flex items-end flex-wrap gap-y-3">
                <span>Class: {paper?.className} Section:</span>
                <div className="flex-1 min-w-[150px] border-b-2 border-gray-900 ml-2 h-5" />
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-12">
              {paper?.sections?.map((section, idx) => (
                <div key={idx} className="relative">
                  {/* Section Title */}
                  <h2 className="text-2xl font-bold text-center text-gray-900 mb-8 tracking-tight">
                    Section {String.fromCharCode(65 + idx)}
                  </h2>

                  {/* Section Header */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">
                      {section.title}
                    </h3>
                    <p className="text-[16px] italic text-gray-800">
                      {section.instruction}
                    </p>
                  </div>

                  {/* Questions */}
                  <div className="space-y-5">
                    {section.questions.map((q, qIdx) => {
                      const diffDisplay = q.difficulty === 'medium' ? 'Moderate' : q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1);
                      return (
                        <div key={qIdx} className="flex gap-3 text-gray-800 text-[16px] leading-relaxed">
                          <span className="shrink-0">{qIdx + 1}.</span>
                          <div className="flex-1">
                            <span>
                              [{diffDisplay}] {q.text} [{q.marks} Mark{q.marks > 1 ? 's' : ''}]
                            </span>
                            {/* Options if it's MCQ */}
                            {q.options && q.options.length > 0 && (
                              <ol className="list-[lower-alpha] list-inside space-y-1 mt-3 ml-2">
                                {q.options.map((opt, oIdx) => (
                                  <li key={oIdx} className="text-gray-800">
                                    <span className="mr-1">)</span> {opt}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="text-center py-20 text-gray-500 font-medium w-full">
          Question paper limits met or still generating...
        </div>
      )}
    </div>
  );
}
