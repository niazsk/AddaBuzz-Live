import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, User, Search, Flame, MapPin, Sparkles, Trophy, MessageCircle, 
  Heart, Share2, Gift, Send, X, ChevronLeft, Settings, Shield, Bell, 
  Compass, Radio, Camera, Star, Check, Award, Lock, Mail, Key, PhoneCall,
  Smile, MoreVertical, FlameIcon, Zap, Crown, Users, Play, LogOut
} from 'lucide-react';

export default function AddaBuzzLiveApp() {
  // Navigation & Screen State
  // Screens: 'splash', 'signin', 'home', 'live', 'leaderboard', 'messages', 'profile'
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [homeTab, setHomeTab] = useState('Feature'); // Feature, Nearby, Newest
  const [leaderboardTab, setLeaderboardTab] = useState('Daily'); // Daily, Weekly, Monthly, Totally
  const [selectedStreamer, setSelectedStreamer] = useState(null);

  // Modals inside Live Stream
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(null); // User object or null

  // Interactive Live Stream States
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: 'Andrew', text: 'Do you love Facebook?' },
    { id: 2, user: 'Stella', text: 'Thanks for sharing this live stream! ❤️' },
    { id: 3, user: 'James', text: 'Liked this live stream' },
    { id: 4, user: 'Karim', text: 'Amazing stream! Hello from Bangladesh.' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [diamonds, setDiamonds] = useState(1520);
  const [isFollowing, setIsFollowing] = useState(false);

  // Splash Screen timer redirect to signin/home
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('signin');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // Handle floating hearts animation generator
  const triggerHeart = () => {
    const id = Date.now() + Math.random();
    const colors = ['#ec4899', '#8b5cf6', '#f43f5e', '#a855f7', '#fb7185'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const newHeart = { id, color, left: Math.random() * 80 + 10 };
    setFloatingHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 2000);
  };

  // Mock streamers data
  const streamers = [
    {
      id: 1,
      name: 'Stella Malone',
      idNum: 'ID: 34983532',
      viewers: '55.4K',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
      category: 'Feature',
      bio: 'I enjoy meeting new people and finding ways to help them have an uplifting experience...',
      level: 38,
      likes: '128.4K'
    },
    {
      id: 2,
      name: 'Natalie Caldwell',
      idNum: 'ID: 42383213',
      viewers: '12.8K',
      image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
      category: 'Feature',
      bio: 'Music lover & late night chatter! Come hang out.',
      level: 25,
      likes: '45.1K'
    },
    {
      id: 3,
      name: 'Lola Bailey',
      idNum: 'ID: 34983932',
      viewers: '34.2K',
      image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800',
      category: 'Nearby',
      bio: 'Coffee addict ☕ Dancer 💃 Live every evening!',
      level: 42,
      likes: '96.3K'
    },
    {
      id: 4,
      name: 'Dollie Holmes',
      idNum: 'ID: 64983324',
      viewers: '8.9K',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800',
      category: 'Nearby',
      bio: 'Fashion designer & gaming enthusiast.',
      level: 19,
      likes: '22.8K'
    },
    {
      id: 5,
      name: 'Henrietta Walker',
      idNum: 'ID: 73746319',
      viewers: '19.5K',
      image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=800',
      category: 'Newest',
      bio: 'Just started streaming! Say hi 👋',
      level: 12,
      likes: '10.5K'
    },
    {
      id: 6,
      name: 'Georgia Walters',
      idNum: 'ID: 34983844',
      viewers: '41.1K',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      category: 'Newest',
      bio: 'Travel vlogger currently exploring Asia.',
      level: 31,
      likes: '77.2K'
    }
  ];

  // Leaderboard data
  const leaders = [
    { rank: 1, name: 'Myrtle Clarke', id: '1063294', coins: '1063294', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', crown: 'gold' },
    { rank: 2, name: 'Betty Vega', id: '1283294', coins: '1283294', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200', crown: 'silver' },
    { rank: 3, name: 'Ida Palmer', id: '10283294', coins: '10283294', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200', crown: 'bronze' },
    { rank: 4, name: 'Johnny Rios', id: '34983294', coins: '963294', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
    { rank: 5, name: 'Alfred Hodges', id: '42383213', coins: '942983', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
    { rank: 6, name: 'Jayden Hansen', id: '34983932', coins: '894783', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200' },
    { rank: 7, name: 'Dora Hines', id: '64983324', coins: '832473', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' },
  ];

  // Gifts catalog
  const giftItems = [
    { name: 'Red Rose', price: 19, icon: '🌹' },
    { name: 'Love Heart', price: 99, icon: '💝' },
    { name: 'Romantic Balloons', price: 199, icon: '🎈' },
    { name: 'Birthday Cake', price: 299, icon: '🎂' },
    { name: 'Gift Box', price: 520, icon: '🎁' },
    { name: 'Flower Bouquet', price: 999, icon: '💐' },
    { name: 'Cute Puppy', price: 1314, icon: '🐶' },
    { name: 'Golden Ring', price: 5200, icon: '💍' },
  ];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    setChatMessages(prev => [...prev, { id: Date.now(), user: 'You', text: inputMessage }]);
    setInputMessage('');
  };

  const sendGift = (gift) => {
    if (diamonds < gift.price) {
      alert('Not enough diamonds! Top up your wallet.');
      return;
    }
    setDiamonds(prev => prev - gift.price);
    setChatMessages(prev => [...prev, { id: Date.now(), user: 'You', text: `sent a ${gift.name} ${gift.icon}` }]);
    setShowGiftModal(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-950 font-sans text-white p-2 sm:p-4 select-none">
      {/* Mobile Frame Mockup Container */}
      <div className="relative w-full max-w-[412px] h-[847px] bg-[#121212] rounded-[40px] shadow-[0_0_50px_rgba(138,43,226,0.3)] border-[8px] border-gray-900 overflow-hidden flex flex-col">
        
        {/* Notch / Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-9 bg-black/40 backdrop-blur-md z-50 flex justify-between items-center px-6 text-xs font-semibold text-white/90 pointer-events-none">
          <span>9:41</span>
          <div className="w-20 h-4 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-1.5"></div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3.5 h-2.5 border border-white/80 rounded-sm flex items-center p-0.5">
              <div className="w-full h-full bg-white rounded-2xs"></div>
            </div>
            <span className="text-[10px]">5G</span>
          </div>
        </div>

        {/* ================= SCREEN 1: SPLASH SCREEN ================= */}
        {currentScreen === 'splash' && (
          <div className="flex-1 bg-gradient-to-br from-[#121212] via-[#2A0845] to-[#121212] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-purple-600/30 rounded-full blur-xl animate-pulse"></div>
              <div className="relative w-24 h-24 bg-gradient-to-tr from-[#8A2BE2] to-[#da70d6] rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-6 transition-transform">
                <Video className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-white bg-clip-text text-transparent">
              ADDABUZZ LIVE
            </h1>
            <p className="text-sm text-purple-300/70 mt-2 font-medium">Connect, Stream & Shine Together</p>
          </div>
        )}

        {/* ================= SCREEN 2: SIGN IN SCREEN ================= */}
        {currentScreen === 'signin' && (
          <div className="flex-1 bg-gradient-to-b from-[#250837] via-[#121212] to-[#121212] flex flex-col justify-between pt-16 pb-8 px-6">
            <div className="flex flex-col items-center mt-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Sign in</h2>
              <p className="text-xs text-gray-400 mt-1">Welcome back to AddaBuzz Live</p>
            </div>

            <div className="space-y-4 my-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-purple-300 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                  <input 
                    type="email" 
                    defaultValue="support@addabuzz.com"
                    className="w-full bg-[#1c1624] border border-purple-900/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-purple-300 ml-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                  <input 
                    type="password" 
                    defaultValue="••••••••"
                    className="w-full bg-[#1c1624] border border-purple-900/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <div className="text-right">
                <button className="text-xs text-purple-400 hover:underline">Forgot your password?</button>
              </div>

              <button 
                onClick={() => setCurrentScreen('home')}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-sm shadow-lg shadow-purple-600/30 hover:opacity-95 transition-opacity active:scale-[0.98]"
              >
                SIGN IN
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-gray-400">Don't have an account? </span>
                <button onClick={() => setCurrentScreen('home')} className="text-xs font-bold text-purple-400 hover:underline">Sign up</button>
              </div>
            </div>

            {/* Social Logins */}
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition-transform" onClick={() => setCurrentScreen('home')}>
                  <span className="font-bold text-lg text-white">f</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-sky-400 flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition-transform" onClick={() => setCurrentScreen('home')}>
                  <span className="font-bold text-sm text-white">t</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition-transform" onClick={() => setCurrentScreen('home')}>
                  <span className="font-bold text-sm text-white">G+</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SCREEN 3: HOME / DISCOVER SCREEN ================= */}
        {currentScreen === 'home' && (
          <div className="flex-1 bg-[#121212] flex flex-col pt-12 pb-16 overflow-y-auto">
            {/* Top Navigation Bar */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-purple-950">
              <div className="flex space-x-6 text-sm font-semibold">
                {['Feature', 'Nearby', 'Newest'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setHomeTab(tab)}
                    className={`relative pb-1 transition-colors ${homeTab === tab ? 'text-purple-400 font-bold' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    {tab}
                    {homeTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></span>
                    )}
                  </button>
                ))}
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-800/40 flex items-center justify-center text-purple-300 cursor-pointer hover:bg-purple-900/50">
                <Search className="w-4 h-4" />
              </div>
            </div>

            {/* Sub banner / view all header */}
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">Trending Now 🔥</span>
              <span className="text-xs font-semibold text-purple-400 cursor-pointer">View all &gt;</span>
            </div>

            {/* Broadcaster Grid */}
            <div className="px-3 grid grid-cols-2 gap-3 pb-6">
              {streamers
                .filter(s => homeTab === 'Feature' || s.category === homeTab || homeTab === 'Newest')
                .map((streamer) => (
                  <div 
                    key={streamer.id}
                    onClick={() => {
                      setSelectedStreamer(streamer);
                      setCurrentScreen('live');
                    }}
                    className="relative h-56 rounded-2xl overflow-hidden bg-gray-900 shadow-md cursor-pointer group border border-purple-950 hover:border-purple-600/50 transition-all"
                  >
                    <img 
                      src={streamer.image} 
                      alt={streamer.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center">
                      <span className="px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-medium text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        LIVE
                      </span>
                      <span className="px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-semibold text-white/90 flex items-center gap-1">
                        <Users className="w-3 h-3 text-pink-400" />
                        {streamer.viewers}
                      </span>
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                      <h4 className="text-xs font-bold text-white truncate">{streamer.name}</h4>
                      <p className="text-[10px] text-purple-300 truncate">{streamer.idNum}</p>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SCREEN 4: LIVE STREAM / ROOM SCREEN ================= */}
        {currentScreen === 'live' && selectedStreamer && (
          <div className="flex-1 relative overflow-hidden bg-black flex flex-col justify-between">
            {/* Background Streamer Video / Image */}
            <div className="absolute inset-0 z-0">
              <img 
                src={selectedStreamer.image} 
                alt={selectedStreamer.name} 
                className="w-full h-full object-cover filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90"></div>
            </div>

            {/* Floating Hearts Animation Container */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {floatingHearts.map(heart => (
                <div 
                  key={heart.id}
                  className="absolute bottom-20 animate-float-up text-2xl"
                  style={{ left: `${heart.left}%`, color: heart.color }}
                >
                  ❤️
                </div>
              ))}
            </div>

            {/* Live Stream Top Header Info */}
            <div className="relative z-30 pt-12 px-3 flex items-center justify-between">
              {/* Streamer Profile Pill */}
              <div 
                onClick={() => setShowProfileCard(selectedStreamer)}
                className="bg-black/40 backdrop-blur-md rounded-full p-1 pr-3 flex items-center space-x-2 border border-white/10 cursor-pointer"
              >
                <img src={selectedStreamer.image} alt="" className="w-8 h-8 rounded-full object-cover border border-purple-500" />
                <div className="leading-tight">
                  <h4 className="text-xs font-bold text-white truncate max-w-[100px]">{selectedStreamer.name}</h4>
                  <span className="text-[10px] text-amber-400 font-medium">🔥 {selectedStreamer.viewers}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFollowing(!isFollowing);
                  }} 
                  className={`ml-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isFollowing ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}
                >
                  {isFollowing ? '✓' : '+'}
                </button>
              </div>

              {/* Top Right Actions (Co-hosts / Close) */}
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2 overflow-hidden">
                  <img className="inline-block h-7 w-7 rounded-full ring-2 ring-purple-600 object-cover" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200" alt="" />
                  <img className="inline-block h-7 w-7 rounded-full ring-2 ring-pink-600 object-cover" src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200" alt="" />
                </div>
                <button 
                  onClick={() => setCurrentScreen('home')}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-black/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Middle Chat & Floating Messages Area */}
            <div className="relative z-30 px-3 flex-1 flex flex-col justify-end pb-2 pointer-events-auto">
              {/* System message */}
              <div className="mb-2 bg-black/40 backdrop-blur-sm self-start rounded-xl px-3 py-1.5 text-[11px] text-purple-300 border border-purple-500/20">
                🔒 AddaBuzz Live Safety Reminder: Never share personal bank details or passwords.
              </div>

              {/* Chat Messages List */}
              <div className="max-h-48 overflow-y-auto space-y-2 pr-4 scrollbar-none mb-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="bg-black/40 backdrop-blur-md rounded-2xl px-3 py-1.5 text-xs inline-block max-w-[90%] shadow-sm">
                    <span className="font-bold text-purple-300 mr-2">{msg.user}:</span>
                    <span className="text-white/90">{msg.text}</span>
                  </div>
                ))}
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center space-x-2 pt-1">
                <form onSubmit={handleSendMessage} className="flex-1 relative">
                  <input 
                    type="text" 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Say something nice..."
                    className="w-full bg-black/50 backdrop-blur-md border border-white/20 rounded-full py-2.5 pl-4 pr-10 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                  <button type="submit" className="absolute right-2 top-2 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white">
                    <Send className="w-3 h-3" />
                  </button>
                </form>

                {/* Gift Button */}
                <button 
                  onClick={() => setShowGiftModal(true)}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
                >
                  🎁
                </button>

                {/* Share Button */}
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/70"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {/* Heart / Like Button */}
                <button 
                  onClick={triggerHeart}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                >
                  <Heart className="w-4 h-4 fill-white" />
                </button>
              </div>
            </div>

            {/* GIFT STORE MODAL */}
            {showGiftModal && (
              <div className="absolute inset-x-0 bottom-0 z-50 bg-[#1a1325]/95 backdrop-blur-xl rounded-t-[30px] border-t border-purple-800/50 p-5 animate-slide-up">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-purple-300">💎 Diamonds:</span>
                    <span className="text-sm font-extrabold text-amber-400">{diamonds}</span>
                  </div>
                  <button onClick={() => setShowGiftModal(false)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  {giftItems.map((gift, idx) => (
                    <div 
                      key={idx}
                      onClick={() => sendGift(gift)}
                      className="bg-purple-950/40 border border-purple-800/30 rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-900/40 transition-colors"
                    >
                      <span className="text-2xl mb-1">{gift.icon}</span>
                      <span className="text-[11px] font-bold text-white">{gift.name}</span>
                      <span className="text-[10px] text-amber-400 font-semibold mt-0.5">💎 {gift.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SHARE MODAL */}
            {showShareModal && (
              <div className="absolute inset-x-0 bottom-0 z-50 bg-[#1a1325]/95 backdrop-blur-xl rounded-t-[30px] border-t border-purple-800/50 p-5 animate-slide-up">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Share to Socials</h4>
                  <button onClick={() => setShowShareModal(false)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center pb-3">
                  <div className="flex flex-col items-center space-y-1.5 cursor-pointer" onClick={() => setShowShareModal(false)}>
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg text-white font-bold text-lg">f</div>
                    <span className="text-[11px] text-gray-300">Facebook</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1.5 cursor-pointer" onClick={() => setShowShareModal(false)}>
                    <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center shadow-lg text-white font-bold text-lg">💬</div>
                    <span className="text-[11px] text-gray-300">Messenger</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1.5 cursor-pointer" onClick={() => setShowShareModal(false)}>
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg text-white font-bold text-lg">📱</div>
                    <span className="text-[11px] text-gray-300">WhatsApp</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1.5 cursor-pointer" onClick={() => setShowShareModal(false)}>
                    <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-lg text-white font-bold text-lg">🔗</div>
                    <span className="text-[11px] text-gray-300">Copy Link</span>
                  </div>
                </div>
              </div>
            )}

            {/* PROFILE POPUP CARD */}
            {showProfileCard && (
              <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#1e152d] border border-purple-700/50 rounded-3xl w-full max-w-xs p-5 relative shadow-2xl animate-scale-up">
                  <button onClick={() => setShowProfileCard(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col items-center text-center">
                    <img src={showProfileCard.image} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-purple-500 shadow-md mb-3" />
                    <h3 className="text-base font-bold text-white">{showProfileCard.name}</h3>
                    <p className="text-xs text-purple-400 mt-0.5">{showProfileCard.idNum || 'ID: 34983532'}</p>
                    
                    <div className="w-full bg-purple-950/60 rounded-xl p-3 my-3 text-left">
                      <span className="text-[10px] font-bold text-purple-300 uppercase">Bio</span>
                      <p className="text-xs text-gray-300 mt-1">{showProfileCard.bio}</p>
                    </div>

                    <div className="flex space-x-3 w-full mt-2">
                      <button 
                        onClick={() => {
                          setIsFollowing(!isFollowing);
                          setShowProfileCard(null);
                        }}
                        className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-xs shadow-md"
                      >
                        {isFollowing ? 'Following' : '+ Follow'}
                      </button>
                      <button 
                        onClick={() => {
                          setShowProfileCard(null);
                          setCurrentScreen('messages');
                        }}
                        className="flex-1 py-2.5 bg-purple-900/60 border border-purple-700/50 rounded-xl font-bold text-xs text-purple-200"
                      >
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= SCREEN 5: LEADERBOARD SCREEN ================= */}
        {currentScreen === 'leaderboard' && (
          <div className="flex-1 bg-[#121212] flex flex-col pt-12 pb-16 overflow-y-auto">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-purple-950">
              <h3 className="text-sm font-bold text-white tracking-wide">Leaderboard</h3>
              <div className="flex space-x-3 text-xs font-semibold text-gray-400">
                {['Daily', 'Weekly', 'Monthly', 'Totally'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setLeaderboardTab(tab)}
                    className={`${leaderboardTab === tab ? 'text-purple-400 underline font-bold' : 'hover:text-white'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Top 3 Podiums */}
            <div className="px-4 py-6 bg-gradient-to-b from-[#250837]/50 to-transparent flex justify-around items-end">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm">🥈</span>
                  <img src={leaders[1].avatar} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-gray-300" />
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[80px]">{leaders[1].name}</span>
                <span className="text-[10px] text-amber-400">💎 {leaders[1].coins}</span>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center mb-4">
                <div className="relative mb-2">
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg animate-bounce">👑</span>
                  <img src={leaders[0].avatar} alt="" className="w-18 h-18 rounded-full object-cover border-2 border-amber-400 shadow-lg shadow-amber-400/20" />
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[90px]">{leaders[0].name}</span>
                <span className="text-[10px] text-amber-400">💎 {leaders[0].coins}</span>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm">🥉</span>
                  <img src={leaders[2].avatar} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-amber-600" />
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[80px]">{leaders[2].name}</span>
                <span className="text-[10px] text-amber-400">💎 {leaders[2].coins}</span>
              </div>
            </div>

            {/* Remaining Ranked List */}
            <div className="px-4 space-y-2 pb-6">
              {leaders.slice(3).map((leader) => (
                <div key={leader.rank} className="bg-purple-950/30 border border-purple-900/30 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-purple-400 w-4">{leader.rank}</span>
                    <img src={leader.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{leader.name}</h4>
                      <p className="text-[10px] text-purple-300">ID: {leader.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-amber-400 text-xs font-semibold">
                    <span>💎</span>
                    <span>{leader.coins}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SCREEN 6: MESSAGES SCREEN ================= */}
        {currentScreen === 'messages' && (
          <div className="flex-1 bg-[#121212] flex flex-col pt-12 pb-16 overflow-y-auto">
            <div className="px-4 py-3 border-b border-purple-950">
              <h3 className="text-sm font-bold text-white tracking-wide">Messages & Notifications</h3>
            </div>

            <div className="divide-y divide-purple-950/60">
              {[
                { name: 'System Notification', msg: 'Welcome to AddaBuzz Live! Complete your daily tasks.', time: '10m ago', icon: Bell },
                { name: 'Stella Malone', msg: 'Started a new live stream! Tap to join.', time: '1h ago', icon: Video },
                { name: 'Andrew', msg: 'Sent you a private message.', time: '3h ago', icon: MessageCircle },
                { name: 'Official Rewards', msg: 'You received 50 free diamonds for daily check-in.', time: '1d ago', icon: Sparkles }
              ].map((item, i) => (
                <div key={i} className="px-4 py-3.5 flex items-center space-x-3 hover:bg-purple-950/20 cursor-pointer transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                      <span className="text-[10px] text-gray-500">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SCREEN 7: PROFILE SCREEN ================= */}
        {currentScreen === 'profile' && (
          <div className="flex-1 bg-[#121212] flex flex-col pt-12 pb-16 overflow-y-auto">
            {/* Top Profile Banner */}
            <div className="px-4 py-6 bg-gradient-to-b from-purple-950/60 to-transparent flex flex-col items-center text-center">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300" 
                alt="" 
                className="w-20 h-20 rounded-full object-cover border-2 border-purple-500 shadow-xl mb-3"
              />
              <h3 className="text-base font-bold text-white">Alex Morgan</h3>
              <p className="text-xs text-purple-400 mt-0.5">ID: 88472910</p>

              {/* Stats */}
              <div className="flex space-x-6 mt-4 bg-black/40 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-purple-900/40">
                <div className="text-center">
                  <span className="block text-xs font-bold text-white">142</span>
                  <span className="text-[10px] text-gray-400">Following</span>
                </div>
                <div className="h-8 w-[1px] bg-purple-900"></div>
                <div className="text-center">
                  <span className="block text-xs font-bold text-white">1.8K</span>
                  <span className="text-[10px] text-gray-400">Followers</span>
                </div>
                <div className="h-8 w-[1px] bg-purple-900"></div>
                <div className="text-center">
                  <span className="block text-xs font-bold text-amber-400">💎 {diamonds}</span>
                  <span className="text-[10px] text-gray-400">Diamonds</span>
                </div>
              </div>
            </div>

            {/* Menu options */}
            <div className="px-4 space-y-2 mt-2">
              {[
                { title: 'My Broadcast History', icon: Video },
                { title: 'Wallet & Top Up', icon: Sparkles },
                { title: 'Level & VIP Privileges', icon: Trophy },
                { title: 'Settings & Security', icon: Settings },
                { title: 'Help & Feedback', icon: Mail },
              ].map((menu, i) => (
                <div key={i} className="bg-purple-950/30 border border-purple-900/30 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-purple-900/30 transition-colors">
                  <div className="flex items-center space-x-3">
                    <menu.icon className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-white">{menu.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">&gt;</span>
                </div>
              ))}

              <div 
                onClick={() => setCurrentScreen('signin')}
                className="bg-red-950/20 border border-red-900/30 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-red-900/20 transition-colors mt-4"
              >
                <div className="flex items-center space-x-3 text-red-400">
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs font-semibold">Log Out</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= BOTTOM NAVIGATION BAR ================= */}
        {currentScreen !== 'splash' && currentScreen !== 'signin' && currentScreen !== 'live' && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#161022]/95 backdrop-blur-xl border-t border-purple-900/50 flex justify-around items-center px-2 z-40">
            <button 
              onClick={() => setCurrentScreen('home')}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentScreen === 'home' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] font-medium">Home</span>
            </button>

            <button 
              onClick={() => {
                setSelectedStreamer(streamers[0]);
                setCurrentScreen('live');
              }}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentScreen === 'live' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Radio className="w-5 h-5" />
              <span className="text-[10px] font-medium">Live Cam</span>
            </button>

            <button 
              onClick={() => setCurrentScreen('leaderboard')}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentScreen === 'leaderboard' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Trophy className="w-5 h-5" />
              <span className="text-[10px] font-medium">Rankings</span>
            </button>

            <button 
              onClick={() => setCurrentScreen('messages')}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentScreen === 'messages' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-[10px] font-medium">Messages</span>
            </button>

            <button 
              onClick={() => setCurrentScreen('profile')}
              className={`flex flex-col items-center space-y-1 transition-colors ${currentScreen === 'profile' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-medium">Profile</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}