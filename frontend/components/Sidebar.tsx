'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, BookOpen, Book, PieChart, Settings, Sparkles, Plus
} from 'lucide-react';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore } from '../store/authStore';
import { api, fetchAssignments } from '@/lib/api';

const CustomGroupsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="1 2.5 22 18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <mask id="teacherBoardMask">
      <rect width="24" height="24" fill="white" />
      <circle cx="14" cy="8.5" r="2.8" fill="black" />
      <path d="M5.5 8.5 L11.5 13.5 C12.5 12.5 13.5 12.5 14.5 13 L18.5 19.5" stroke="black" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M10 14 C12 12.5 14 12.5 15.5 14 L17.5 20 H9 Z" fill="black" />
    </mask>
    <rect x="2" y="4" width="20" height="15" rx="3.5" fill="currentColor" mask="url(#teacherBoardMask)" />
  </svg>
);

const CustomAssignmentsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
    <line x1="8" y1="9" x2="11" y2="9" />
  </svg>
);

const CustomSparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M9 2L11.5 8.5L18 11L11.5 13.5L9 20L6.5 13.5L0 11L6.5 8.5Z" />
    <path d="M19 1L20 3.5L22.5 4.5L20 5.5L19 8L18 5.5L15.5 4.5L18 3.5Z" />
  </svg>
);

const navLinks = [
  { href: '/', label: 'Home', icon: LayoutGrid },
  { href: '/groups', label: 'My Groups', icon: CustomGroupsIcon },
  { href: '/assignments', label: 'Assignments', icon: CustomAssignmentsIcon },
  { href: '/toolkit', label: "AI Teacher's Toolkit", icon: Book },
  { href: '/library', label: 'My Library', icon: PieChart },
];

export default function Sidebar() {
  const { logout, user } = useAuthStore();
  const pathname = usePathname();
  const assignments = useAssignmentStore((s) => s.assignments);
  const setAssignments = useAssignmentStore((s) => s.setAssignments);
  const resourceCount = useLibraryStore((s) => s.resourceCount);
  const setResourceCount = useLibraryStore((s) => s.setResourceCount);

  // Pre-fetch data for the sidebar badges
  useEffect(() => {
    if (user) {
      fetchAssignments()
        .then((data) => setAssignments(data))
        .catch((err) => console.error('Prefetch assignments failed:', err));

      api.get('/resources')
        .then((res) => setResourceCount(res.data?.resources?.length || 0))
        .catch((err) => console.error('Prefetch library failed:', err));
    }
  }, [user, setAssignments, setResourceCount]);

  return (
    <aside className="w-[300px] flex-shrink-0 bg-transparent flex flex-col h-screen py-4 pl-4">
      
      {/* Floating White Card */}
      <div className="bg-white rounded-[32px] w-full h-full flex flex-col shadow-[12px_0_40px_rgba(0,0,0,0.08)] overflow-hidden py-8">
        
        {/* Logo */}
        <div className="px-8 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] bg-gradient-to-br from-[#F58F29] via-[#E8470A] to-[#991B1B] rounded-xl flex items-center justify-center shadow-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="leftArm" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#FFFFFF" />
                    <stop offset="60%" stop-color="#EBEBEB" />
                    <stop offset="100%" stop-color="#2C1E16" />
                  </linearGradient>
                </defs>
                <path d="M2 6H11L13 20H6L2 6Z" fill="url(#leftArm)" stroke="url(#leftArm)" strokeWidth="0.5" strokeLinejoin="round" />
                <path d="M22 6H13L11 20H18L22 6Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="0.5" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-extrabold tracking-tight text-[#1A1A1A] text-[24px]">VedaAI</span>
          </div>
        </div>

        {/* Create Assignment Button */}
        <div className="px-6 mb-8">
          <div className="relative rounded-[24px] p-[3px] bg-gradient-to-br from-[#FF9865] via-[#E8470A] to-[#D53F0C]">
            <Link
              href="/assignments/create"
              className="flex items-center justify-center gap-2 w-full bg-[#2A2B2D] text-white rounded-[21px] py-3 text-[15px] font-bold hover:bg-[#1a1b1c] transition-all duration-200 group"
            >
              <CustomSparklesIcon className="w-5 h-5 text-white" />
              Create Assignment
            </Link>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link 
                key={href} 
                href={href} 
                className={`flex items-center gap-4 px-5 py-2.5 rounded-2xl transition-all ${
                  isActive 
                    ? 'bg-[#F4F4F5] text-[#1A1A1A] font-semibold' 
                    : 'text-[#737373] hover:bg-gray-50 hover:text-gray-900 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="flex-1 text-[16px]">{label}</span>
                {label === 'Assignments' && assignments.length > 0 && (
                  <span className="bg-[#FF6B35] text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center">
                    {assignments.length}
                  </span>
                )}
                {label === 'My Library' && resourceCount > 0 && (
                  <span className="bg-[#FF6B35] text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center">
                    {resourceCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-4 mt-auto border-gray-100 flex flex-col gap-2">
          <Link 
            href="/settings" 
            className="flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[#737373] hover:bg-gray-50 hover:text-gray-900 font-medium transition-all"
          >
            <Settings className="w-5 h-5 stroke-2" />
            <span className="text-[16px]">Settings</span>
          </Link>

          {/* School Card */}
          <div className="flex items-center gap-3 px-5 py-4 rounded-[20px] bg-[#F4F4F5] mx-1 mb-2">
            <div className="w-11 h-11 rounded-full bg-[#fde1d3] flex items-center justify-center shrink-0 shadow-sm text-[#a44c1f] text-[18px] font-bold uppercase overflow-hidden">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-[15px] font-bold text-[#1A1A1A] truncate tracking-tight">{user?.school || 'Delhi Public School'}</p>
              <p className="text-[13px] text-[#737373] font-medium truncate">{user?.branch || 'Pune'}</p>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}
