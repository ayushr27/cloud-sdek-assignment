'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, PieChart } from 'lucide-react';
import { Plus } from 'lucide-react';

const CustomGroupsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="1 2.5 22 18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <mask id="teacherBoardMaskMobile">
      <rect width="24" height="24" fill="white" />
      <circle cx="14" cy="8.5" r="2.8" fill="black" />
      <path d="M5.5 8.5 L11.5 13.5 C12.5 12.5 13.5 12.5 14.5 13 L18.5 19.5" stroke="black" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M10 14 C12 12.5 14 12.5 15.5 14 L17.5 20 H9 Z" fill="black" />
    </mask>
    <rect x="2" y="4" width="20" height="15" rx="3.5" fill="currentColor" mask="url(#teacherBoardMaskMobile)" />
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

const tabs = [
  { href: '/', label: 'Home', Icon: LayoutGrid },
  { href: '/groups', label: 'My Groups', Icon: CustomGroupsIcon },
  { href: '/library', label: 'Library', Icon: CustomAssignmentsIcon },
  { href: '/toolkit', label: 'AI Toolkit', Icon: CustomSparklesIcon },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Floating + FAB */}
      <button
        onClick={() => router.push('/assignments/create')}
        className="md:hidden fixed bottom-24 right-5 z-50 w-13 h-13 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-100 hover:scale-110 active:scale-95 transition-transform"
        style={{ width: 52, height: 52 }}
        aria-label="Create Assignment"
      >
        <Plus className="w-6 h-6 text-[#1A1A1A] stroke-[2.5]" />
      </button>

      {/* Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1A1A1A] flex items-end justify-around px-2 pb-safe"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', paddingTop: 10 }}
      >
        {tabs.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-2 px-3 min-w-[60px] group"
            >
              <Icon
                className={`w-6 h-6 transition-colors ${
                  active ? 'text-white' : 'text-[#6B6B6B]'
                }`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-semibold tracking-tight transition-colors ${
                  active ? 'text-white' : 'text-[#6B6B6B]'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer so content doesn't hide behind bottom nav */}
      <div className="md:hidden h-[72px] flex-shrink-0" />
    </>
  );
}
