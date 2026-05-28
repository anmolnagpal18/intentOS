import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { 
  Play, Pause, RotateCcw, Volume2, Target, Award, CheckCircle2, 
  Globe, Tv, Music, Heart, ExternalLink, Search, Sparkles, 
  Maximize2, Minimize2, ListTodo, AlertTriangle, Bookmark, HelpCircle, 
  ChevronRight, ArrowRight, Smartphone, Plus, X, RefreshCw, 
  ChevronLeft, Settings, Moon, Sun, User, Activity, AlertCircle
} from 'lucide-react';

const FocusSanctuary = () => {
  const { latestMessage } = useWebSocketContext() || {};

  const [mode, setMode] = useState('focus'); // 'focus', 'short_break', 'long_break'
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [todayTasks, setTodayTasks] = useState([]);
  const [error, setError] = useState(null);
  
  // Workspace Terminal View Customization
  const [viewMode, setViewMode] = useState('split'); // 'split', 'timer', 'copilot'
  const [viewportMode, setViewportMode] = useState('welcome'); // 'welcome', 'iframe', 'dashboard'
  
  // Smart Web Portal State
  const [webUrl, setWebUrl] = useState('https://devdocs.io');
  const [customWebUrl, setCustomWebUrl] = useState('');
  const [webType, setWebType] = useState('iframe'); // 'iframe', 'ai'
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // YouTube State
  const [youtubeVideoId, setYoutubeVideoId] = useState('5qap5aO4i9A'); // Preset lo-fi focus session
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [youtubeSearchResults, setYoutubeSearchResults] = useState([]);
  const [youtubeSearchLoading, setYoutubeSearchLoading] = useState(false);
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState('');
  
  // Spotify State
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState('https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn'); // Lo-Fi Beats playlist
  const [customSpotifyUrl, setCustomSpotifyUrl] = useState('');
  const [spotifySearchResults, setSpotifySearchResults] = useState([]);
  const [spotifySearchLoading, setSpotifySearchLoading] = useState(false);
  const [spotifySearchQuery, setSpotifySearchQuery] = useState('');
  
  // Motivational Quotes State
  const [currentQuote, setCurrentQuote] = useState("Energy flows where attention goes. Lock in your focus, achieve your dreams.");

  // ChatGPT AI Console State
  const [chatgptHistory, setChatgptHistory] = useState([
    { role: 'assistant', text: "Hello! I am your integrated ChatGPT Workstation assistant. How can I help you learn or write code today?" }
  ]);
  const [chatgptInput, setChatgptInput] = useState('');
  const [chatgptLoading, setChatgptLoading] = useState(false);
  const [dashboardLayoutMode, setDashboardLayoutMode] = useState('grid'); // 'grid' | 'browser' | 'chatgpt' | 'youtube' | 'spotify'

  // Browser Tabs State
  const [browserTabs, setBrowserTabs] = useState([
    { id: 'welcome', title: 'Welcome Hub', url: 'welcome', history: ['welcome'], historyIndex: 0 }
  ]);
  const [activeTabId, setActiveTabId] = useState('welcome');
  const [inputUrl, setInputUrl] = useState('');

  // Local Storage Tasks State
  const [localTasks, setLocalTasks] = useState(() => {
    const saved = localStorage.getItem('sanctuary_local_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium'); // 'high', 'medium', 'low'
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  // Floating AI State
  const [showFloatingAI, setShowFloatingAI] = useState(false);
  const [floatingInput, setFloatingInput] = useState('');
  const [floatingAIHistory, setFloatingAIHistory] = useState([
    { role: 'assistant', text: "Hello! I am your Focus Sanctuary assistant. I can help answer quick questions or create checklists while you focus. What are we studying today?" }
  ]);
  const [floatingAILoading, setFloatingAILoading] = useState(false);

  // YouTube sidebar toggle state
  const [hideYoutubeSidebar, setHideYoutubeSidebar] = useState(false);
  const [showTasksSidebar, setShowTasksSidebar] = useState(true);

  useEffect(() => {
    localStorage.setItem('sanctuary_local_tasks', JSON.stringify(localTasks));
  }, [localTasks]);

  const timerRef = useRef(null);
  const iframeRef = useRef(null);

  const modeSettings = {
    focus: { time: 25 * 60, title: 'Focus Session', color: 'text-indigo-500 dark:text-indigo-400', strokeColor: '#6366f1' },
    short_break: { time: 5 * 60, title: 'Short Break', color: 'text-emerald-500 dark:text-emerald-400', strokeColor: '#10b981' },
    long_break: { time: 15 * 60, title: 'Long Break', color: 'text-cyan-500 dark:text-cyan-400', strokeColor: '#06b6d4' }
  };

  const quotesList = [
    "Energy flows where attention goes. Lock in your focus, achieve your dreams.",
    "Your future is created by what you do today, not tomorrow.",
    "Focus on being productive instead of busy.",
    "Small progress every day adds up to big results.",
    "Deep work is the superpower of the 21st century.",
    "Make each day your masterpiece.",
    "Every step forward, no matter how small, is a step closer to your goals.",
    "Discipline is choosing between what you want now and what you want most."
  ];

  useEffect(() => {
    fetchTodayTasks();
  }, []);

  useEffect(() => {
    if (latestMessage) {
      const typesToRefresh = ['task_created', 'task_completed', 'task_deleted', 'task_updated', 'intent_created'];
      if (typesToRefresh.includes(latestMessage.type) || typesToRefresh.includes(latestMessage.event_type)) {
        fetchTodayTasks();
      }
    }
  }, [latestMessage]);

  // Sync local isDarkMode with global HTML classList mutations (Tailwind Theme)
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    // Initial check
    checkTheme();
    
    // Set up a MutationObserver to listen for class attribute changes on <html>
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isActive, mode]);

  const fetchTodayTasks = async () => {
    try {
      const res = await api.get('dashboard/today/');
      setTodayTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const createNewTab = (title, url) => {
    const newId = Date.now().toString();
    const newTab = { id: newId, title, url, history: [url], historyIndex: 0 };
    setBrowserTabs(prev => {
      const updated = prev.map(t => ({ ...t, isActive: false }));
      return [...updated, { ...newTab, isActive: true }];
    });
    setActiveTabId(newId);
    setInputUrl(url === 'welcome' || url === 'chatgpt' || url === 'youtube' || url === 'spotify' ? '' : url);
  };

  const closeTab = (tabId, e) => {
    if (e) e.stopPropagation();
    if (browserTabs.length === 1) return;
    
    const tabIndex = browserTabs.findIndex(t => t.id === tabId);
    const newTabs = browserTabs.filter(t => t.id !== tabId);
    
    if (activeTabId === tabId) {
      const nextActiveIndex = Math.max(0, tabIndex - 1);
      const nextActiveId = newTabs[nextActiveIndex].id;
      setActiveTabId(nextActiveId);
      const nextUrl = newTabs[nextActiveIndex].url;
      setInputUrl(nextUrl === 'welcome' || nextUrl === 'chatgpt' || nextUrl === 'youtube' || nextUrl === 'spotify' ? '' : nextUrl);
    }
    setBrowserTabs(newTabs);
  };

  const switchTab = (tabId) => {
    setActiveTabId(tabId);
    const tab = browserTabs.find(t => t.id === tabId);
    if (tab) {
      setInputUrl(tab.url === 'welcome' || tab.url === 'chatgpt' || tab.url === 'youtube' || tab.url === 'spotify' ? '' : tab.url);
    }
  };

  const navigateTab = (direction) => {
    const tabIndex = browserTabs.findIndex(t => t.id === activeTabId);
    if (tabIndex === -1) return;
    
    const tab = browserTabs[tabIndex];
    let newIndex = tab.historyIndex;
    
    if (direction === 'back' && newIndex > 0) {
      newIndex -= 1;
    } else if (direction === 'forward' && newIndex < tab.history.length - 1) {
      newIndex += 1;
    } else {
      return;
    }
    
    const newUrl = tab.history[newIndex];
    const updatedTabs = [...browserTabs];
    updatedTabs[tabIndex] = {
      ...tab,
      url: newUrl,
      historyIndex: newIndex
    };
    
    setBrowserTabs(updatedTabs);
    setInputUrl(newUrl === 'welcome' || newUrl === 'chatgpt' || newUrl === 'youtube' || newUrl === 'spotify' ? '' : newUrl);
    
    if (newUrl.startsWith('http') || newUrl.includes('.')) {
      setWebUrl(newUrl);
    }
  };

  const updateActiveTabUrl = (newUrl) => {
    const tabIndex = browserTabs.findIndex(t => t.id === activeTabId);
    if (tabIndex === -1) return;
    
    const tab = browserTabs[tabIndex];
    const newHistory = tab.history.slice(0, tab.historyIndex + 1);
    newHistory.push(newUrl);
    const newIndex = newHistory.length - 1;
    
    let title = 'Web Page';
    if (newUrl === 'welcome') title = 'Welcome Hub';
    else if (newUrl === 'chatgpt') title = '🤖 ChatGPT';
    else if (newUrl === 'youtube') title = '📺 YouTube';
    else if (newUrl === 'spotify') title = '🎵 Spotify';
    else {
      try {
        const host = new URL(newUrl.startsWith('http') ? newUrl : 'https://' + newUrl).hostname;
        title = host.replace('www.', '');
      } catch (e) {
         title = newUrl.substring(0, 15);
      }
    }
    
    const updatedTabs = [...browserTabs];
    updatedTabs[tabIndex] = {
      ...tab,
      title,
      url: newUrl,
      history: newHistory,
      historyIndex: newIndex
    };
    setBrowserTabs(updatedTabs);
    setInputUrl(newUrl === 'welcome' || newUrl === 'chatgpt' || newUrl === 'youtube' || newUrl === 'spotify' ? '' : newUrl);
    
    if (newUrl.startsWith('http') || newUrl.includes('.')) {
      setWebUrl(newUrl);
    }
  };

  const addLocalTask = (e) => {
    if (e) e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const newTask = {
      id: 'local_' + Date.now(),
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      due_date: newTaskDueDate || new Date().toISOString().split('T')[0],
      status: 'pending',
      intent: { title: 'Local Task' }
    };
    
    setLocalTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskDueDate('');
  };

  const handleToggleLocalTask = (taskId) => {
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
  };

  const getRandomQuote = () => {
    const currentIndex = quotesList.indexOf(currentQuote);
    let nextIndex = Math.floor(Math.random() * quotesList.length);
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * quotesList.length);
    }
    setCurrentQuote(quotesList[nextIndex]);
  };

  const handleSessionEnd = () => {
    setIsActive(false);
    
    // Play premium polyphonic focus chime
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const now = context.currentTime;
      
      // Chime note 1
      const osc1 = context.createOscillator();
      const gain1 = context.createGain();
      osc1.connect(gain1);
      gain1.connect(context.destination);
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.1);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      osc1.start(now);
      osc1.stop(now + 0.8);
      
      // Chime note 2 (harmonized third)
      const osc2 = context.createOscillator();
      const gain2 = context.createGain();
      osc2.connect(gain2);
      gain2.connect(context.destination);
      osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.2, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.95);
    } catch (e) {
      console.error(e);
    }

    if (mode === 'focus') {
      alert("🎯 Focus session complete! The Smart Terminal has unlocked your social break zone.");
      changeMode('short_break');
      setViewportMode('welcome'); // Automatically return workstation terminal to Welcome Hub / Break options!
      getRandomQuote();
    } else {
      alert("🌱 Break over! Let's lock back into the study terminal.");
      changeMode('focus');
      setViewportMode('welcome'); // Automatically restore workstation terminal to Welcome Hub!
    }
  };

  const changeMode = (newMode) => {
    setIsActive(false);
    setMode(newMode);
    const time = modeSettings[newMode].time;
    setTimeLeft(time);
    setInitialTime(time);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialTime);
  };

  const handleToggleTaskComplete = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const response = await api.patch(`tasks/${task.id}/`, {
        status: nextStatus,
      });
      setTodayTasks(prev => prev.map(t => t.id === task.id ? response.data : t));
    } catch (err) {
      console.error(err);
    }
  };

  const renderAiStudySheet = () => {
    if (!aiSearchResult) return null;
    
    const lines = aiSearchResult.split('\n');
    let inCodeBlock = false;
    let codeLines = [];

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Code block detection
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const codeText = codeLines.join('\n');
          codeLines = [];
          return (
            <pre key={idx} className="bg-slate-950 dark:bg-black/50 border border-gray-200 dark:border-slate-800 text-emerald-400 dark:text-emerald-400 font-mono p-4 rounded-xl text-xs overflow-x-auto my-3 shadow-inner leading-relaxed select-all">
              <code>{codeText}</code>
            </pre>
          );
        } else {
          inCodeBlock = true;
          return null;
        }
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return null;
      }

      // Headers
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={idx} className="text-sm font-black text-slate-800 dark:text-white mt-5 mb-2 flex items-center gap-1.5 border-b border-gray-100 dark:border-slate-800/60 pb-1">
            ✨ {trimmed.replace(/^###\s*/, '')}
          </h4>
        );
      }
      if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
        return (
          <h3 key={idx} className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-6 mb-3 flex items-center gap-2 border-b border-indigo-50/50 dark:border-slate-800/80 pb-1.5">
            🎯 {trimmed.replace(/^#+\s*/, '')}
          </h3>
        );
      }

      // Lists
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        const textContent = trimmed.substring(1).trim();
        return (
          <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 list-disc ml-5 mb-1.5 leading-relaxed">
            {parseBoldText(textContent)}
          </li>
        );
      }

      if (trimmed === '') {
        return <div key={idx} className="h-2"></div>;
      }

      return (
        <p key={idx} className="text-xs text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">
          {parseBoldText(trimmed)}
        </p>
      );
    });
  };

  const parseBoldText = (text) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-slate-950 dark:text-white bg-indigo-50/50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">{part}</strong>;
      }
      return part;
    });
  };

  // URL / Embed Parsers
  const parseYoutubeId = (url) => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.length === 11 && !cleanUrl.includes('/') && !cleanUrl.includes('.')) return cleanUrl;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = cleanUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : cleanUrl;
  };

  const handleChatgptSubmit = async (e, customText = null) => {
    if (e) e.preventDefault();
    const text = customText !== null ? customText.trim() : chatgptInput.trim();
    if (!text) return;
    
    // Add user message to history
    const newUserMessage = { role: 'user', text };
    setChatgptHistory(prev => [...prev, newUserMessage]);
    setChatgptInput('');
    setChatgptLoading(true);
    
    try {
      const prompt = `You are a ChatGPT study assistant proxy inside the Focus Workstation of Intent-OS.
      Help the user with their request: "${text}".
      Provide high-quality, professional, direct, and incredibly useful answers. If they ask for code, write it inside clean Markdown blocks. Keep answers extremely direct and clear.`;
      
      const formattedHistory = chatgptHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        text: msg.text
      }));
      
      const response = await api.post('ai/copilot/', {
        prompt: prompt,
        history: formattedHistory
      });
      
      const replyText = response.data.reply;
      setChatgptHistory(prev => [...prev, { role: 'assistant', text: replyText }]);
    } catch (err) {
      console.error(err);
      setChatgptHistory(prev => [...prev, { role: 'assistant', text: "⚠️ Failed to communicate with ChatGPT proxy. Please ensure your `GEMINI_API_KEY` is fully configured in the `.env` settings." }]);
    } finally {
      setChatgptLoading(false);
    }
  };

  const handleYoutubeStationSearch = async (e, customQuery = null) => {
    if (e) e.preventDefault();
    const query = customQuery !== null ? customQuery.trim() : youtubeSearchQuery.trim();
    if (!query) return;

    setYoutubeSearchLoading(true);
    setYoutubeSearchResults([]);
    
      try {
        const prompt = `You are a YouTube video search expert. Find the top 6 high-quality YouTube videos matching this query: "${query}".
      IMPORTANT RULES:
      - If the query mentions a specific YouTube channel or creator name (e.g. "Sheryians Coding School", "Sheryians", "Sheriyans Coding School", "Sheriyans", "CodeWithHarry", "Apna College", "freeCodeCamp", "Hitesh Choudhary", "Chai aur Code", etc.), you MUST prioritize videos FROM that specific channel. At least 4-5 results should be from that channel.
      - Return real, existing, popular YouTube video IDs that are exactly 11 characters long.
      - Videos can be tutorials, lectures, music, ambient streams, or any content type.
      Return ONLY a JSON array of objects with the exact schema:
      [
        {"title": "Video Title (keep it short)", "channel": "Channel Name", "videoId": "11-char working YouTube video ID (must be standard and valid)"}
      ]
      Do not wrap in markdown format, return only the raw JSON.`;
      
      const response = await api.post('ai/copilot/', {
        prompt: prompt,
        history: [],
        json_mode: true
      });
      
      let cleanText = response.data.reply.trim();
      const startIdx = cleanText.indexOf('[');
      const endIdx = cleanText.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanText = cleanText.substring(startIdx, endIdx + 1);
      } else {
        if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
        if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      
      const results = JSON.parse(cleanText.trim());
      setYoutubeSearchResults(results);
      if (results.length > 0 && results[0].videoId) {
        setYoutubeVideoId(results[0].videoId);
      }
    } catch (err) {
      console.error(err);
      // Fallback standard working YouTube streams
      setYoutubeSearchResults([
        { title: "Lofi Girl Study Session", channel: "Lofi Girl", videoId: "5qap5aO4i9A" },
        { title: "Relaxing Rain in Forest", channel: "Ambient Nature", videoId: "5qap5aO4i9A" }
      ]);
    } finally {
      setYoutubeSearchLoading(false);
    }
  };

  const handleUnifiedSubmit = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const cleanQuery = query.toLowerCase().trim();
    const isChatgpt = cleanQuery === 'chatgpt' || cleanQuery === 'chat gpt' || cleanQuery === 'chatgpt.com';
    const isChatgptPrefix = cleanQuery.startsWith('chatgpt ') || cleanQuery.startsWith('chat gpt ');
    const isYoutubeKeyword = cleanQuery === 'youtube' || cleanQuery === 'youtobe' || cleanQuery === 'youtube.com';
    const isYoutubePrefix = cleanQuery.startsWith('youtube ') || cleanQuery.startsWith('youtobe ') || cleanQuery.startsWith('youtube.com ');
    
    if (isChatgpt) {
      setViewportMode('chatgpt');
      return;
    } else if (isChatgptPrefix) {
      const prefixLength = cleanQuery.startsWith('chat gpt ') ? 9 : 8;
      const promptText = query.substring(prefixLength).trim();
      setViewportMode('chatgpt');
      if (promptText) {
        handleChatgptSubmit(null, promptText);
      }
      return;
    } else if (isYoutubeKeyword) {
      setSearchQuery('YouTube Station');
      setYoutubeVideoId('5qap5aO4i9A'); // Lofi Girl Focus preset
      setYoutubeSearchQuery('');
      setYoutubeSearchResults([
        { title: "Lofi Girl Study Session", channel: "Lofi Girl", videoId: "5qap5aO4i9A" },
        { title: "Relaxing Rain & Forest Sounds", channel: "Nature Ambient", videoId: "3G4O8A9t-iI" },
        { title: "Deep Focus Classical Music", channel: "Classical Study", videoId: "8Ob73aA4sPI" }
      ]);
      setViewportMode('youtube');
      return;
    } else if (isYoutubePrefix) {
      let prefixLength = 8; // default for "youtube "
      if (cleanQuery.startsWith('youtobe ')) prefixLength = 8;
      else if (cleanQuery.startsWith('youtube.com ')) prefixLength = 12;
      const youtubeSearchTerm = query.substring(prefixLength).trim();
      
      setSearchQuery(`YouTube: ${youtubeSearchTerm}`);
      setYoutubeSearchQuery(youtubeSearchTerm);
      setViewportMode('youtube');
      if (youtubeSearchTerm) {
        handleYoutubeStationSearch(null, youtubeSearchTerm);
      }
      return;
    }

    // Check if it's a YouTube URL or standard 11-char Video ID (no spaces)
    const isYoutubeUrl = query.includes('youtube.com') || query.includes('youtu.be');
    // Check if it's a Spotify link
    const isSpotifyUrl = query.includes('spotify.com');
    // Check if it looks like a valid URL or search term
    const isUrl = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i.test(query) && !query.includes(' ');
    
    if (isYoutubeUrl) {
      const id = parseYoutubeId(query);
      if (id) {
        setYoutubeVideoId(id);
        setWebUrl(`https://www.youtube.com/embed/${id}`);
        setViewportMode('iframe');
      }
    } else if (isSpotifyUrl) {
      const embedUrl = parseSpotifyUrl(query);
      if (embedUrl) {
        setSpotifyEmbedUrl(embedUrl);
        setWebUrl(embedUrl);
        setViewportMode('iframe');
      }
    } else if (isUrl) {
      const parsed = parseWebUrl(query);
      if (parsed) {
        setWebUrl(parsed);
        setViewportMode('iframe');
      }
    } else {
      // Unified text search query -> AI study sheet, youtube recommendations, spotify playlists!
      setAiSearchLoading(true);
      setViewportMode('dashboard');
      setDashboardLayoutMode('grid'); // Reset to grid view for a new search
      setWebUrl(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
      setAiSearchResult('');
      setYoutubeSearchResults([]);
      setSpotifySearchResults([]);
      
      try {
        const prompt = `You are a premium study workstation AI assistant. The user wants to learn about: "${query}".
        You must perform three tasks:
        1. Compile a comprehensive, high-density study guide / cheat sheet with key concepts, bullet points, and code examples (if applicable).
        2. Recommend exactly 6 high-quality educational YouTube videos with titles, channels, and working 11-character video IDs.
           IMPORTANT: If the user mentions a specific YouTube channel or creator name (e.g. "Sheryians Coding School", "Sheryians", "Sheriyans Coding School", "Sheriyans", "CodeWithHarry", "Apna College", "freeCodeCamp", "Hitesh Choudhary", "Chai aur Code", etc.), you MUST prioritize videos FROM that specific channel. At least 4-5 of the 6 results should be from that channel.
        3. Recommend exactly 3 deep-focus study Spotify playlists with titles, short descriptions, and playlist IDs.
        
        You MUST return your response in the exact JSON format below. Do NOT wrap it in markdown format (no "\`\`\`json" wrapper), just return the raw JSON:
        {
          "studyGuide": "YOUR DETAILED STUDY GUIDE TEXT (using markdown headers ###, bullet points, and code blocks \`\`\`)",
          "youtubeVideos": [
            {"title": "Video Title", "channel": "Channel Name", "videoId": "11-char video ID"}
          ],
          "spotifyPlaylists": [
            {"title": "Playlist Title", "description": "Short description", "playlistId": "playlist ID"}
          ],
          "quote": "A short motivational quote to keep the user focused."
        }`;
        
        const response = await api.post('ai/copilot/', {
          prompt: prompt,
          history: [],
          json_mode: true
        });
        
        let cleanText = response.data.reply.trim();
        
        // Robust JSON extraction - try multiple strategies
        let results = null;
        
        // Strategy 1: Find JSON object boundaries
        const jsonStart = cleanText.indexOf('{');
        const jsonEnd = cleanText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          try {
            results = JSON.parse(cleanText.substring(jsonStart, jsonEnd + 1));
          } catch (e) {
            // Strategy 2: Strip markdown code fences
            let stripped = cleanText;
            stripped = stripped.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
            const s2 = stripped.indexOf('{');
            const e2 = stripped.lastIndexOf('}');
            if (s2 !== -1 && e2 !== -1 && e2 > s2) {
              try { results = JSON.parse(stripped.substring(s2, e2 + 1)); } catch (e2) {}
            }
          }
        }
        
        if (results && results.studyGuide) {
          setAiSearchResult(results.studyGuide || '');
          setChatgptHistory([
            { role: 'assistant', text: results.studyGuide || `Here is a comprehensive overview of ${query}.` }
          ]);
          setYoutubeSearchResults(results.youtubeVideos || []);
          setSpotifySearchResults(results.spotifyPlaylists || []);
          if (results.youtubeVideos && results.youtubeVideos.length > 0) {
            setYoutubeVideoId(results.youtubeVideos[0].videoId);
          }
          if (results.spotifyPlaylists && results.spotifyPlaylists.length > 0) {
            setSpotifyEmbedUrl(`https://open.spotify.com/embed/playlist/${results.spotifyPlaylists[0].playlistId}`);
          }
          if (results.quote) {
            setCurrentQuote(results.quote);
          }
        } else {
          // JSON parsing failed - use the raw AI text as study guide and make a separate YouTube-only request
          const rawText = response.data.reply || '';
          setAiSearchResult(rawText);
          setChatgptHistory([{ role: 'assistant', text: rawText }]);
          
          // Attempt a second lightweight call just for YouTube videos
          try {
            const ytPrompt = `[STRICT JSON ONLY] Return a raw JSON array of 6 YouTube videos about "${query}".
If the query mentions a channel (Sheriaans, CodeWithHarry, Apna College, etc.), prioritize that channel.
Format: [{"title":"Title","channel":"Channel","videoId":"xxxxxxxxxxx"}]
NO markdown, NO explanation, ONLY the JSON array:`;
            
            const ytResponse = await api.post('ai/copilot/', { prompt: ytPrompt, history: [], json_mode: true });
            let ytText = ytResponse.data.reply.trim();
            const arrStart = ytText.indexOf('[');
            const arrEnd = ytText.lastIndexOf(']');
            if (arrStart !== -1 && arrEnd !== -1) {
              const ytResults = JSON.parse(ytText.substring(arrStart, arrEnd + 1));
              if (ytResults.length > 0) {
                setYoutubeSearchResults(ytResults);
                setYoutubeVideoId(ytResults[0].videoId);
              } else {
                throw new Error('Empty results');
              }
            } else {
              throw new Error('No JSON array found');
            }
          } catch (ytErr) {
            // Dynamic fallback - use working standard focus stream to guarantee playing
            setYoutubeSearchResults([
              { title: `${query} - Study Stream`, channel: "Lofi Girl", videoId: "5qap5aO4i9A" },
              { title: `${query} - Ambient Nature`, channel: "Nature Ambient", videoId: "3G4O8A9t-iI" }
            ]);
            // Embed YouTube search results page via iframe in the web panel instead
            setWebUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
            setYoutubeVideoId("5qap5aO4i9A");
          }
          
          setSpotifySearchResults([
            { title: "Lofi Beats Station", description: "Chill focus streams", playlistId: "37i9dQZF1DWWQRwui0ExPn" },
            { title: "Deep Focus", description: "Ambient concentration", playlistId: "37i9dQZF1DWZeKFB6uYLUN" },
            { title: "Coding Mode", description: "Electronic focus beats", playlistId: "37i9dQZF1DX5trt9i14X7j" }
          ]);
        }
      } catch (err) {
        console.error(err);
        // Complete fallback if entire API call fails
        const fallbackText = `### Study Guide: ${query}\n\n* Search the web panel for documentation and tutorials\n* Use the YouTube panel to watch video lectures\n* Play Spotify focus music while studying\n\n### Getting Started\n* Break the topic into smaller sub-topics\n* Practice with hands-on coding exercises\n* Review official documentation for reference`;
        setAiSearchResult(fallbackText);
        setChatgptHistory([{ role: 'assistant', text: fallbackText }]);
        // Dynamic YouTube fallback - set web URL to YouTube search for the query
        setWebUrl(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
        setYoutubeSearchResults([
          { title: `${query} - Study Stream`, channel: "Lofi Girl", videoId: "5qap5aO4i9A" },
          { title: `${query} - Ambient Nature`, channel: "Nature Ambient", videoId: "3G4O8A9t-iI" }
        ]);
        setYoutubeVideoId("5qap5aO4i9A");
        setSpotifySearchResults([
          { title: "Lofi Beats Station", description: "Chill focus streams", playlistId: "37i9dQZF1DWWQRwui0ExPn" },
          { title: "Deep Focus", description: "Ambient concentration", playlistId: "37i9dQZF1DWZeKFB6uYLUN" },
          { title: "Coding Mode", description: "Electronic focus beats", playlistId: "37i9dQZF1DX5trt9i14X7j" }
        ]);
      } finally {
        setAiSearchLoading(false);
      }
    }
  };

  const parseSpotifyUrl = (url) => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.includes('spotify.com/embed/')) return cleanUrl;
    const match = cleanUrl.match(/spotify\.com\/(playlist|track|album|artist)\/([a-zA-Z0-9]+)/);
    if (match) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
    }
    return cleanUrl;
  };

  const parseWebUrl = (url) => {
    if (!url) return '';
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    return cleanUrl;
  };

  // Dedicated Popup Breakout Windows
  const launchInstagramBreak = () => {
    window.open('https://instagram.com', '_blank', 'width=450,height=750,resizable=yes,scrollbars=yes,location=no,status=no');
  };

  const launchSpotifyBreak = () => {
    window.open('https://open.spotify.com', '_blank', 'width=500,height=800,resizable=yes,scrollbars=yes,location=no,status=no');
  };

  // SVG progress circle calculations
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / initialTime) * circumference;

  const activeTab = browserTabs.find(t => t.id === activeTabId) || browserTabs[0];
  const activeUrl = activeTab ? activeTab.url : 'welcome';

  const allTasks = [...todayTasks, ...localTasks];
  const completedTasksCount = allTasks.filter(t => t.status === 'completed').length;
  const totalTasksCount = allTasks.length;
  const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const handleToggleTask = (task) => {
    if (task.id.toString().startsWith('local_')) {
      handleToggleLocalTask(task.id);
    } else {
      handleToggleTaskComplete(task);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard Shortcuts Key Bindings
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is typing in an input, textarea, or select to prevent triggering shortcuts
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      
      const key = e.key.toLowerCase();
      
      // Spacebar plays or pauses pomodoro timer
      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      }
      
      // Alt + T changes layout mode to Split
      if (e.altKey && key === 't') {
        e.preventDefault();
        setViewMode('split');
      }
      
      // Alt + B changes layout mode to Browser Only
      if (e.altKey && key === 'b') {
        e.preventDefault();
        setViewMode('copilot');
      }
      
      // Alt + M changes layout mode to Timer Only
      if (e.altKey && key === 'm') {
        e.preventDefault();
        setViewMode('timer');
      }

      // Alt + A toggles Floating AI Co-pilot
      if (e.altKey && key === 'a') {
        e.preventDefault();
        setShowFloatingAI(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, toggleTimer, setViewMode]);

  const handleFloatingAISubmit = async (e) => {
    if (e) e.preventDefault();
    const text = floatingInput.trim();
    if (!text) return;

    const newMsg = { role: 'user', text };
    setFloatingAIHistory(prev => [...prev, newMsg]);
    setFloatingInput('');
    setFloatingAILoading(true);

    try {
      const prompt = `You are a helpful Focus Sanctuary study partner AI. The user is currently in a deep focus session. Give extremely concise, actionable, and encouraging help regarding: "${text}". Keep your answer under 3-4 sentences maximum.`;
      
      const formattedHistory = floatingAIHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        text: msg.text
      }));

      const response = await api.post('ai/copilot/', {
        prompt,
        history: formattedHistory
      });

      setFloatingAIHistory(prev => [...prev, { role: 'assistant', text: response.data.reply }]);
    } catch (err) {
      console.error(err);
      setFloatingAIHistory(prev => [...prev, { role: 'assistant', text: "⚠️ Failed to get a response. Please check your network connection." }]);
    } finally {
      setFloatingAILoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#080914] text-slate-100' : 'bg-[#f8f9fa] text-slate-800'} transition-colors duration-300 py-6 px-4 sm:px-6 lg:px-8 max-w-8xl mx-auto flex flex-col gap-6 font-sans relative overflow-x-hidden`}>
      
      {/* Ambient background glowing circles */}
      {isDarkMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[120px]" />
          <div className="absolute bottom-[30%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[150px]" />
        </div>
      )}

      {/* Top Bar Workspace Dashboard Settings */}
      <div className={`z-20 flex flex-col sm:flex-row items-center justify-between gap-4 border rounded-2xl p-4 shadow-xl backdrop-blur-xl transition duration-200 ${
        isDarkMode 
          ? 'bg-slate-900/60 border-slate-800/80 shadow-black/20' 
          : 'bg-white/90 border-gray-200/80 shadow-gray-200/40'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              Focus Sanctuary <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${isDarkMode ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>Terminal v2</span>
            </h1>
            <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Immersion productivity workspace with Chrome-inspired dynamic browser, pomodoro cycles, and task trackers.</p>
          </div>
        </div>
        
        {/* Responsive Layout Controls & Theme Toggles */}
        <div className="flex items-center gap-3">
          <div className={`p-1 rounded-xl flex items-center gap-1 border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-100 border-gray-200'}`}>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'split'
                  ? (isDarkMode ? 'bg-slate-800 text-indigo-400 shadow-md border border-slate-700' : 'bg-white text-indigo-600 shadow-md border border-gray-150')
                  : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split Screen</span>
            </button>
            
            <button
              onClick={() => setViewMode('timer')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'timer'
                  ? (isDarkMode ? 'bg-slate-800 text-indigo-400 shadow-md border border-slate-700' : 'bg-white text-indigo-600 shadow-md border border-gray-150')
                  : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
              }`}
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Timer Only</span>
            </button>
            
            <button
              onClick={() => setViewMode('copilot')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'copilot'
                  ? (isDarkMode ? 'bg-slate-800 text-indigo-400 shadow-md border border-slate-700' : 'bg-white text-indigo-600 shadow-md border border-gray-150')
                  : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Browser Only</span>
            </button>

            <div className="h-4 w-px bg-slate-800 dark:bg-slate-800 mx-1" />

            <button
              onClick={() => setShowTasksSidebar(!showTasksSidebar)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                showTasksSidebar
                  ? (isDarkMode ? 'bg-indigo-600/90 text-white shadow-md border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm')
                  : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
              }`}
              title="Toggle Tasks Sidebar"
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>{showTasksSidebar ? 'Hide Tasks' : 'Show Tasks'}</span>
            </button>
          </div>

          {/* Theme & Settings Icons Removed */}
        </div>
      </div>

      {/* Main Grid Workstation */}
      <div className={`z-10 grid gap-6 items-start ${
        viewMode === 'split' 
          ? (showTasksSidebar ? 'grid-cols-1 lg:grid-cols-[0.8fr_1.4fr_0.8fr]' : 'grid-cols-1 lg:grid-cols-[0.8fr_2.2fr]') 
          : (viewMode === 'timer' 
              ? (showTasksSidebar ? 'grid-cols-1 lg:grid-cols-[1fr_0.8fr]' : 'grid-cols-1') 
              : (showTasksSidebar ? 'grid-cols-1 lg:grid-cols-[1.4fr_0.8fr]' : 'grid-cols-1'))
      }`}>
        
        {/* Left Column: Pomodoro circular timer */}
        {(viewMode === 'split' || viewMode === 'timer') && (
          <div className={`border rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px] shadow-2xl backdrop-blur-xl transition duration-200 ${
            isDarkMode 
              ? 'bg-slate-900/50 border-slate-800/80 shadow-black/25' 
              : 'bg-white/80 border-gray-200 shadow-gray-250/20'
          }`}>
            {/* Glowing audio background waves when active */}
            {isActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25 z-0 select-none">
                <div className="w-64 h-64 rounded-full border border-indigo-500/20 dark:border-indigo-400/10 animate-ping" style={{ animationDuration: '3s' }}></div>
                <div className="absolute w-80 h-80 rounded-full border border-purple-500/20 dark:border-purple-400/10 animate-ping" style={{ animationDuration: '4.5s' }}></div>
              </div>
            )}

            <div className="z-10 flex flex-col items-center w-full">
              {/* Timer Mode Selection */}
              <div className={`p-1 rounded-2xl flex items-center gap-1.5 mb-6 border ${
                isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-100 border-gray-200'
              }`}>
                {Object.keys(modeSettings).map((m) => (
                  <button
                    key={m}
                    onClick={() => changeMode(m)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition-all duration-250 cursor-pointer ${
                      mode === m
                        ? (isDarkMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-indigo-650 shadow border border-gray-150')
                        : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
                    }`}
                  >
                    {modeSettings[m].title}
                  </button>
                ))}
              </div>

              {/* Circular SVG Timer */}
              <div className="relative w-56 h-56 flex items-center justify-center mb-6 drop-shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background Circle */}
                  <circle
                    cx="112"
                    cy="112"
                    r={radius}
                    className={`fill-none stroke-[8px] ${isDarkMode ? 'stroke-slate-800/80' : 'stroke-gray-100'}`}
                  />
                  {/* Animated Progress Circle */}
                  <circle
                    cx="112"
                    cy="112"
                    r={radius}
                    className="fill-none stroke-[8px] transition-all duration-1000 ease-linear"
                    stroke={modeSettings[mode].strokeColor}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {formatTime(timeLeft)}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-widest mt-2 px-2.5 py-0.5 rounded-full ${
                    isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                  } ${modeSettings[mode].color}`}>
                    {modeSettings[mode].title}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6 mb-6">
                <button
                  onClick={resetTimer}
                  className={`p-3 border rounded-full transition shadow-sm cursor-pointer hover:scale-105 active:scale-95 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-gray-300 hover:text-white hover:bg-slate-700' : 'bg-gray-50 border-gray-200 text-gray-650 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                
                <button
                  onClick={toggleTimer}
                  className="p-4.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                  title={isActive ? 'Pause' : 'Start'}
                >
                  {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Center Column: Smart Workstation Chrome-inspired Browser */}
        {(viewMode === 'split' || viewMode === 'copilot') && (
          <div className={`border rounded-3xl flex flex-col overflow-hidden min-h-[750px] shadow-2xl backdrop-blur-xl transition duration-200 ${
            isDarkMode 
              ? 'bg-slate-900/50 border-slate-800/80 shadow-black/25' 
              : 'bg-white/80 border-gray-200 shadow-gray-250/20'
          }`}>
            
            {/* Real embedded browser top tab bar */}
            <div className={`flex items-center justify-between px-4 pt-3 border-b select-none ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-gray-50/50 border-gray-150'
            }`}>
              {/* Dynamic tabs list */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full scrollbar-none">
                {browserTabs.map(tab => (
                  <div
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`group px-3.5 py-2.5 rounded-t-xl text-[11px] font-bold flex items-center gap-2 transition duration-150 cursor-pointer ${
                      activeTabId === tab.id
                        ? (isDarkMode ? 'bg-slate-900 border-t-2 border-indigo-500 text-white shadow-md' : 'bg-white border-t-2 border-indigo-600 text-indigo-750 shadow-md')
                        : (isDarkMode ? 'text-gray-450 hover:bg-slate-900/30 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800')
                    }`}
                  >
                    <span>{tab.title.length > 15 ? tab.title.substring(0, 15) + '…' : tab.title}</span>
                    {browserTabs.length > 1 && (
                      <X
                        onClick={(e) => closeTab(tab.id, e)}
                        className="w-3 h-3 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-500/10 p-0.5 opacity-60 hover:opacity-100 transition"
                      />
                    )}
                  </div>
                ))}
                
                {/* Add new tab button */}
                <button
                  onClick={() => createNewTab('Welcome Hub', 'welcome')}
                  className={`p-1.5 rounded-lg hover:scale-105 active:scale-95 transition cursor-pointer ${
                    isDarkMode ? 'bg-slate-900/60 border border-slate-800 text-gray-400 hover:text-white' : 'bg-white border border-gray-200 text-gray-550 hover:text-gray-800'
                  }`}
                  title="Open New Tab"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[9px] font-black tracking-widest text-slate-500 uppercase bg-slate-900/40 dark:bg-slate-950/40 border border-slate-800/40 px-2 py-0.5 rounded-md hidden md:block">
                Smart Workstation Workspace
              </div>
            </div>

            {/* Embedded browser controls (Back, Forward, Refresh, Search input, dock apps) */}
            <div className={`p-3 border-b flex flex-col md:flex-row items-center gap-3 select-none ${
              isDarkMode ? 'bg-slate-900/20 border-slate-800/80' : 'bg-white/60 border-gray-150'
            }`}>
              
              {/* Navigation controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateTab('back')}
                  disabled={activeTab.historyIndex === 0}
                  className={`p-2 rounded-xl transition cursor-pointer hover:bg-slate-500/10 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed`}
                  title="Back"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateTab('forward')}
                  disabled={activeTab.historyIndex === activeTab.history.length - 1}
                  className={`p-2 rounded-xl transition cursor-pointer hover:bg-slate-500/10 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed`}
                  title="Forward"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateActiveTabUrl(activeUrl)}
                  className="p-2 rounded-xl transition cursor-pointer hover:bg-slate-500/10 text-gray-400"
                  title="Reload Tab"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Unified Browser URL/Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!inputUrl.trim()) return;
                  
                  const cleanVal = inputUrl.trim();
                  // Check if it's a command prefix
                  if (cleanVal.toLowerCase().startsWith('youtube ')) {
                    const ytQuery = cleanVal.substring(8).trim();
                    updateActiveTabUrl('youtube');
                    setYoutubeSearchQuery(ytQuery);
                    handleYoutubeStationSearch(null, ytQuery);
                  } else if (cleanVal.toLowerCase().startsWith('chatgpt ')) {
                    const cPrompt = cleanVal.substring(8).trim();
                    updateActiveTabUrl('chatgpt');
                    if (cPrompt) handleChatgptSubmit(null, cPrompt);
                  } else if (cleanVal.toLowerCase() === 'chatgpt' || cleanVal.toLowerCase() === 'chat gpt') {
                    updateActiveTabUrl('chatgpt');
                  } else if (cleanVal.toLowerCase() === 'youtube') {
                    updateActiveTabUrl('youtube');
                  } else if (cleanVal.toLowerCase() === 'spotify') {
                    updateActiveTabUrl('spotify');
                  } else {
                    // Standard URL loading
                    let formatted = cleanVal;
                    if (!formatted.includes('.') && !formatted.startsWith('http')) {
                      // Fallback to DuckDuckGo Search URL inside iframe!
                      formatted = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanVal)}`;
                    } else if (!/^https?:\/\//i.test(formatted)) {
                      formatted = 'https://' + formatted;
                    }
                    updateActiveTabUrl(formatted);
                  }
                }}
                className="flex-1 w-full flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter website URL (e.g. devdocs.io), search topics, or prefix 'chatgpt ...' / 'youtube ...'"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' 
                        : 'bg-white border-gray-250 text-slate-800 placeholder-slate-400'
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  Go
                </button>
              </form>

              {/* Dynamic Quick Launch App Dock */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'welcome', label: '🏠 Hub' },
                  { key: 'chatgpt', label: '🤖 ChatGPT' },
                  { key: 'youtube', label: '📺 YouTube' },
                  { key: 'https://classroom.sheryians.com/', label: '🎓 Sheryians' },
                ].map(app => (
                  <button
                    key={app.key}
                    onClick={() => updateActiveTabUrl(app.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition duration-150 cursor-pointer ${
                      activeUrl === app.key
                        ? (isDarkMode ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-indigo-50 border-indigo-200 text-indigo-700 font-black')
                        : (isDarkMode ? 'bg-slate-950/40 border-slate-850 text-gray-400 hover:text-white hover:bg-slate-900/60' : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                    }`}
                  >
                    {app.label}
                  </button>
                ))}
              </div>

            </div>

            {/* Embedded Active Browser Tab Viewport */}
            <div className="flex-1 flex flex-col p-4 min-h-[620px] bg-slate-950/10">
              
              {/* Tab 1: Welcome Hub */}
              {activeUrl === 'welcome' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 min-h-[350px] gap-6 animate-fade-in select-none">
                  <div>
                    <span className="text-4xl animate-bounce inline-block mb-3">🚀</span>
                    <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Smart Workstation Console</h3>
                    <p className={`text-xs mt-1.5 max-w-md mx-auto leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Your high-productivity immersion workspace. Search study topics to generate custom AI study guides, YouTube playlists, and Spotify focus music streams simultaneously, or browse inline documentation!
                    </p>
                  </div>

                  {/* Motivational Quote Card */}
                  <div className={`border px-6 py-4 rounded-2xl max-w-md shadow-sm relative w-full ${
                    isDarkMode ? 'bg-indigo-950/20 border-indigo-900/35' : 'bg-indigo-50/50 border-indigo-100'
                  }`}>
                    <span className="absolute -top-3 left-4 text-[9px] font-bold px-2.5 py-0.5 bg-indigo-600 text-white rounded-full uppercase tracking-wider shadow">
                      Motivation
                    </span>
                    <p className={`text-xs italic font-semibold leading-relaxed pt-1 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-900'}`}>
                      "{currentQuote}"
                    </p>
                    <button 
                      onClick={getRandomQuote}
                      className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mt-3 flex items-center gap-1 mx-auto transition cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Change Quote
                    </button>
                  </div>

                  {/* Active Break Hub Utilities */}
                  <div className={`w-full max-w-md border-t pt-4 ${isDarkMode ? 'border-slate-800/80' : 'border-gray-150'}`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Breaking Zones</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={launchInstagramBreak}
                        className="p-3 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 hover:opacity-90 text-white rounded-xl shadow-md transition flex items-center justify-between group active:scale-95 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📸</span>
                          <div className="text-left">
                            <p className="text-xs font-black">Instagram Mobile</p>
                            <p className="text-[8px] text-white/80">Embedded breaker view</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
                      </button>

                      <button
                        onClick={launchSpotifyBreak}
                        className="p-3 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl shadow-md transition flex items-center justify-between group active:scale-95 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎵</span>
                          <div className="text-left">
                            <p className="text-xs font-black">Browse Spotify</p>
                            <p className="text-[8px] text-white/80">Full web client zone</p>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Custom ChatGPT console inline */}
              {activeUrl === 'chatgpt' && (
                <div className="flex-1 flex flex-col gap-3 h-full min-h-[350px] bg-slate-950/95 border border-slate-850 rounded-2xl p-4 shadow-xl text-slate-100 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-600/90 text-white rounded uppercase tracking-wider animate-pulse flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> Integrated GPT</span>
                      <h4 className="text-xs font-bold text-white tracking-wide">ChatGPT Study Assistant</h4>
                    </div>
                    <button 
                      onClick={() => setChatgptHistory([{ role: 'assistant', text: "Chat history cleared. How can I help you learn today?" }])}
                      className="text-[9px] font-bold text-gray-500 hover:text-red-400 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-[0.35fr_1fr] gap-4 overflow-hidden min-h-[220px]">
                    <div className="hidden md:flex flex-col gap-2 border-r border-slate-900 pr-3">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">quick prompts</p>
                      <button 
                        onClick={() => { setChatgptInput("Explain variables let and const in JavaScript with examples."); }}
                        className="text-[9px] text-left p-2 rounded-lg bg-slate-900 border border-slate-800 text-gray-400 hover:text-white hover:bg-slate-850 hover:border-slate-750 transition leading-snug cursor-pointer"
                      >
                        💡 JavaScript basics
                      </button>
                      <button 
                        onClick={() => { setChatgptInput("Explain React hooks and write a quick counter example using useState."); }}
                        className="text-[9px] text-left p-2 rounded-lg bg-slate-900 border border-slate-800 text-gray-400 hover:text-white hover:bg-slate-850 hover:border-slate-750 transition leading-snug cursor-pointer"
                      >
                        ⚛️ React hooks
                      </button>
                      <button 
                        onClick={() => { setChatgptInput("Create a study checklist for learning Python backend with Django REST framework."); }}
                        className="text-[9px] text-left p-2 rounded-lg bg-slate-900 border border-slate-800 text-gray-400 hover:text-white hover:bg-slate-850 hover:border-slate-750 transition leading-snug cursor-pointer"
                      >
                        🐍 Django checklist
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[260px] pr-1 leading-relaxed select-text">
                      {chatgptHistory.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-start gap-2.5 p-3 rounded-xl border max-w-[85%] ${
                            msg.role === 'user'
                              ? 'bg-indigo-650/10 border-indigo-500/20 text-white self-end ml-auto'
                              : 'bg-slate-900/60 border-slate-850 text-gray-200 self-start mr-auto'
                          }`}
                        >
                          <div className="text-[9px] font-black text-slate-400 select-none mt-0.5">{msg.role === 'user' ? '👤' : '🤖'}</div>
                          <div className="text-xs space-y-1 flex-1">
                            {msg.text.split('\n').map((line, lIdx) => {
                              const t = line.trim();
                              if (t.startsWith('```')) return null;
                              if (t.startsWith('###')) return <h5 key={lIdx} className="font-bold text-white mt-3 text-xs border-b border-slate-800 pb-0.5">{t.replace(/^###\s*/, '')}</h5>;
                              if (t.startsWith('-') || t.startsWith('*')) return <li key={lIdx} className="list-disc ml-4 text-gray-300">{t.substring(1).trim()}</li>;
                              return <p key={lIdx} className="text-gray-300">{t}</p>;
                            })}
                          </div>
                        </div>
                      ))}
                      {chatgptLoading && (
                        <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-850 p-3 rounded-xl self-start max-w-[80%]">
                          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-emerald-500"></div>
                          <span className="text-[10px] text-slate-500 animate-pulse font-bold">Thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleChatgptSubmit} className="flex gap-2 border-t border-slate-900 pt-3 select-none">
                    <input 
                      type="text" 
                      placeholder="Ask ChatGPT anything..." 
                      value={chatgptInput} 
                      onChange={(e) => setChatgptInput(e.target.value)} 
                      disabled={chatgptLoading}
                      className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-650 disabled:opacity-50"
                    />
                    <button type="submit" disabled={chatgptLoading || !chatgptInput.trim()} className="px-4.5 py-2 bg-emerald-650 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer">Send</button>
                  </form>
                </div>
              )}

              {/* Tab 3: Custom YouTube Search deck inline */}
              {activeUrl === 'youtube' && (
                <div className="flex-1 flex flex-col gap-3 h-full min-h-[350px] bg-slate-950/95 border border-slate-850 rounded-2xl p-4 shadow-xl text-slate-100 animate-fade-in">
                  <form onSubmit={handleYoutubeStationSearch} className="flex gap-2 select-none">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search educational lectures or focus music on YouTube..."
                        value={youtubeSearchQuery}
                        onChange={(e) => setYoutubeSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-slate-600"
                      />
                    </div>
                    <button type="submit" className="px-4.5 py-2 bg-red-600 hover:bg-red-750 text-white font-bold rounded-xl text-xs transition cursor-pointer">Search</button>
                    {hideYoutubeSidebar && (
                      <button
                        type="button"
                        onClick={() => setHideYoutubeSidebar(false)}
                        className="px-4 py-2 bg-slate-900 border border-slate-800 text-indigo-400 hover:text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm select-none"
                        title="Show Recommended Videos"
                      >
                        <span>☰</span> <span>Show Videos</span>
                      </button>
                    )}
                  </form>

                  <div className={`flex-1 grid grid-cols-1 gap-4 overflow-hidden min-h-[260px] ${
                    hideYoutubeSidebar ? 'lg:grid-cols-1' : 'lg:grid-cols-[1.4fr_0.8fr]'
                  }`}>
                    <div className="bg-black border border-slate-850 rounded-xl overflow-hidden shadow-inner h-full min-h-[220px]">
                      <iframe
                        width="100%"
                        height="100%"
                        src={youtubeVideoId.startsWith('http') ? youtubeVideoId : (youtubeVideoId.startsWith('?') ? `https://www.youtube.com/embed${youtubeVideoId}` : `https://www.youtube.com/embed/${youtubeVideoId}`)}
                        title="Workstation YouTube Station"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full pointer-events-auto"
                      />
                    </div>

                    {!hideYoutubeSidebar && (
                      <div className="flex flex-col gap-2 overflow-y-auto max-h-[260px] pr-1 select-none text-[10px]">
                        <div className="flex items-center justify-between mb-1 flex-shrink-0">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Recommended Videos</p>
                          <button
                            type="button"
                            onClick={() => setHideYoutubeSidebar(true)}
                            className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1 select-none"
                            title="Collapse Sidebar"
                          >
                            Hide ✕
                          </button>
                        </div>
                        {youtubeSearchLoading ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-10">
                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-500"></div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {youtubeSearchResults.map((video, idx) => (
                              <button
                                key={idx}
                                onClick={() => setYoutubeVideoId(video.videoId)}
                                className={`flex flex-col p-2.5 rounded-lg text-left transition border ${
                                  youtubeVideoId === video.videoId ? 'bg-red-650/15 border-red-500/30 text-white font-bold' : 'bg-slate-900 border-slate-850 text-gray-400 hover:bg-slate-800'
                                }`}
                              >
                                <span className="truncate">{video.title}</span>
                                <span className="text-[8px] text-slate-500 mt-1 uppercase">Channel: {video.channel}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Spotify focus player */}
              {activeUrl === 'spotify' && (
                <div className="flex-1 flex flex-col gap-3 h-full min-h-[350px] bg-slate-950/95 border border-slate-850 rounded-2xl p-4 shadow-xl text-slate-100 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-xs font-bold text-green-400 flex items-center gap-2"><Music className="w-4 h-4 animate-pulse" /> Spotify Playlist Player</span>
                  </div>

                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-4 overflow-hidden min-h-[260px]">
                    <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden shadow-inner h-full min-h-[220px]">
                      <iframe
                        src={spotifyEmbedUrl}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        allowtransparency="true"
                        allow="encrypted-media; clipboard-write"
                        className="h-full w-full pointer-events-auto"
                      />
                    </div>

                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[260px] pr-1 select-none text-[10px]">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-black">Focus Playlists</p>
                      <div className="flex flex-col gap-2">
                        {(spotifySearchResults.length > 0 ? spotifySearchResults : [
                          { title: "Lofi Beats Station", description: "Chill focus streams", playlistId: "37i9dQZF1DWWQRwui0ExPn" },
                          { title: "Deep Focus", description: "Ambient concentration", playlistId: "37i9dQZF1DWZeKFB6uYLUN" },
                          { title: "Coding Mode", description: "Electronic focus beats", playlistId: "37i9dQZF1DX5trt9i14X7j" }
                        ]).map((pl, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSpotifyEmbedUrl(`https://open.spotify.com/embed/playlist/${pl.playlistId}`)}
                            className={`flex flex-col p-2.5 rounded-lg text-left transition border ${
                              spotifyEmbedUrl.includes(pl.playlistId) ? 'bg-green-600/10 border-green-500/30 text-green-400 font-bold' : 'bg-slate-900 border-slate-850 text-gray-400 hover:bg-slate-800'
                            }`}
                          >
                            <span>{pl.title}</span>
                            <span className="text-[8px] text-slate-500 mt-1 uppercase">{pl.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Secure sandbox browser tab (for custom URLs: Wikipedia, DevDocs, etc.) */}
              {activeUrl !== 'welcome' && activeUrl !== 'chatgpt' && activeUrl !== 'youtube' && activeUrl !== 'spotify' && (
                <div className="flex-1 flex flex-col gap-3 min-h-[580px] animate-fade-in">
                  <div className={`flex items-center justify-between border rounded-xl p-2 text-[10px] shadow-sm leading-relaxed ${
                    isDarkMode ? 'bg-slate-950 border-slate-850 text-gray-400' : 'bg-slate-50 border-gray-200 text-gray-600'
                  }`}>
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-indigo-500 animate-spin" style={{ animationDuration: '8s' }} />
                      <span className="truncate font-semibold text-slate-700 dark:text-slate-350">Browsing URL: <span className="underline text-indigo-600 dark:text-indigo-400">{activeUrl}</span></span>
                    </div>
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg font-bold transition shadow-sm select-none"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> Launch website
                    </a>
                  </div>

                  <div className="flex-1 border rounded-2xl overflow-hidden shadow-inner bg-slate-950 h-[550px] min-h-[500px] flex flex-col">
                    <iframe
                      src={activeUrl}
                      title="Workstation sandboxed browser"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      className="bg-white pointer-events-auto flex-1 w-full"
                      style={{ minHeight: '500px', height: '500px' }}
                      allow="fullscreen; autoplay; encrypted-media"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* Right Column: Daily Focus Checklist (Tasks list merged) */}
        {showTasksSidebar && (
          <div className={`border rounded-3xl p-6 h-full min-h-[500px] shadow-2xl backdrop-blur-xl transition duration-200 flex flex-col ${
            isDarkMode 
              ? 'bg-slate-900/50 border-slate-800/80 shadow-black/25' 
              : 'bg-white/80 border-gray-200 shadow-gray-250/20'
          }`}>
            <div className="mb-4.5 flex items-center justify-between select-none">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-650'}`}>
                  <Target className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">Focus Sanctuary Tasks</h3>
                  <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Keep track of your goals</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setShowTasksSidebar(false)}
                className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-slate-500/10 active:scale-95 cursor-pointer flex items-center justify-center"
                title="Hide Tasks Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          {/* Task completion progress bar */}
          <div className={`p-3 rounded-2xl border mb-5 select-none ${isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-gray-50 border-gray-150'}`}>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
              <span className="text-gray-455">Task Progress</span>
              <span className="text-indigo-400">{completedTasksCount} / {totalTasksCount} completed ({completionPercentage}%)</span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-gray-250'}`}>
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 shadow-inner"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Quick Add Task Form */}
          <form onSubmit={addLocalTask} className={`p-3 rounded-2xl border mb-5 flex flex-col gap-2.5 select-none ${isDarkMode ? 'bg-slate-950/20 border-slate-850' : 'bg-gray-50/50 border-gray-150'}`}>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Quick Capture Task</p>
            <input
              type="text"
              placeholder="What task are we locking into today?..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className={`px-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-gray-200 text-slate-800 placeholder-slate-400'
              }`}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className={`px-2 py-1.5 text-[10px] rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-gray-200 text-slate-800'
                }`}
              >
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟠 Medium Priority</option>
                <option value="low">🔵 Low Priority</option>
              </select>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className={`px-2 py-1.5 text-[10px] rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-gray-200 text-slate-800'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="w-full py-1.5 bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 shadow-sm flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Capture Task
            </button>
          </form>

          {/* Interactive Checkbox checklist */}
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[280px] pr-1 leading-relaxed">
            {allTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-800/80 rounded-2xl">
                <Award className="w-9 h-9 text-slate-650 mb-3 animate-pulse" />
                <p className="text-xs font-extrabold text-gray-500 dark:text-gray-400">No active workstation goals!</p>
                <p className="text-[9px] text-gray-450 dark:text-gray-500 mt-1 max-w-[180px]">Add tasks via quick-capture or your main milestones dashboard.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allTasks.map((task) => {
                  const isCompleted = task.status === 'completed';
                  const priorityColor = 
                    task.priority === 'high' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                    task.priority === 'medium' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                    'border-blue-500/30 bg-blue-500/10 text-blue-400';
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`p-3 border rounded-xl flex items-center justify-between gap-3 transition duration-200 hover:scale-[1.01] ${
                        isCompleted 
                          ? (isDarkMode ? 'bg-slate-900/30 border-slate-850/50 opacity-60' : 'bg-gray-50 border-gray-150 opacity-60')
                          : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200')
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task)}
                          className={`w-4 h-4 rounded-md border flex items-center justify-center cursor-pointer transition flex-shrink-0 ${
                            isCompleted 
                              ? 'bg-indigo-650 border-indigo-500 text-white' 
                              : (isDarkMode ? 'border-slate-700 hover:border-slate-500' : 'border-gray-300 hover:border-gray-400')
                          }`}
                        >
                          {isCompleted && <span className="text-[10px] font-bold">✓</span>}
                        </button>
                        
                        <div className="min-w-0 flex flex-col flex-1">
                          <span className={`text-xs font-bold truncate ${isCompleted ? 'line-through text-gray-500' : (isDarkMode ? 'text-white' : 'text-slate-800')}`}>
                            {task.title}
                          </span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${priorityColor}`}>
                              {task.priority}
                            </span>
                            {task.due_date && (
                              <span className="text-[8px] text-gray-400 font-semibold">
                                📅 {task.due_date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Delete button for local tasks */}
                      {task.id.toString().startsWith('local_') && (
                        <button
                          type="button"
                          onClick={() => setLocalTasks(prev => prev.filter(t => t.id !== task.id))}
                          className="text-gray-500 hover:text-red-500 transition p-1 cursor-pointer flex-shrink-0 animate-fade-in"
                          title="Delete Task"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
        )}

      </div>
    </div>
  );
};

export default FocusSanctuary;
