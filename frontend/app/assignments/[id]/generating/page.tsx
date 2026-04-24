'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useAssignmentSocket } from '@/hooks/useAssignmentSocket';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';



export default function GeneratingPage() {
  const { id } = useParams<{ id: string }>();
  const { job } = useAssignmentStore();
  useAssignmentSocket(id);
  const router = useRouter();

  // auto navigate if done
  useEffect(() => {
    if (job.status === 'done') {
      router.push(`/assignments/${id}`);
    }
  }, [job.status, id, router]);

  const currentStage = job.stage || 'Preparing AI engines...';
  const currentModel = job.currentModel ? `Using: ${job.currentModel}` : 'Selecting optimal model...';

  if (job.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 py-24 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Generation Failed</h3>
          <p className="text-sm text-gray-500 max-w-sm">{job.errorMessage || 'Something went wrong. Please try again.'}</p>
        </div>
        <Link href="/assignments/create" className="btn-primary">
          <RefreshCw className="w-4 h-4" /> Try Again
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-24">
      {/* Animated icon */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-xl shadow-gray-900/20">
          <Sparkles className="w-10 h-10 text-white animate-pulse" />
        </div>
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute w-3 h-3 rounded-full bg-[#E8470A]"
            style={{
              animation: `orbit 2.5s linear ${i * 0.83}s infinite`,
              top: '50%',
              left: '50%',
              transformOrigin: '48px 0',
            }}
          />
        ))}
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        AI is crafting your question paper
      </h2>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
        This usually takes 15–30 seconds. We're generating structured questions based on your specifications.
      </p>



      <style jsx>{`
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(48px) rotate(0deg); opacity: 1; }
          50% { opacity: 0.4; }
          100% { transform: rotate(360deg) translateX(48px) rotate(-360deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
