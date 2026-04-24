'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { api, googleLogin } from '../../lib/api';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', school: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      setAuth(res.data.user, res.data.token);
      toast.success('Account created successfully!');
      router.push('/assignments');
    } catch (err: any) {
      if (err.response?.data?.errors) {
        toast.error(err.response.data.errors[0].msg);
      } else {
        toast.error(err.response?.data?.error || 'Failed to register');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-3xl font-bold tracking-tight text-gray-900">
          Veda<span className="text-orange-veda">AI</span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Create your teacher account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">

          <div className="mb-6 flex justify-center">
            <GoogleLogin
              text="signup_with"
              onSuccess={async (credentialResponse: CredentialResponse) => {
                if (credentialResponse.credential) {
                  setIsLoading(true);
                  try {
                    const res = await googleLogin(credentialResponse.credential);
                    setAuth(res.user, res.token);
                    toast.success('Account created successfully!');
                    router.push('/assignments');
                  } catch (err: any) {
                    toast.error(err.response?.data?.error || 'Google signup failed');
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              onError={() => toast.error('Google signup failed')}
            />
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Or manually register</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="mt-1">
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input w-full" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input w-full" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input w-full" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">School Name</label>
              <div className="mt-1">
                <input type="text" value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })} className="input w-full" />
              </div>
            </div>

            <div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Already have an account? </span>
            <Link href="/login" className="font-medium text-orange-veda hover:text-orange-light">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
