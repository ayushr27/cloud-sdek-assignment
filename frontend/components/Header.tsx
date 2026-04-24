'use client';

import { usePathname } from 'next/navigation';
import { ArrowLeft, Bell, Sparkles, ChevronDown, CheckCircle2, Bookmark, LogOut, Settings, LayoutGrid, List, Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useAssignmentStore } from '@/store/assignmentStore';
import { api } from '@/lib/api';
import { format } from 'date-fns';

const titles: Record<string, string> = {
  '/assignments': 'Assignments',
  '/assignments/create': 'Create New',
  '/groups': 'My Groups',
  '/library': 'My Library',
  '/toolkit': "AI Teacher's Toolkit"
};

interface NotificationType {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export default function Header() {
  const pathname = usePathname();
  const { user, token, logout } = useAuthStore();
  const { viewMode, setViewMode } = useAssignmentStore();
  
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const desktopDrawerRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const desktopProfileMenuRef = useRef<HTMLDivElement>(null);

  const isCreate = pathname === '/assignments/create';
  const isDetail =
    pathname.startsWith('/assignments/') &&
    pathname !== '/assignments/create' &&
    pathname !== '/assignments';

  let title = titles[pathname];
  if (!title) {
    if (pathname.startsWith('/groups/')) title = 'Group Detail';
    else if (pathname.startsWith('/assignments/')) title = 'Assignment Viewer';
    else title = 'Dashboard';
  }
  
