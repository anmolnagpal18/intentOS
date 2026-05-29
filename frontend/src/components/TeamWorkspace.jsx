import React, { useState, useEffect } from 'react';
import api from '../services/api';
import TeamDashboard from './TeamDashboard';
import { Users, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function TeamWorkspace() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchTeams();

    const handleRefreshTeams = () => {
      fetchTeams();
    };

    window.addEventListener('refresh-teams', handleRefreshTeams);
    return () => window.removeEventListener('refresh-teams', handleRefreshTeams);
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.get('teams/');
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('teams/', {
        name: newTeamName,
        description: newTeamDesc
      });
      setTeams([...teams, response.data]);
      setShowCreate(false);
      setNewTeamName('');
      setNewTeamDesc('');
      setSelectedTeam(response.data);
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  if (selectedTeam) {
    return (
      <TeamDashboard 
        team={selectedTeam} 
        onBack={() => setSelectedTeam(null)} 
      />
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Team Workspaces</h1>
          <p className="mt-2 text-gray-500">Collaborate with others on shared intents and tasks.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Team</span>
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateTeam} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create a New Team</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Team Name</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows="3"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Create Team
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No teams</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new team workspace.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center justify-between">
                {team.name}
                <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="mt-2 text-gray-500 text-sm line-clamp-2">
                {team.description || 'No description provided.'}
              </p>
              <div className="mt-4 flex items-center text-xs text-gray-400">
                <span>Created by {team.owner_username}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
