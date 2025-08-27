'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Activity, Calendar, Satellite, Globe, Gauge, FileText, TrendingUp, Brain, Clock } from 'lucide-react';

const Navigation = () => {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utcString = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      setCurrentTime(utcString);
    };

    updateTime(); // Initial update
    const interval = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

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
      href: '/swx-reports',
      label: 'SWx Reports',
      icon: FileText,
    },
    {
      href: '/events',
      label: 'Events',
      icon: Calendar,
    },
    {
      href: '/python-analysis',
      label: 'Python Analysis',
      icon: Brain,
    },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Satellite className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Space Weather</span>
            </Link>
            
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm ml-8">
              <Clock className="w-5 h-5 text-gray-600" />
              <div className="text-sm font-mono">
                <div className="text-gray-500 text-xs">UTC Time</div>
                <div className="text-gray-900 font-semibold">{currentTime}</div>
              </div>
            </div>
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