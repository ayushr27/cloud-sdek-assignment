'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Users, BookOpen, KeyRound, Trash2, LogOut, FileText, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Group {
  _id: string;
  name: string;
  description: string;
  joinCode: string;
  owner: { _id: string; name: string; email: string };
  members: any[];
  assignments: any[];
}

export default function GroupDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [group, setGroup] = useState<Group | null>(null);
  const [role, setRole] = useState<'owner' | 'participant' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<any>(null);
  const fetchGroup = async () => {
    try {
      const res = await api.get(`/groups/${id}`);
      setGroup(res.data.group);
      setRole(res.data.role);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 404) {
        alert('Group not found');
        router.push('/groups');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchGroup();
  }, [id]);

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.post(`/groups/${id}/leave`);
      router.push('/groups');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await api.delete(`/groups/${id}`);
      router.push('/groups');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete group');
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      await api.delete(`/assignments/${assignmentToDelete._id}`);
      setAssignmentToDelete(null);
      fetchGroup(); // refresh the assignments list
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete assignment');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Group Details...</div>;
  if (!group) return <div className="p-8 text-center">Group not found</div>;

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -z-10 -mr-20 -mt-20"></div>
        <div>
          <button onClick={() => router.push('/groups')} className="flex items-center gap-2 text-sm text-gray-500 font-medium hover:text-gray-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
          </button>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{group.name}</h1>
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
              {role}
            </span>
          </div>
          <p className="text-gray-500 text-lg max-w-2xl">{group.description || 'No description provided.'}</p>
        </div>

        <div className="flex flex-col md:items-end gap-3">
          {role === 'owner' && (
            <div className="bg-gray-50 px-5 py-3 rounded-2xl border border-gray-200 flex items-center gap-3 w-max">
              <KeyRound className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Join Code</p>
                <p className="text-xl text-gray-900 font-bold font-mono tracking-widest">{group.joinCode}</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            {role === 'owner' ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 bg-red-50 text-red-600 font-medium px-4 py-2 rounded-xl border border-red-100 hover:bg-red-100 transition-colors">
                <Trash2 className="w-4 h-4" />
                Delete Group
              </button>
            ) : (
              <button onClick={handleLeaveGroup} className="flex items-center gap-2 bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                <LogOut className="w-4 h-4" />
                Leave Group
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Feed: Assignments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Recent Assignments</h2>
            </div>
            {role === 'owner' && (
              <Link
                href={`/assignments/create?groupId=${id}`}
                className="flex items-center gap-2 bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-orange-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Assignment
              </Link>
            )}
          </div>

          {group.assignments && group.assignments.length > 0 ? (
            <div className="space-y-4">
              {group.assignments.map((assignment: any) => (
                <Link 
                  key={assignment._id} 
                  href={`/assignments/${assignment._id}`}
                  className="block bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{assignment.subject || assignment.title}</h3>
                    {role === 'owner' ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setAssignmentToDelete(assignment);
                        }}
                        className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    ) : (
                      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${assignment.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {assignment.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                    <div className="flex items-center gap-1.5 ">
                      <FileText className="w-4 h-4" />
                      {assignment.subject} ({assignment.className})
                    </div>
                    <div>Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-gray-200">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">No assignments yet</h3>
              <p className="text-gray-500 mt-1 mb-5">Assignments assigned to this group will appear here.</p>
              {role === 'owner' && (
                <Link
                  href={`/assignments/create?groupId=${id}`}
                  className="inline-flex items-center gap-2 bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create First Assignment
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Members */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
             <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Participants</h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-[32px] p-6 shadow-sm">
            
            {/* Owner Section */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Teacher</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg">
                  {group.owner.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">{group.owner.name}</p>
                  <p className="text-xs text-gray-500">{group.owner.email}</p>
                </div>
              </div>
            </div>

            {/* Students Section */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                <span>Students</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{group.members.length}</span>
              </h4>
              
              {group.members.length > 0 ? (
                <div className="space-y-4">
                  {group.members.map((member: any) => (
                    <div key={member._id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {member.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{member.name}</p>
                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No students joined yet.</p>
              )}
            </div>

          </div>
        </div>

      </div>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 mx-auto mb-5">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Group?</h2>
            <p className="text-gray-500 text-center text-sm mb-8">
              Are you sure you want to delete <span className="font-semibold text-gray-800">{group?.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 text-gray-600 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                No, Cancel
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); handleDeleteGroup(); }}
                className="flex-1 py-3 text-white font-semibold bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Assignment Confirmation Modal */}
      {assignmentToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 mx-auto mb-5">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Assignment?</h2>
            <p className="text-gray-500 text-center text-sm mb-8">
              do you want to delete this file
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAssignmentToDelete(null)}
                className="flex-1 py-3 text-gray-600 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                No
              </button>
              <button
                onClick={handleDeleteAssignment}
                className="flex-1 py-3 text-white font-semibold bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