  let backHref: string | null = null;
  if (isCreate || isDetail) {
    backHref = '/assignments';
  } else if (pathname.startsWith('/groups/') && pathname !== '/groups') {
    backHref = '/groups';
  } else if (pathname !== '/') {
    backHref = '/';
  }

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data.notifications);
      } catch (err) {
        console.error('Failed to load notifications');
      }
    };
    fetchNotifs();

    // WebSocket connection
    let wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:5000';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', userId: user.id }));
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.event === 'notification') {
          // Play sound
          new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {});
          setNotifications(prev => [parsed.data, ...prev]);
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user]);

  // Click outside drawer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      const clickedOutsideMobileDrawer = !mobileDrawerRef.current || !mobileDrawerRef.current.contains(target);
      const clickedOutsideDesktopDrawer = !desktopDrawerRef.current || !desktopDrawerRef.current.contains(target);
      if (showDrawer && clickedOutsideMobileDrawer && clickedOutsideDesktopDrawer) {
        setShowDrawer(false);
      }
      
      const clickedOutsideMobileProfile = !mobileProfileMenuRef.current || !mobileProfileMenuRef.current.contains(target);
      const clickedOutsideDesktopProfile = !desktopProfileMenuRef.current || !desktopProfileMenuRef.current.contains(target);
      if (showProfileMenu && clickedOutsideMobileProfile && clickedOutsideDesktopProfile) {
        setShowProfileMenu(false);
      }
    };
    if (showDrawer || showProfileMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDrawer, showProfileMenu]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read', {});
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markSingleRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;
    try {
      await api.post('/notifications/read', { notificationIds: [id] });
      setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* ── MOBILE HEADER (hidden on md+) ── */}
      <header className="md:hidden bg-white px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-50 w-full mb-2 border-b border-gray-100">
        {/* Left: Logo or Back Arrow */}
        <div className="flex items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="w-9 h-9 bg-[#F4F4F5] rounded-full flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-[18px] h-[18px] text-[#1A1A1A] stroke-[2.5]" />
            </Link>
          ) : (
            /* VedaAI Logo */
            <div className="flex items-center gap-2">
              <div className="w-[36px] h-[36px] bg-gradient-to-br from-[#F58F29] via-[#E8470A] to-[#991B1B] rounded-xl flex items-center justify-center shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 6H11L13 20H6L2 6Z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round" />
                  <path d="M22 6H13L11 20H18L22 6Z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="font-extrabold tracking-tight text-[#1A1A1A] text-[20px]">VedaAI</span>
            </div>
          )}
          {/* Page title on sub-pages */}
          {backHref && (
            <span className="text-[16px] font-bold text-[#1A1A1A]">{title}</span>
          )}
        </div>

        {/* Right: Bell + Avatar + Hamburger */}
        <div className="flex items-center gap-3">
          {/* Bell */}
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className="relative w-9 h-9 bg-[#F4F4F5] rounded-full flex items-center justify-center active:scale-95 transition-transform"
          >
            <Bell className="w-[18px] h-[18px] text-[#1A1A1A] stroke-[2]" />
            {unreadCount > 0 && (
              <span className="absolute top-[1px] right-[1px] w-2.5 h-2.5 rounded-full bg-[#FF6B35] border-2 border-white" />
            )}
          </button>

          {/* User Avatar */}
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-9 h-9 rounded-full bg-[#fde1d3] flex items-center justify-center text-[#a44c1f] text-[14px] font-bold uppercase overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform"
          >
            {user?.name?.charAt(0) || 'U'}
          </div>

          {/* Hamburger */}
          <button className="w-9 h-9 bg-[#F4F4F5] rounded-full flex items-center justify-center active:scale-95 transition-transform">
            <Menu className="w-[18px] h-[18px] text-[#1A1A1A] stroke-[2]" />
          </button>
        </div>

        {/* Mobile notification drawer */}
        {showDrawer && (
          <div ref={mobileDrawerRef} className="absolute top-[60px] left-2 right-2 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[100] flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">Notifications</h3>
                <p className="text-xs text-gray-500 font-medium">{unreadCount} unread</p>
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="bg-white text-gray-600 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-gray-200 hover:bg-gray-50 transition">
                  Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Bell className="w-7 h-7 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => markSingleRead(notif._id, notif.read)}
                    className={`p-3 rounded-2xl mb-1 cursor-pointer transition-colors flex gap-3 ${
                      notif.read ? 'hover:bg-gray-50' : 'bg-orange-50/40 hover:bg-orange-50/80 border border-orange-100/50'
                    }`}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {notif.type === 'submission' && <CheckCircle2 className={`w-4 h-4 ${notif.read ? 'text-green-500' : 'text-orange-600'}`} />}
                      {notif.type === 'generation' && <Sparkles className={`w-4 h-4 ${notif.read ? 'text-purple-500' : 'text-orange-600'}`} />}
                      {(notif.type !== 'submission' && notif.type !== 'generation') && <Bookmark className={`w-4 h-4 ${notif.read ? 'text-blue-500' : 'text-orange-600'}`} />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-[13px] leading-snug mb-1 ${notif.read ? 'text-gray-700 font-medium' : 'text-gray-900 font-bold'}`}>{notif.message}</p>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
                        <span>{format(new Date(notif.createdAt), 'MMM d, h:mm a')}</span>
                        {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Mobile profile menu */}
        {showProfileMenu && (
          <div ref={mobileProfileMenuRef} className="absolute top-[60px] right-2 w-[200px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[100] py-2">
            <div className="px-4 py-2 border-b border-gray-50 mb-1">
              <p className="font-bold text-gray-900 truncate text-sm">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <Link href="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />Settings
            </Link>
            <button onClick={() => { setShowProfileMenu(false); logout(); }} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left">
              <LogOut className="w-4 h-4" />Logout
            </button>
          </div>
        )}
      </header>

      {/* ── DESKTOP HEADER (hidden on mobile) ── */}
      <header className="hidden md:flex bg-white/95 backdrop-blur-md rounded-[32px] px-3 py-3 items-center justify-between shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sticky top-0 z-50 w-full mb-4">
        <div className="flex items-center gap-4 pl-1">
          {backHref ? (
            <Link
              href={backHref}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
            >
              <ArrowLeft className="w-[18px] h-[18px] text-[#1A1A1A] stroke-[2.5]" />
            </Link>
          ) : (
            <div className="w-2" />
          )}
          <div className="flex items-center gap-2 text-[15px] font-bold text-[#A1A1AA]">
            {pathname === '/assignments' ? (
              <button 
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="hover:text-black transition"
                title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
              >
                {viewMode === 'grid' ? <LayoutGrid className="w-4 h-4 stroke-[2.5]" /> : <List className="w-4 h-4 stroke-[2.5]" />}
              </button>
            ) : isCreate ? (
              <Sparkles className="w-4 h-4 stroke-[2.5] text-[#A1A1AA]" />
            ) : (
              <LayoutGrid className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 pr-2 relative">
          <button 
            onClick={() => setShowDrawer(!showDrawer)}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all ${showDrawer ? 'bg-orange-600 text-white shadow-orange-600/20' : 'bg-white text-[#1A1A1A] hover:scale-105'}`}
          >
            <Bell className={`w-[18px] h-[18px] ${showDrawer ? 'stroke-white' : 'stroke-[2]'}`} />
            {unreadCount > 0 && (
              <span className={`absolute top-[1px] right-[1px] w-2.5 h-2.5 rounded-full border-2 ${showDrawer ? 'bg-white border-orange-600' : 'bg-[#FF6B35] border-white'}`} />
            )}
          </button>

          {/* NOTIFICATION DRAWER */}
          {showDrawer && (
            <div ref={desktopDrawerRef} className="absolute top-[52px] right-0 w-[400px] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[100] flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">Notifications</h3>
                  <p className="text-xs text-gray-500 font-medium">You have {unreadCount} unread messages</p>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="bg-white text-gray-600 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-gray-200 hover:bg-gray-50 transition"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 p-2">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">No notifications yet.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif._id}
                      onClick={() => markSingleRead(notif._id, notif.read)}
                      className={`p-4 rounded-2xl mb-1 cursor-pointer transition-colors flex gap-4 ${
                        notif.read ? 'hover:bg-gray-50' : 'bg-orange-50/40 hover:bg-orange-50/80 border border-orange-100/50'
                      }`}
                    >
                      <div className="mt-1 flex-shrink-0">
                        {notif.type === 'submission' && <CheckCircle2 className={`w-5 h-5 ${notif.read ? 'text-green-500' : 'text-orange-600'}`} />}
                        {notif.type === 'generation' && <Sparkles className={`w-5 h-5 ${notif.read ? 'text-purple-500' : 'text-orange-600'}`} />}
                        {(notif.type !== 'submission' && notif.type !== 'generation') && <Bookmark className={`w-5 h-5 ${notif.read ? 'text-blue-500' : 'text-orange-600'}`} />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-[14px] leading-snug mb-1.5 ${notif.read ? 'text-gray-700 font-medium' : 'text-gray-900 font-bold'}`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
                          <span>{format(new Date(notif.createdAt), 'MMM d, h:mm a')}</span>
                          {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <div className="relative" ref={desktopProfileMenuRef}>
            <div 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition ml-2"
            >
              <div className="w-9 h-9 rounded-full bg-[#fde1d3] flex items-center justify-center text-[#a44c1f] text-[15px] font-bold uppercase overflow-hidden shadow-sm shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-[15px] font-bold text-[#1A1A1A]">{user?.name || 'User'}</span>
              <ChevronDown className={`w-4 h-4 text-[#A1A1AA] stroke-[2] transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </div>

            {showProfileMenu && (
              <div className="absolute top-[48px] right-0 w-[220px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[100] py-2">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <p className="font-bold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <Link 
                  href="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

