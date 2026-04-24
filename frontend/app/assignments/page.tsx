'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { MoreVertical, Plus, Search, SlidersHorizontal, Loader2, ChevronLeft, LayoutGrid, Filter } from 'lucide-react';
import { useAssignmentStore, Assignment } from '@/store/assignmentStore';
import { fetchAssignments, deleteAssignment } from '@/lib/api';
import toast from 'react-hot-toast';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 gap-6 text-center">
      {/* Illustration */}
      <div className="relative w-44 h-44">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full opacity-60" />
        <svg viewBox="0 0 160 160" className="w-full h-full relative z-10" fill="none">
          <rect x="40" y="25" width="80" height="100" rx="8" fill="white" stroke="#E2E8F0" strokeWidth="2"/>
          <rect x="50" y="40" width="60" height="6" rx="3" fill="#CBD5E1"/>
          <rect x="50" y="52" width="45" height="5" rx="2.5" fill="#E2E8F0"/>
          <rect x="50" y="63" width="50" height="5" rx="2.5" fill="#E2E8F0"/>
          <circle cx="108" cy="98" r="24" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1.5"/>
          <circle cx="108" cy="98" r="18" fill="white"/>
          <path d="M100 98C100 93.6 103.6 90 108 90C112.4 90 116 93.6 116 98" stroke="#E15A3B" strokeWidth="3" strokeLinecap="round"/>
          <line x1="114" y1="104" x2="120" y2="110" stroke="#E15A3B" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="108" cy="98" r="6" fill="#FEE2E2"/>
          <path d="M106 98.5L107.5 100L111 96.5" stroke="#E15A3B" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M30 30 Q38 38 32 48" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <circle cx="56" cy="128" r="4" fill="#818CF8" opacity="0.5"/>
          <circle cx="125" cy="40" r="3" fill="#60A5FA" opacity="0.6"/>
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No assignments yet</h3>
        <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
          Create your first assignment to start collecting and grading student
          submissions. You can set up rubrics, define marking criteria, and let AI
          assist with grading.
        </p>
      </div>
      <Link href="/assignments/create" className="btn-primary">
        <Plus className="w-4 h-4" />
        Create Your First Assignment
      </Link>
    </div>
  );
}

