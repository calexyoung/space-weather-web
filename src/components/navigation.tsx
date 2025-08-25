'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Calendar, Satellite, Globe, Gauge, Zap, FileText, TrendingUp } from 'lucide-react';

const Navigation = () => {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Activity,
    },
    {
      href: '/activity',
      label: 'Activity',
      icon: Activity,
    },
    {
      href: '/current-activity',
      label: 'Current Activity',
      icon: Zap,
    },
    {
      href: '/swx-reports',
      label: 'SWx Reports',
      icon: FileText,
    },
    {
      href: '/long-term-activity',
      label: 'Long-term Activity',
      icon: TrendingUp,
    },
    {
      href: '/timeline',
      label: 'Timeline',
      icon: Globe,
    },
    {
      href: '/events',
      label: 'Events',
      icon: Calendar,
    },
    {
      href: '/widgets',
      label: 'Widgets',
      icon: Gauge,
    },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Satellite className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Space Weather</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;