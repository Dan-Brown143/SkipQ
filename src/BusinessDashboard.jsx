import React, { useState, useEffect } from 'react';
import { Users, Clock, Bell, CheckCircle, XCircle, TrendingUp, DollarSign, Settings, BarChart3 } from 'lucide-react';

// This is the BUSINESS DASHBOARD - businesses manage their queues

const BusinessDashboard = () => {
  const [queue, setQueue] = useState([
    { id: 1, name: "John Smith", joined: "10:30 AM", phone: "07123456789", status: "ready" },
    { id: 2, name: "Sarah Johnson", joined: "10:35 AM", phone: "07234567890", status: "waiting" },
    { id: 3, name: "Mike Brown", joined: "10:42 AM", phone: "07345678901", status: "waiting" },
    { id: 4, name: "Emma Wilson", joined: "10:48 AM", phone: "07456789012", status: "waiting" },
  ]);

  const [businessInfo, setBusinessInfo] = useState({
    name: "Tony's Barbershop",
    avgServiceTime: 15,
    todayServed: 23,
    currentQueue: 4,
    avgWaitTime: 15,
    revenue: 29 // Monthly subscription
  });

  const [stats, setStats] = useState({
    weekServed: 145,
    monthServed: 623,
    avgRating: 4.8,
    noShowRate: 3.2
  });

  const callNext = () => {
    if (queue.length === 0) return;
    
    // Mark first person as ready, notify them
    setQueue(prev => prev.map((person, idx) => 
      idx === 0 ? { ...person, status: 'ready' } : person
    ));
    
    // In production, this sends push notification to customer
    alert(`${queue[0].name} has been notified!`);
  };

  const removeCustomer = (id) => {
    setQueue(queue.filter(p => p.id !== id));
    setBusinessInfo(prev => ({
      ...prev,
      todayServed: prev.todayServed + 1,
      currentQueue: prev.currentQueue - 1
    }));
  };

  const markNoShow = (id) => {
    setQueue(queue.filter(p => p.id !== id));
    setBusinessInfo(prev => ({
      ...prev,
      currentQueue: prev.currentQueue - 1
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">SkipQ Business</h1>
                <p className="text-sm text-gray-600">{businessInfo.name}</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Settings className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Current Queue</div>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600">{businessInfo.currentQueue}</div>
            <div className="text-xs text-gray-500 mt-1">
              ~{businessInfo.currentQueue * businessInfo.avgWaitTime} min total wait
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Served Today</div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">{businessInfo.todayServed}</div>
            <div className="text-xs text-gray-500 mt-1">+{stats.weekServed} this week</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Avg Wait Time</div>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-600">{businessInfo.avgWaitTime} min</div>
            <div className="text-xs text-gray-500 mt-1">Per customer</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Customer Rating</div>
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-yellow-600">{stats.avgRating}</div>
            <div className="text-xs text-gray-500 mt-1">Out of 5.0</div>
          </div>
        </div>

        {/* Queue Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Queue */}
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
                    {queue.map((person, index) => (
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
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-lg">{person.name}</div>
                              <div className="text-sm text-gray-600">
                                Joined at {person.joined}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {person.phone}
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
                              onClick={() => removeCustomer(person.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Served
                            </button>
                            <button
                              onClick={() => markNoShow(person.id)}
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

          {/* Quick Actions & Info */}
          <div className="space-y-6">
            {/* Quick Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4">Quick Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">
                    Avg Service Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={businessInfo.avgServiceTime}
                    onChange={(e) => setBusinessInfo({
                      ...businessInfo,
                      avgServiceTime: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" defaultChecked />
                    <span className="text-sm">Send SMS notifications</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" defaultChecked />
                    <span className="text-sm">Auto-call next customer</span>
                  </label>
                </div>

                <button className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition">
                  Advanced Settings
                </button>
              </div>
            </div>

            {/* Subscription Info */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5" />
                <h3 className="font-bold">Your Plan</h3>
              </div>
              <div className="text-3xl font-bold mb-2">£{businessInfo.revenue}/month</div>
              <p className="text-sm text-blue-100 mb-4">
                Pro Plan - Unlimited customers
              </p>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Real-time queue updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>SMS notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Analytics dashboard</span>
                </div>
              </div>
              <button className="w-full py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition">
                Manage Billing
              </button>
            </div>

            {/* Weekly Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                This Week
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Customers Served</span>
                  <span className="font-bold">{stats.weekServed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">No-Show Rate</span>
                  <span className="font-bold">{stats.noShowRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Rating</span>
                  <span className="font-bold">{stats.avgRating}/5.0</span>
                </div>
                <button className="w-full mt-2 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition">
                  View Full Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;