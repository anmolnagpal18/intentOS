import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Users, Activity, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import IntentForm from './IntentForm';
import IntentList from './IntentList';
import TaskPanel from './TaskPanel';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export default function TeamDashboard({ team, onBack }) {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('workflows'); // 'workflows' or 'members'
  const { user: currentUser } = useAuth();
  const isOwner = team.owner === currentUser?.id || team.owner_username === currentUser?.username;
  
  // States for shared intents
  const [intents, setIntents] = useState([]);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [generatingIntentId, setGeneratingIntentId] = useState(null);
  const [schedulingIntentId, setSchedulingIntentId] = useState(null);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);

  useEffect(() => {
    fetchMembers();
    fetchIntents();
  }, [team.id]);

  useEffect(() => {
    if (intents.length > 0) {
      fetchTeamAnalytics();
      fetchActivityFeed();
    }
  }, [intents, taskRefreshKey]);

  const fetchTeamAnalytics = async () => {
    try {
      const response = await api.get('tasks/');
      const teamIntentsIds = intents.map(i => i.id);
      const tasksInTeam = response.data.filter(t => teamIntentsIds.includes(t.intent));
      
      const counts = {};
      // Seed with all current active members
      const activeMembers = members.filter(m => m.status !== 'pending');
      activeMembers.forEach(m => {
        counts[m.username] = { completed: 0, total: 0 };
      });

      tasksInTeam.forEach(t => {
        if (t.assigned_to_username) {
          const user = t.assigned_to_username;
          if (!counts[user]) counts[user] = { completed: 0, total: 0 };
          counts[user].total += 1;
          if (t.status === 'completed') {
            counts[user].completed += 1;
          }
        }
      });
      
      const leaderboardList = Object.keys(counts).map(username => ({
        username,
        completed: counts[username].completed,
        total: counts[username].total
      })).sort((a, b) => b.completed - a.completed);
      
      setLeaderboard(leaderboardList);
    } catch (error) {
      console.error('Error calculating team analytics:', error);
    }
  };

  const fetchActivityFeed = async () => {
    try {
      const response = await api.get('analytics/timeline/');
      const teamIntentsIds = intents.map(i => i.id);
      const teamLogs = response.data.filter(log => teamIntentsIds.includes(log.related_intent));
      setActivityFeed(teamLogs.slice(0, 8));
    } catch (error) {
      console.error('Error fetching team activity feed:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get(`teams/${team.id}/members/`);
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member from the team?")) return;
    try {
      await api.post(`teams/${team.id}/remove-member/`, { user_id: memberId });
      setMembers(prev => prev.filter(m => m.user !== memberId));
      setInviteSuccess('Member removed successfully.');
    } catch (error) {
      console.error('Error removing member:', error);
      setInviteError(error.response?.data?.error || 'Failed to remove member.');
    }
  };

  const fetchIntents = async () => {
    try {
      const response = await api.get('intents/');
      const teamIntents = response.data.filter(i => i.team === team.id);
      setIntents(teamIntents);
    } catch (error) {
      console.error('Error fetching intents:', error);
    }
  };

  const { latestMessage } = useWebSocketContext() || {};

  useEffect(() => {
    if (latestMessage) {
      const typesToRefresh = ['task_created', 'task_completed', 'task_deleted', 'task_updated', 'intent_created'];
      if (typesToRefresh.includes(latestMessage.type) || typesToRefresh.includes(latestMessage.event_type)) {
        // If the event is related to a team, and it's this team
        const payload = latestMessage.payload || {};
        const eventTeamId = payload.team?.id || payload.task?.intent?.team || payload.related_intent?.team;
        
        // If we can't reliably determine team, or if it matches, refresh
        if (!eventTeamId || eventTeamId === team.id) {
            fetchIntents();
            setTaskRefreshKey(prev => prev + 1);
        }
      }
    }
  }, [latestMessage, team.id]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    try {
      await api.post(`teams/${team.id}/invite/`, { user: inviteEmail });
      setInviteSuccess('User invited successfully!');
      setInviteEmail('');
      fetchMembers();
    } catch (error) {
      setInviteError(error.response?.data?.error || 'Failed to invite user.');
    }
  };

  const handleIntentCreated = (newIntent) => {
    setIntents([newIntent, ...intents]);
    setSelectedIntent(newIntent);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in flex flex-col h-full">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{team.name}</h1>
          <p className="text-gray-500">{team.description}</p>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'workflows'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shared Workflows
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Members & Analytics
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'workflows' && (
          <div>
            <IntentForm onIntentCreated={handleIntentCreated} teamId={team.id} />
            
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6 items-start mt-8">
              <IntentList
                intents={intents}
                selectedIntentId={selectedIntent?.id}
                onSelectIntent={setSelectedIntent}
                onGenerateTasks={async (intent) => {
                  setGeneratingIntentId(intent.id);
                  await api.post(`intents/${intent.id}/generate-tasks/`);
                  setTaskRefreshKey(prev => prev + 1);
                  setGeneratingIntentId(null);
                }}
                generatingIntentId={generatingIntentId}
                onGenerateSchedule={async (intent) => {
                  setSchedulingIntentId(intent.id);
                  await api.post(`intents/${intent.id}/schedule/`);
                  setTaskRefreshKey(prev => prev + 1);
                  setSchedulingIntentId(null);
                }}
                schedulingIntentId={schedulingIntentId}
              />
              <TaskPanel
                intent={selectedIntent}
                refreshKey={taskRefreshKey}
                teamMembers={members}
                teamId={team.id}
              />
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-6xl mx-auto">
            {/* Left Column: Invite & Members */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-indigo-600" />
                  Invite Member
                </h2>
                <form onSubmit={handleInvite} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Username or Email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                      required
                    />
                    {inviteError && <p className="text-red-500 text-sm mt-2">{inviteError}</p>}
                    {inviteSuccess && <p className="text-green-500 text-sm mt-2">{inviteSuccess}</p>}
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Invite
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-indigo-600" />
                  Team Members
                </h2>
                {loadingMembers ? (
                  <div className="text-gray-500 text-center py-4">Loading members...</div>
                ) : (
                  <div className="space-y-4">
                    {members.map(member => {
                      const isPending = member.status === 'pending';
                      const isMemberOwner = member.role === 'owner';
                      return (
                        <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/40 rounded-lg border border-gray-100 dark:border-slate-800/80">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                              {member.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{member.username}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{member.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-gray-500">
                            {isPending ? (
                              <span className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/40 dark:border-amber-800/20 px-2.5 py-1 rounded-full flex items-center font-semibold">
                                <Clock className="w-3.5 h-3.5 mr-1" /> Pending
                              </span>
                            ) : (
                              <span className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-800/20 px-2.5 py-1 rounded-full flex items-center font-semibold">
                                <Activity className="w-3.5 h-3.5 mr-1" /> Active
                              </span>
                            )}
                            {isOwner && !isMemberOwner && (
                              <button
                                onClick={() => handleRemoveMember(member.user)}
                                className="text-xs text-red-500 hover:text-red-700 font-bold p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                                title="Remove member"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Leaderboard & Activity Feed */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="mr-2">🏆</span> Team Leaderboard
                </h2>
                <div className="space-y-3">
                  {leaderboard.map((userStats, index) => {
                    const rankColors = [
                      'bg-yellow-100 text-yellow-800 border-yellow-200', 
                      'bg-slate-100 text-slate-800 border-slate-200', 
                      'bg-amber-100 text-amber-800 border-amber-200'
                    ];
                    const isTopThree = index < 3;
                    return (
                      <div key={userStats.username} className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-150 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs ${
                            isTopThree ? rankColors[index] : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-semibold text-gray-800">{userStats.username}</span>
                        </div>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                          {userStats.completed} / {userStats.total} completed
                        </span>
                      </div>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <p className="text-xs text-gray-500 italic text-center py-4">No task assignments logged yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="mr-2">⚡</span> Team Activity Feed
                </h2>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {activityFeed.map((log, logIdx) => (
                      <li key={log.id}>
                        <div className="relative pb-6">
                          {logIdx !== activityFeed.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs">
                                {log.event_type === 'task_completed' ? '✅' : '➕'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-xs text-gray-700 dark:text-gray-200 font-medium">
                                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-1">
                                    {log.username || 'Someone'}
                                  </span>
                                  {log.event_type === 'task_completed' ? 'completed' : 
                                   log.event_type === 'task_created' ? 'created task' : 
                                   log.event_type === 'task_deleted' ? 'deleted task' : 'created'}{" "}
                                  <span className="font-semibold text-gray-800 dark:text-gray-100">
                                    {log.task_title || log.intent_title}
                                  </span>
                                </p>
                              </div>
                              <div className="text-right text-[10px] whitespace-nowrap text-gray-500 font-light">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                    {activityFeed.length === 0 && (
                      <p className="text-xs text-gray-500 italic text-center py-4">No recent team activities logged.</p>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
