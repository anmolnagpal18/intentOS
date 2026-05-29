import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import api, { notificationsAPI } from '../services/api';
import { useWebSocketContext } from '../contexts/WebSocketContext';

const NotificationPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const { latestMessage } = useWebSocketContext() || {};

  useEffect(() => {
    if (latestMessage && (latestMessage.type === 'notification_created' || latestMessage.event_type === 'notification_created')) {
      fetchNotifications();
    }
  }, [latestMessage]);

  const handleAcceptInvite = async (notification) => {
    const teamId = notification.metadata?.team_id;
    if (!teamId) return;
    try {
      await api.post(`teams/${teamId}/accept-invite/`);
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, is_read: true, message: 'Joined team!' } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
      window.location.reload();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      alert('Failed to accept invitation.');
    }
  };

  const handleDeclineInvite = async (notification) => {
    const teamId = notification.metadata?.team_id;
    if (!teamId) return;
    try {
      await api.post(`teams/${teamId}/decline-invite/`);
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, is_read: true, message: 'Declined invitation.' } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      alert('Failed to decline invitation.');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationsAPI.clearAll();
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'task_due': return 'text-amber-500 bg-amber-100';
      case 'task_overdue': return 'text-red-500 bg-red-100';
      case 'adaptation_update': return 'text-blue-500 bg-blue-100';
      case 'streak_alert': return 'text-purple-500 bg-purple-100';
      default: return 'text-indigo-500 bg-indigo-100';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors rounded-full hover:bg-gray-100"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl overflow-hidden z-50 border border-gray-100 transform transition-all duration-200 origin-top-right"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            <div className="flex space-x-2">
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                title="Mark all as read"
              >
                <Check className="w-4 h-4" />
              </button>
              <button 
                onClick={handleClearAll}
                className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p>No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 transition-colors hover:bg-gray-50 flex items-start space-x-3 ${!notification.is_read ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${!notification.is_read ? 'bg-indigo-500' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.type === 'team_invite' && !notification.is_read && (
                        <div className="flex space-x-2 mt-3.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptInvite(notification);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineInvite(notification);
                            }}
                            className="bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200/50 dark:border-slate-700 transition-colors cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <button 
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="flex-shrink-0 text-indigo-500 hover:text-indigo-700 p-1 rounded-full hover:bg-indigo-50 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