function AssignmentCard({ assignment, onDelete, isList }: { assignment: Assignment; onDelete: () => void; isList?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (isList) {
    return (
      <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white flex items-center justify-between relative hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:border-gray-50 transition-all w-full">
        <div className="flex flex-col gap-1 flex-1 pr-4 max-w-sm">
          <h3 className="font-extrabold text-[#111827] text-[18px] tracking-tight truncate">{assignment.subject || assignment.title}</h3>
          <span className="text-[13px] text-[#A0AEC0] font-medium truncate">Class {assignment.className || 'General'}</span>
        </div>
        
        <div className="flex items-center gap-6 sm:gap-12 flex-1 justify-end pr-8">
          <div className="text-[13px] text-[#A0AEC0] font-semibold tracking-tight hidden sm:block">
            <span className="text-[#1A1A1A] font-extrabold mr-1">Assigned:</span> 
            {format(new Date(assignment.createdAt), 'dd-MM-yyyy')}
          </div>
          <div className="text-[13px] text-[#A0AEC0] font-semibold tracking-tight">
            <span className="text-[#1A1A1A] font-extrabold mr-1">Due:</span> 
            {format(new Date(assignment.dueDate), 'dd-MM-yyyy')}
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1 rounded-full hover:bg-gray-100 text-[#A0AEC0] transition"
          >
            <MoreVertical className="w-5 h-5 stroke-[2.5]" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 py-2 min-w-[170px]">
                {assignment.status === 'done' && (
                  <Link
                    href={`/assignments/${assignment._id}`}
                    className="flex items-center px-5 py-2.5 text-[14px] font-bold text-[#1A1A1A] hover:bg-gray-50 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    View Assignment
                  </Link>
                )}
                {(assignment.status === 'pending' || assignment.status === 'generating') && (
                  <Link
                    href={`/assignments/${assignment._id}/generating`}
                    className="flex items-center px-5 py-2.5 text-[14px] font-bold text-[#1A1A1A] hover:bg-gray-50 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    View Progress
                  </Link>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex items-center w-full px-5 py-2.5 text-[14px] font-bold text-red-500 hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all border border-white flex flex-col justify-between h-[180px] relative">
      <div className="flex items-start justify-between">
        <h3 className="font-extrabold text-[#111827] text-[24px] tracking-tight truncate pr-4">{assignment.subject || assignment.title}</h3>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1 rounded-full hover:bg-gray-100 text-[#A0AEC0] transition"
          >
            <MoreVertical className="w-5 h-5 stroke-[3]" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 py-2 min-w-[170px]">
                {assignment.status === 'done' && (
                  <Link
                    href={`/assignments/${assignment._id}`}
                    className="flex items-center px-5 py-2.5 text-[14px] font-bold text-[#1A1A1A] hover:bg-gray-50 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    View Assignment
                  </Link>
                )}
                {(assignment.status === 'pending' || assignment.status === 'generating') && (
                  <Link
                    href={`/assignments/${assignment._id}/generating`}
                    className="flex items-center px-5 py-2.5 text-[14px] font-bold text-[#1A1A1A] hover:bg-gray-50 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    View Progress
                  </Link>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex items-center w-full px-5 py-2.5 text-[14px] font-bold text-red-500 hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <div className="text-[14px] text-[#A0AEC0] font-semibold tracking-tight">
          <span className="text-[#1A1A1A] font-extrabold">Assigned on :</span> {format(new Date(assignment.createdAt), 'dd-MM-yyyy')}
        </div>
        <div className="text-[14px] text-[#A0AEC0] font-semibold tracking-tight">
          <span className="text-[#1A1A1A] font-extrabold">Due :</span> {format(new Date(assignment.dueDate), 'dd-MM-yyyy')}
        </div>
      </div>
    </div>
  );
}

export default function AssignmentsPage() {
  const { assignments, setAssignments, removeAssignment, searchQuery, setSearchQuery, viewMode } =
    useAssignmentStore();
  const [loading, setLoading] = useState(true);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [subjectFilter, setSubjectFilter] = useState<string>('');

  useEffect(() => {
    fetchAssignments()
      .then(setAssignments)
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  }, [setAssignments]);

  const handleDelete = async (id: string) => {
    try {
      await deleteAssignment(id);
      removeAssignment(id);
      toast.success('Assignment deleted');
    } catch {
      toast.error('Failed to delete assignment');
    }
  };

  const subjects = Array.from(new Set(assignments.map(a => a.subject))).filter(Boolean);

  let displayedAssignments = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (subjectFilter) {
    displayedAssignments = displayedAssignments.filter((a) => a.subject === subjectFilter);
  }

  displayedAssignments.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (sortOrder === 'asc') return dateA - dateB;
    return dateB - dateA;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 w-full mx-auto">
      {/* Page header */}
      <div className="mb-5 mt-0 relative pl-2">
        <div className="flex items-center gap-3 mb-1.5 ml-1">
          <div className="relative flex items-center justify-center w-[18px] h-[18px]">
            <div className="absolute w-full h-full bg-[#2ECA6A] opacity-25 rounded-full" />
            <div className="w-2.5 h-2.5 bg-[#2ECA6A] rounded-full shadow-sm" />
          </div>
          <h1 className="text-[22px] font-extrabold text-[#111827] tracking-tight">Assignments</h1>
        </div>
        <p className="text-[13px] text-[#8C8C8C] ml-8 font-medium">Manage and create assignments for your classes.</p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-white rounded-[20px] px-6 py-2.5 mb-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="relative z-20">
              <button 
                onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                className="flex items-center gap-2.5 text-[14px] font-semibold text-[#8C8C8C] hover:text-[#1A1A1A] transition tracking-tight"
              >
                <Filter className="w-4 h-4 stroke-[2.5]" />
                Filter By
              </button>
              
              {filterMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterMenuOpen(false)} />
                  <div className="absolute left-0 top-12 mt-1 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 p-4">
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sort by Date Added</h4>
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer p-1.5 hover:bg-gray-50 rounded-lg">
                          <input 
                            type="radio" 
                            name="sort" 
                            checked={sortOrder === 'desc'} 
                            onChange={() => setSortOrder('desc')}
                            className="text-orange-600 focus:ring-orange-500"
                          />
                          Newest First (Descending)
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer p-1.5 hover:bg-gray-50 rounded-lg">
                          <input 
                            type="radio" 
                            name="sort" 
                            checked={sortOrder === 'asc'} 
                            onChange={() => setSortOrder('asc')}
                            className="text-orange-600 focus:ring-orange-500"
                          />
                          Oldest First (Ascending)
                        </label>
                      </div>
                    </div>
                    
                    {subjects.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter by Subject</h4>
                        <select
                          value={subjectFilter}
                          onChange={(e) => setSubjectFilter(e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                        >
                          <option value="">All Subjects</option>
                          {subjects.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="relative w-full max-w-sm">
              <input
                className="w-full bg-white border border-[#E5E7EB] rounded-full pl-11 pr-5 py-2 text-[13px] font-medium text-gray-800 focus:outline-none focus:border-gray-300 transition placeholder-[#A0AEC0] shadow-inner-xs"
                placeholder="Search Assignment"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0AEC0] stroke-2" />
            </div>
          </div>

          {/* Grid or List View */}
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2 gap-6' : 'grid-cols-1 gap-3'} pb-24 px-2`}>
            {displayedAssignments.map((a) => (
              <AssignmentCard
                key={a._id}
                assignment={a}
                onDelete={() => handleDelete(a._id)}
                isList={viewMode === 'list'}
              />
            ))}
            {displayedAssignments.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500">
                No assignments found matching your criteria.
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating Create Button - desktop only (mobile uses FAB in bottom nav) */}
      {assignments.length > 0 && (
        <div className="hidden md:flex fixed bottom-0 left-0 right-0 md:left-[300px] z-50 pointer-events-none h-32 md:h-40 bg-gradient-to-t from-[#E4E5E8] via-[#E4E5E8]/80 to-transparent items-end justify-center pb-8">
          <Link href="/assignments/create" className="pointer-events-auto flex items-center gap-2 bg-[#1A1A1A] text-white px-7 py-3 rounded-full text-[15px] font-bold shadow-xl hover:bg-black transition-all hover:scale-105 tracking-tight border border-gray-800">
            <Plus className="w-5 h-5 stroke-[2.5]" />
            Create Assignment
          </Link>
        </div>
      )}

    </div>
  );
}
