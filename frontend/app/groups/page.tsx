'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Users, Plus, KeyRound } from 'lucide-react';

interface Group {
  _id: string;
  name: string;
  description: string;
  joinCode: string;
  owner: { _id: string; name: string };
  members: any[];
}

export default function GroupsPage() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data.groups);
    } catch (error) {
      console.error('Failed to fetch groups', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/groups', { name: newGroupName, description: newGroupDesc });
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      fetchGroups();
    } catch (error) {
      alert('Failed to create group');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/groups/join', { joinCode: joinCodeInput });
      setShowJoinModal(false);
      setJoinCodeInput('');
      fetchGroups();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to join group');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Groups...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Groups</h1>
          <p className="text-gray-500 mt-1">Manage your classrooms and students</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            Join Code
          </button>
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-orange-600 text-white font-medium px-4 py-2 rounded-xl hover:bg-orange-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 text-white" />
              Create Group
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">No groups yet</h3>
          <p className="text-gray-500 mt-1">Create or join a group to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((g) => (
            <Link 
              key={g._id} 
              href={`/groups/${g._id}`}
              className="group bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                  {g.owner._id === user?.id ? 'Owner' : 'Participant'}
                </div>
                <Users className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 truncate">{g.name}</h2>
              <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1">{g.description || 'No description provided.'}</p>
              <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-4 mt-auto">
                <div className="text-gray-600 font-medium">
                  {g.members.length} {g.members.length === 1 ? 'Member' : 'Members'}
                </div>
                {g.owner._id === user?.id && (
                  <div className="text-gray-400 font-medium">
                    Code: <span className="text-gray-900 font-bold">{g.joinCode}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* MODALS */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input required type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500" placeholder="e.g. 10th Grade Math" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500" placeholder="Some info about this class..." rows={3} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-gray-600 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 text-white font-semibold bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Join a Group</h2>
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Join Code</label>
                <input required type="text" value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 tracking-widest text-lg font-mono uppercase" placeholder="e.g. X9Y2BZ" maxLength={6} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowJoinModal(false)} className="flex-1 py-3 text-gray-600 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 text-white font-semibold bg-gray-900 hover:bg-black rounded-xl transition-colors">Join Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
