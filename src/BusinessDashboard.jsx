import React, { useState, useEffect } from 'react';
import { Users, Clock, Bell, CheckCircle, XCircle, TrendingUp, BarChart3, LogOut, Eye, EyeOff, Upload, Image, AlertCircle, X } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

const BusinessDashboard = () => {
  const [user, setUser] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({
    todayServed: 0,
    weekServed: 0,
    avgRating: 0,
    noShowRate: 0,
    actualAvgWaitTime: 0
  });
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [autoCalculateWaitTime, setAutoCalculateWaitTime] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // In-app notification system
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setBusinessData(null);
        setQueue([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'businesses'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const business = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        };
        setBusinessData(business);
        setAutoCalculateWaitTime(business.autoCalculateWaitTime || false);
      }
    }, (error) => {
      console.error('Error fetching business:', error);
      showNotification('Error loading business data', 'error');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!businessData) return;

    const q = query(
      collection(db, 'queue_entries'),
      where('businessId', '==', businessData.id),
      where('status', 'in', ['waiting', 'ready'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const queueData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          if (!a.joinedAt || !b.joinedAt) return 0;
          return a.joinedAt.seconds - b.joinedAt.seconds;
        })
        .map((entry, index) => ({
          ...entry,
          position: index + 1
        }));
      
      setQueue(queueData);
      
      queueData.forEach((entry, index) => {
        const newPosition = index + 1;
        const newEstimatedWait = newPosition * (businessData.avgWaitTime || 15);
        
        if (entry.position !== newPosition || entry.estimatedWait !== newEstimatedWait) {
          updateDoc(doc(db, 'queue_entries', entry.id), {
            position: newPosition,
            estimatedWait: newEstimatedWait
          }).catch(err => console.error('Error updating position:', err));
        }
      });
    }, (error) => {
      console.error('Error fetching queue:', error);
      showNotification('Error loading queue', 'error');
    });

    return () => unsubscribe();
  }, [businessData]);

  // Calculate statistics - FIXED VERSION
  useEffect(() => {
    if (!businessData) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Query ALL completed entries (not filtered by date in query)
    const completedQuery = query(
      collection(db, 'queue_entries'),
      where('businessId', '==', businessData.id),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(completedQuery, (snapshot) => {
      const allCompleted = snapshot.docs.map(doc => doc.data());
      
      // Filter for today in JavaScript
      const completedToday = allCompleted.filter(entry => {
        if (!entry.completedAt || !entry.completedAt.seconds) return false;
        const completedDate = new Date(entry.completedAt.seconds * 1000);
        return completedDate >= today;
      });
      
      // Calculate actual wait time from today's data
      const timesWithData = completedToday.filter(entry => 
        entry.calledAt && entry.completedAt
      );
      
      let avgActualWaitTime = 0;
      if (timesWithData.length > 0) {
        const totalWaitMinutes = timesWithData.reduce((sum, entry) => {
          const waitTime = (entry.completedAt.seconds - entry.calledAt.seconds) / 60;
          return sum + waitTime;
        }, 0);
        avgActualWaitTime = Math.round(totalWaitMinutes / timesWithData.length);
      }

      // Calculate average rating from ALL completed entries (not just today)
      const ratedEntries = allCompleted.filter(e => e.rating);
      const avgRating = ratedEntries.length > 0
        ? ratedEntries.reduce((sum, e) => sum + e.rating, 0) / ratedEntries.length
        : businessData.rating || 5.0;

      setStats(prev => ({
        ...prev,
        todayServed: completedToday.length,
        avgRating: Math.round(avgRating * 10) / 10,
        actualAvgWaitTime: avgActualWaitTime
      }));

      // Auto-update wait time if enabled
      if (autoCalculateWaitTime && timesWithData.length >= 5) {
        updateDoc(doc(db, 'businesses', businessData.id), {
          avgWaitTime: avgActualWaitTime
        }).catch(err => console.error('Error updating avgWaitTime:', err));
      }
    }, (error) => {
      console.error('Error fetching stats:', error);
    });

    return () => unsubscribe();
  }, [businessData, autoCalculateWaitTime]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image must be smaller than 5MB', 'error');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showNotification('Please upload an image file (JPG, PNG, GIF)', 'error');
      return;
    }

    setUploadingImage(true);
    showNotification('Uploading image...', 'info');

    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // Replace with your actual ImgBB API key
      const API_KEY = '540e18d4ae9c31f4c2ee1d1b5528908a'; // TODO: Add your key here
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.url) {
        // Update business with new image URL
        await updateDoc(doc(db, 'businesses', businessData.id), {
          image: data.data.url
        });
        showNotification('Image uploaded successfully!', 'success');
      } else {
        throw new Error('Upload failed - invalid response from ImgBB');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showNotification(`Upload failed: ${error.message}`, 'error');
    } finally {
      setUploadingImage(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/invalid-credential') {
        setLoginError('Invalid email or password');
      } else if (error.code === 'auth/user-not-found') {
        setLoginError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setLoginError('Incorrect password');
      } else {
        setLoginError('Login failed. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      showNotification('Failed to logout', 'error');
    }
  };

  const callNext = async () => {
    if (queue.length === 0) return;
    
    const nextCustomer = queue[0];
    
    try {
      await updateDoc(doc(db, 'queue_entries', nextCustomer.id), {
        status: 'ready',
        calledAt: serverTimestamp()
      });
      showNotification(`Called ${nextCustomer.userName}`, 'success');
    } catch (error) {
      console.error('Error calling next customer:', error);
      showNotification('Failed to call next customer', 'error');
    }
  };

  const markServed = async (customerId, customerName) => {
    try {
      await updateDoc(doc(db, 'queue_entries', customerId), {
        status: 'completed',
        completedAt: serverTimestamp()
      });

      if (businessData) {
        await updateDoc(doc(db, 'businesses', businessData.id), {
          currentQueue: Math.max(0, (businessData.currentQueue || 0) - 1),
          todayServed: (businessData.todayServed || 0) + 1
        });
      }
      
      showNotification(`${customerName} marked as served`, 'success');
    } catch (error) {
      console.error('Error marking customer as served:', error);
      showNotification('Failed to mark as served', 'error');
    }
  };

  const markNoShow = async (customerId, customerName) => {
    try {
      await updateDoc(doc(db, 'queue_entries', customerId), {
        status: 'no_show',
        noShowAt: serverTimestamp()
      });

      if (businessData) {
        await updateDoc(doc(db, 'businesses', businessData.id), {
          currentQueue: Math.max(0, (businessData.currentQueue || 0) - 1)
        });
      }
      
      showNotification(`${customerName} marked as no-show`, 'info');
    } catch (error) {
      console.error('Error marking no-show:', error);
      showNotification('Failed to mark as no-show', 'error');
    }
  };

  const updateAvgServiceTime = async (newTime) => {
    if (!businessData) return;
    
    try {
      await updateDoc(doc(db, 'businesses', businessData.id), {
        avgWaitTime: parseInt(newTime)
      });
    } catch (error) {
      console.error('Error updating service time:', error);
      showNotification('Failed to update service time', 'error');
    }
  };

  const toggleAutoCalculate = async () => {
    if (!businessData) return;
    
    const newValue = !autoCalculateWaitTime;
    setAutoCalculateWaitTime(newValue);
    
    try {
      await updateDoc(doc(db, 'businesses', businessData.id), {
        autoCalculateWaitTime: newValue
      });
      showNotification(
        newValue ? 'Auto-calculate enabled' : 'Auto-calculate disabled', 
        'success'
      );
    } catch (error) {
      console.error('Error updating auto-calculate setting:', error);
      showNotification('Failed to update setting', 'error');
    }
  };

  // In-app notification component
  const Notification = () => {
    if (!notification) return null;

    const bgColors = {
      success: 'bg-green-50 border-green-300 text-green-800',
      error: 'bg-red-50 border-red-300 text-red-800',
      info: 'bg-blue-50 border-blue-300 text-blue-800'
    };

    const icons = {
      success: CheckCircle,
      error: AlertCircle,
      info: Bell
    };

    const Icon = icons[notification.type];

    return (
      <div className="fixed top-4 right-4 z-50 animate-slide-in">
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-lg ${bgColors[notification.type]}`}>
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">SkipQ Business</h1>
            <p className="text-gray-600 mt-2">Sign in to manage your queue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Demo account:</p>
            <p className="font-mono text-xs mt-1">demo@skipq.com / demo123</p>
          </div>
        </div>
      </div>
    );
  }

  if (!businessData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your business...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Notification />
      
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">SkipQ Business</h1>
                <p className="text-sm text-gray-600">{businessData.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Current Queue</div>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600">{queue.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              ~{queue.length * (businessData.avgWaitTime || 15)} min total wait
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Served Today</div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.todayServed}</div>
            <div className="text-xs text-gray-500 mt-1">+{stats.weekServed} this week</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Avg Wait Time</div>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-600">{businessData.avgWaitTime || 15} min</div>
            {stats.actualAvgWaitTime > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Actual: {stats.actualAvgWaitTime} min
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Avg Rating</div>
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-yellow-600">{stats.avgRating.toFixed(1)}</div>
            <div className="text-xs text-gray-500 mt-1">Out of 5.0</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800">Active Queue</h2>
                  <button
                    onClick={callNext}
                    disabled={queue.length === 0}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Bell className="w-5 h-5" />
                    Call Next Customer
                  </button>
                </div>
              </div>

              <div className="p-6">
                {queue.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Customers in Queue</h3>
                    <p className="text-gray-500">You're all caught up! New customers will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {queue.map((person) => (
                      <div
                        key={person.id}
                        className={`p-4 rounded-lg border-2 transition ${
                          person.status === 'ready'
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                              person.status === 'ready'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {person.position}
                            </div>
                            <div>
                              <div className="font-semibold text-lg">{person.userName || 'Customer'}</div>
                              <div className="text-sm text-gray-600">
                                Joined {person.joinedAt ? new Date(person.joinedAt.seconds * 1000).toLocaleTimeString() : 'recently'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {person.status === 'ready' && (
                              <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full animate-pulse">
                                READY
                              </span>
                            )}
                            <button
                              onClick={() => markServed(person.id, person.userName)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Served
                            </button>
                            <button
                              onClick={() => markNoShow(person.id, person.userName)}
                              className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              No Show
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Business Image Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-gray-600" />
                Business Image
              </h3>
              <div className="space-y-4">
                <div className="flex justify-center">
                  {businessData.image?.startsWith('http') ? (
                    <img 
                      src={businessData.image} 
                      alt={businessData.name}
                      className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-gray-100 flex items-center justify-center text-6xl border-2 border-gray-200">
                      {businessData.image || '🏪'}
                    </div>
                  )}
                </div>
                
                <div>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`w-full py-2 px-4 border-2 border-blue-300 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition cursor-pointer flex items-center justify-center gap-2 ${
                      uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingImage ? 'Uploading...' : 'Upload New Image'}
                  </label>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Max 5MB • JPG, PNG, GIF
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4">Quick Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">
                    Avg Service Time (minutes)
                    {autoCalculateWaitTime && (
                      <span className="ml-2 text-xs text-blue-600">(Auto-calculating)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={businessData.avgWaitTime || 15}
                    onChange={(e) => updateAvgServiceTime(e.target.value)}
                    disabled={autoCalculateWaitTime}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    min="1"
                    max="120"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCalculateWaitTime}
                      onChange={toggleAutoCalculate}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Auto-calculate wait time from actual data</span>
                  </label>
                  {stats.actualAvgWaitTime > 0 && (
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Based on {stats.todayServed} customers served today
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Rating (All Time)</span>
                  <span className="font-bold">{stats.avgRating.toFixed(1)}/5.0</span>
                </div>
                {stats.actualAvgWaitTime > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Actual Avg Wait (Today)</span>
                    <span className="font-bold">{stats.actualAvgWaitTime} min</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Ratings</span>
                  <span className="font-bold">{businessData.totalRatings || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BusinessDashboard;