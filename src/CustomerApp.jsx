import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Users, Bell, CheckCircle, XCircle, Search, Star, ArrowRight } from 'lucide-react';

// This is the CUSTOMER APP - users find businesses and join queues

const CustomerApp = () => {
  const [view, setView] = useState('browse'); // browse, queue, myQueues
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [myQueues, setMyQueues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - in production this comes from Firebase
  const [businesses, setBusinesses] = useState([
    {
      id: 1,
      name: "Tony's Barbershop",
      category: "Barbershop",
      address: "123 High Street, Bristol",
      rating: 4.8,
      currentQueue: 7,
      avgWaitTime: 15,
      image: "💈",
      open: true
    },
    {
      id: 2,
      name: "The Corner Cafe",
      category: "Restaurant",
      address: "45 Park Road, Bristol",
      rating: 4.6,
      currentQueue: 12,
      avgWaitTime: 25,
      image: "☕",
      open: true
    },
    {
      id: 3,
      name: "City Medical Centre",
      category: "Healthcare",
      address: "78 Queen Street, Bristol",
      rating: 4.9,
      currentQueue: 5,
      avgWaitTime: 20,
      image: "🏥",
      open: true
    },
    {
      id: 4,
      name: "Fresh Cuts Salon",
      category: "Salon",
      address: "90 Bridge Street, Bristol",
      rating: 4.7,
      currentQueue: 4,
      avgWaitTime: 30,
      image: "💇",
      open: true
    }
  ]);

  const joinQueue = (business) => {
    const queueEntry = {
      id: Date.now(),
      business: business,
      joinedAt: new Date(),
      position: business.currentQueue + 1,
      estimatedWait: (business.currentQueue + 1) * business.avgWaitTime,
      status: 'waiting'
    };
    
    setMyQueues([...myQueues, queueEntry]);
    setView('myQueues');
    
    // Simulate queue updates
    simulateQueueProgress(queueEntry.id);
  };

  const simulateQueueProgress = (queueId) => {
    // In production, this would be real-time Firebase updates
    const interval = setInterval(() => {
      setMyQueues(prev => prev.map(q => {
        if (q.id === queueId && q.position > 1) {
          const newPosition = q.position - 1;
          return {
            ...q,
            position: newPosition,
            estimatedWait: newPosition * q.business.avgWaitTime,
            status: newPosition === 1 ? 'ready' : 'waiting'
          };
        }
        return q;
      }));
    }, 10000); // Update every 10 seconds (demo speed)
  };

  const leaveQueue = (queueId) => {
    setMyQueues(myQueues.filter(q => q.id !== queueId));
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Browse View
  const BrowseView = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search businesses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid gap-4">
        {filteredBusinesses.map(business => (
          <div
            key={business.id}
            onClick={() => {
              setSelectedBusiness(business);
              setView('queue');
            }}
            className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition"
          >
            <div className="flex items-start gap-4">
              <div className="text-5xl">{business.image}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-lg">{business.name}</h3>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-semibold">{business.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{business.category}</p>
                <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{business.address}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-600">
                      {business.currentQueue} in queue
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      ~{business.avgWaitTime} min wait
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Queue Detail View
  const QueueView = () => {
    if (!selectedBusiness) return null;

    return (
      <div className="space-y-4">
        <button
          onClick={() => setView('browse')}
          className="text-blue-600 font-medium"
        >
          ← Back to businesses
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{selectedBusiness.image}</div>
            <h2 className="text-2xl font-bold mb-2">{selectedBusiness.name}</h2>
            <p className="text-gray-600">{selectedBusiness.category}</p>
            <div className="flex items-center justify-center gap-1 text-yellow-500 mt-2">
              <Star className="w-5 h-5 fill-current" />
              <span className="font-semibold">{selectedBusiness.rating}</span>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-600">Current Queue</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedBusiness.currentQueue}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-gray-600" />
                <div>
                  <div className="text-sm text-gray-600">Est. Wait Time</div>
                  <div className="text-2xl font-bold">
                    {selectedBusiness.avgWaitTime * selectedBusiness.currentQueue} min
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
              <MapPin className="w-4 h-4" />
              <span>{selectedBusiness.address}</span>
            </div>
          </div>

          <button
            onClick={() => joinQueue(selectedBusiness)}
            className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            Join Queue
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  // My Queues View
  const MyQueuesView = () => (
    <div className="space-y-4">
      {myQueues.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Active Queues</h3>
          <p className="text-gray-500 mb-6">Join a queue to get started!</p>
          <button
            onClick={() => setView('browse')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Browse Businesses
          </button>
        </div>
      ) : (
        myQueues.map(queue => (
          <div key={queue.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{queue.business.image}</div>
                <div>
                  <h3 className="font-bold text-lg">{queue.business.name}</h3>
                  <p className="text-sm text-gray-600">{queue.business.category}</p>
                </div>
              </div>
              {queue.status === 'ready' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                  <Bell className="w-4 h-4" />
                  <span className="text-sm font-semibold">Ready!</span>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Your Position</div>
                  <div className="text-3xl font-bold text-blue-600">#{queue.position}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Est. Wait Time</div>
                  <div className="text-3xl font-bold">{queue.estimatedWait} min</div>
                </div>
              </div>

              {queue.status === 'ready' ? (
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                    <CheckCircle className="w-5 h-5" />
                    It's your turn!
                  </div>
                  <p className="text-sm text-gray-600">
                    Please head to {queue.business.name} now. They're ready for you!
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    We'll notify you when it's almost your turn. Stay nearby!
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => leaveQueue(queue.id)}
              className="w-full py-3 border-2 border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition"
            >
              Leave Queue
            </button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">SkipQ</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('browse')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  view === 'browse' || view === 'queue'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Browse
              </button>
              <button
                onClick={() => setView('myQueues')}
                className={`px-4 py-2 rounded-lg font-medium transition relative ${
                  view === 'myQueues'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                My Queues
                {myQueues.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {myQueues.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {view === 'browse' && <BrowseView />}
        {view === 'queue' && <QueueView />}
        {view === 'myQueues' && <MyQueuesView />}
      </div>
    </div>
  );
};

export default CustomerApp;