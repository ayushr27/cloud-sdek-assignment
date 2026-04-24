'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2, Save, User, Briefcase, GraduationCap, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    school: '',
    designation: '',
    subjects: '',
    city: '',
    state: '',
    branch: '',
    degree: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        bio: user.bio || '',
        school: user.school || '',
        designation: user.designation || '',
        subjects: user.subjects ? user.subjects.join(', ') : '',
        city: user.city || '',
        state: user.state || '',
        branch: user.branch || '',
        degree: user.degree || ''
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        subjects: formData.subjects.split(',').map(s => s.trim()).filter(Boolean)
      };
      
      const res = await api.put('/auth/profile', payload);
      updateUser(res.data.user);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error('Failed to update profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <AlertCircle className="w-10 h-10 text-orange-500" />
        <p className="text-gray-500 font-medium">Please log in to view settings.</p>
        <Link href="/login" className="btn-primary">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-24 font-sans max-w-[1000px]">
      <div className="mb-8 pl-1">
        <h1 className="text-[28px] font-extrabold text-[#1A1A1A] tracking-tight">Settings</h1>
        <p className="text-[#737373] text-[15px] font-medium mt-1">Manage your personal and professional details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details Card */}
        <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-[#F4F4F5] hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center transform -rotate-3 transition-transform hover:rotate-0">
              <User className="w-5 h-5 text-orange-600 stroke-[2.5]" />
            </div>
            <h2 className="text-[20px] font-bold text-[#1A1A1A] tracking-tight">Personal Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A]">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7] border-2 border-transparent text-[#1A1A1A] font-semibold focus:border-orange-500/30 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                placeholder="Your full name"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A] flex items-center justify-between">
                Email Address
                <span className="text-[11px] font-bold text-[#A1A1AA] bg-gray-100 px-2 py-0.5 rounded-md uppercase tracking-wider">Read Only</span>
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7]/60 border-2 border-transparent text-[#A1A1AA] font-semibold cursor-not-allowed outline-none"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A]">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7] border-2 border-transparent text-[#1A1A1A] font-semibold focus:border-orange-500/30 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A]">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7] border-2 border-transparent text-[#1A1A1A] font-medium focus:border-orange-500/30 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all outline-none resize-none"
                placeholder="A short bio about yourself..."
              />
            </div>
          </div>
        </div>

        {/* Professional Details Card */}
        <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-[#F4F4F5] hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center transform -rotate-3 transition-transform hover:rotate-0">
              <Briefcase className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            </div>
            <h2 className="text-[20px] font-bold text-[#1A1A1A] tracking-tight">Professional Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A]">School / Institution</label>
              <input
                type="text"
                name="school"
                value={formData.school}
                onChange={handleChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7] border-2 border-transparent text-[#1A1A1A] font-semibold focus:border-blue-500/30 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                placeholder="Delhi Public School"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A]">Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7] border-2 border-transparent text-[#1A1A1A] font-semibold focus:border-blue-500/30 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                placeholder="Senior Science Teacher"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A]">School Branch</label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7] border-2 border-transparent text-[#1A1A1A] font-semibold focus:border-blue-500/30 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                placeholder="e.g. Pune"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A]">Degree Qualifications</label>
              <input
                type="text"
                name="degree"
                value={formData.degree}
                onChange={handleChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7] border-2 border-transparent text-[#1A1A1A] font-semibold focus:border-blue-500/30 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                placeholder="e.g. B.Ed, M.Sc"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A]">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7] border-2 border-transparent text-[#1A1A1A] font-semibold focus:border-blue-500/30 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                placeholder="Bokaro Steel City"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A]">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7] border-2 border-transparent text-[#1A1A1A] font-semibold focus:border-blue-500/30 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                placeholder="Jharkhand"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-2.5">
              <label className="text-[14px] font-bold text-[#1A1A1A] items-center flex gap-2">
                <GraduationCap className="w-4 h-4 text-gray-400 stroke-[2.5]" /> 
                Subjects Taught
              </label>
              <input
                type="text"
                name="subjects"
                value={formData.subjects}
                onChange={handleChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-[#F4F5F7] border-2 border-transparent text-[#1A1A1A] font-semibold focus:border-blue-500/30 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                placeholder="e.g. Mathematics, Physics, Chemistry (comma separated)"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2.5 bg-[#1A1A1A] text-white px-8 py-4 rounded-full text-[15px] font-bold hover:bg-black transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none min-w-[200px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 stroke-[2.5]" />}
            Save Changes
          </button>
        </div>

      </form>
    </div>
  );
}
