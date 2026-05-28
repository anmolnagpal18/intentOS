import React, { useState } from 'react';
import { 
  LayoutDashboard, CheckSquare, TrendingUp, Zap, LogOut, 
  Clock, Calendar, ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { logout, user } = useAuth();
  
  // Persist sidebar collapsed state in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className={`bg-white border-r border-gray-200 h-screen sticky top-0 flex-col hidden md:flex transition-all duration-300 ease-in-out flex-shrink-0 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Header and Toggle Controls */}
      <div className={`p-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0 ${
        isCollapsed ? 'flex-col gap-4 p-4' : 'flex-row'
      }`}>
        {!isCollapsed ? (
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 select-none tracking-tight">
            IntentOS
          </h1>
        ) : (
          <h1 className="text-2xl font-black text-indigo-600 select-none animate-pulse">
            I
          </h1>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition cursor-pointer flex items-center justify-center active:scale-95 shadow-sm"
          title={isCollapsed ? "Expand Navigation" : "Collapse Navigation"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Buttons list */}
      <nav className={`flex-1 space-y-2 mt-4 flex flex-col ${isCollapsed ? 'px-2 items-center' : 'px-4'}`}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center py-3 rounded-lg transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'
          } ${
            activeTab === 'dashboard'
              ? 'bg-indigo-50 text-indigo-700 font-bold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          title={isCollapsed ? "Dashboard" : undefined}
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium truncate transition-opacity duration-200">Dashboard</span>}
        </button>

        <button
          onClick={() => setActiveTab('intents')}
          className={`w-full flex items-center py-3 rounded-lg transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'
          } ${
            activeTab === 'intents'
              ? 'bg-indigo-50 text-indigo-700 font-bold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          title={isCollapsed ? "Intents" : undefined}
        >
          <CheckSquare className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium truncate transition-opacity duration-200">Intents</span>}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`w-full flex items-center py-3 rounded-lg transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'
          } ${
            activeTab === 'analytics'
              ? 'bg-indigo-50 text-indigo-700 font-bold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          title={isCollapsed ? "Analytics" : undefined}
        >
          <TrendingUp className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium truncate transition-opacity duration-200">Analytics</span>}
        </button>

        <button
          onClick={() => setActiveTab('focus')}
          className={`w-full flex items-center py-3 rounded-lg transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'
          } ${
            activeTab === 'focus'
              ? 'bg-indigo-50 text-indigo-700 font-bold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          title={isCollapsed ? "Focus Sanctuary" : undefined}
        >
          <Clock className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium truncate transition-opacity duration-200">Focus Sanctuary</span>}
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`w-full flex items-center py-3 rounded-lg transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'
          } ${
            activeTab === 'notes'
              ? 'bg-indigo-50 text-indigo-700 font-bold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          title={isCollapsed ? "Notes" : undefined}
        >
          <FileText className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium truncate transition-opacity duration-200">Notes</span>}
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`w-full flex items-center py-3 rounded-lg transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'
          } ${
            activeTab === 'timeline'
              ? 'bg-indigo-50 text-indigo-700 font-bold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          title={isCollapsed ? "Timeline View" : undefined}
        >
          <Calendar className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium truncate transition-opacity duration-200">Timeline View</span>}
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`w-full flex items-center py-3 rounded-lg transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'
          } ${
            activeTab === 'teams'
              ? 'bg-indigo-50 text-indigo-700 font-bold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          title={isCollapsed ? "Teams" : undefined}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {!isCollapsed && <span className="font-medium truncate transition-opacity duration-200">Teams</span>}
        </button>

        <button
          onClick={() => setActiveTab('adaptation')}
          className={`w-full flex items-center py-3 rounded-lg transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'
          } ${
            activeTab === 'adaptation'
              ? 'bg-amber-50 text-amber-700 font-bold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-amber-700'
          }`}
          title={isCollapsed ? "Smart Adjustments" : undefined}
        >
          <Zap className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium truncate transition-opacity duration-200">Smart Adjustments</span>}
        </button>
      </nav>

      {/* User Information & Log Out */}
      <div className={`p-4 border-t border-gray-200 flex-shrink-0 ${
        isCollapsed ? 'flex flex-col items-center gap-3 p-2' : ''
      }`}>
        <div className={`flex items-center mb-2 select-none ${
          isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4 py-3'
        }`} title={user?.username}>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0 border border-indigo-200/50">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && <span className="font-semibold text-gray-700 truncate">{user?.username}</span>}
        </div>
        <button
          onClick={logout}
          className={`flex items-center rounded-lg text-red-650 hover:bg-red-50 transition-all duration-200 cursor-pointer ${
            isCollapsed ? 'justify-center p-3 w-12' : 'space-x-3 px-4 py-3 w-full'
          }`}
          title={isCollapsed ? "Log Out" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium transition-opacity duration-200">Log Out</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
