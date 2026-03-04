import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Users, Bell, CheckCircle, Search, Star, ArrowRight, X } from 'lucide-react';
import { db } from './firebase';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, where, orderBy, getDoc, increment } from 'firebase/firestore';

const CustomerApp = () => {
  const [view, setView] = useState('browse');
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [myQueues, setMyQueues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingData, setRatingData] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [userId] = useState(() => {
    const stored = localStorage.getItem('skipq_user_id');
    if (stored) return stored;
    const newId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('skipq_user_id', newId);
    return newId;
  });
  const [userName] = useState(() => {
    const stored = localStorage.getItem('skipq_user_name');
    if (stored) return stored;
    const name = prompt('What\'s your name?') || 'Guest User';
    localStorage.setItem('skipq_user_name', name);
    return name;
  });

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'businesses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const businessData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBusinesses(businessData);
    }, (error) => {
      console.error('Error fetching businesses:', error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'queue_entries'),
      where('userId', '==', userId),
      where('status', 'in', ['waiting', 'ready', 'completed'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const queueData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter for active queues (waiting/ready)
      const activeQueues = queueData.filter(q => q.status === 'waiting' || q.status === 'ready');
      setMyQueues(activeQueues);

      // Check for completed queues that need rating
      const completedNeedRating = queueData.filter(q => 
        q.status === 'completed' && !q.rated && !q.ratingPromptShown
      );

      if (completedNeedRating.length > 0) {
        const queue = completedNeedRating[0];
        setRatingData(queue);
        setShowRatingModal(true);
        // Mark as prompted so we don't show again
        updateDoc(doc(db, 'queue_entries', queue.id), {
          ratingPromptShown: true
        });
      }

      // Check for ready notifications
      activeQueues.forEach(queue => {
        if (queue.status === 'ready' && !queue.notified) {
          sendNotification(queue);
          updateDoc(doc(db, 'queue_entries', queue.id), {
            notified: true
          });
        }
      });
    }, (error) => {
      console.error('Error fetching queue entries:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  const sendNotification = (queue) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("It's your turn! 🎉", {
        body: `${queue.businessName} is ready for you now!`,
        icon: '/logo.png',
        badge: '/logo.png'
      });
    }
  };

  const submitRating = async () => {
    if (!ratingData || selectedRating === 0) return;

    try {
      // Update the queue entry with rating
      await updateDoc(doc(db, 'queue_entries', ratingData.id), {
        rating: selectedRating,
        rated: true,
        ratedAt: serverTimestamp()
      });

      // Update business rating
      const businessRef = doc(db, 'businesses', ratingData.businessId);
      const businessSnap = await getDoc(businessRef);
      
      if (businessSnap.exists()) {
        const businessData = businessSnap.data();
        const currentRating = businessData.rating || 5.0;
        const totalRatings = businessData.totalRatings || 0;
        
        // Calculate new average rating
        const newTotalRatings = totalRatings + 1;
        const newRating = ((currentRating * totalRatings) + selectedRating) / newTotalRatings;
        
        await updateDoc(businessRef, {
          rating: Math.round(newRating * 10) / 10, // Round to 1 decimal
          totalRatings: newTotalRatings
        });
      }

      setShowRatingModal(false);
      setRatingData(null);
      setSelectedRating(0);
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating');
    }
  };

  const joinQueue = async (business) => {
    try {
      // Check if user is already in this queue
      const existingQueueQuery = query(
        collection(db, 'queue_entries'),
        where('businessId', '==', business.id),
        where('userId', '==', userId),
        where('status', 'in', ['waiting', 'ready'])
      );
      
      const existingSnapshot = await new Promise((resolve) => {
        const unsubscribe = onSnapshot(existingQueueQuery, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });

      if (!existingSnapshot.empty) {
        alert('You are already in this queue!');
        setView('myQueues');
        return;
      }

      // Get current queue size
      const queueQuery = query(
        collection(db, 'queue_entries'),
        where('businessId', '==', business.id),
        where('status', 'in', ['waiting', 'ready'])
      );
      
      const snapshot = await new Promise((resolve) => {
        const unsubscribe = onSnapshot(queueQuery, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });

      const currentQueueSize = snapshot.size;
      const position = currentQueueSize + 1;

      // Add to queue
      await addDoc(collection(db, 'queue_entries'), {
        userId: userId,
        userName: userName,
        businessId: business.id,
        businessName: business.name,
        businessCategory: business.category,
        businessImage: business.image,
        position: position,
        status: 'waiting',
        joinedAt: serverTimestamp(),
        estimatedWait: position * (business.avgWaitTime || 15),
        notified: false,
        rated: false,
        ratingPromptShown: false
      });

      // Update business queue count
      const businessRef = doc(db, 'businesses', business.id);
      await updateDoc(businessRef, {
        currentQueue: currentQueueSize + 1
      });

      setView('myQueues');
    } catch (error) {
      console.error('Error joining queue:', error);
      alert('Failed to join queue: ' + error.message);
    }
  };

  const leaveQueue = async (queueId, businessId) => {
    try {
      // Delete the queue entry
      await deleteDoc(doc(db, 'queue_entries', queueId));
      
      // Get updated queue count
      const queueQuery = query(
        collection(db, 'queue_entries'),
        where('businessId', '==', businessId),
        where('status', 'in', ['waiting', 'ready'])
      );
      
      const snapshot = await new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(queueQuery, 
          (snap) => {
            unsubscribe();
            resolve(snap);
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );
      });

      // Update business queue count
      const businessRef = doc(db, 'businesses', businessId);
      await updateDoc(businessRef, {
        currentQueue: snapshot.size
      });
      
      console.log('Successfully left queue. New queue size:', snapshot.size);
    } catch (error) {
      console.error('Error leaving queue:', error);
      alert('Failed to leave queue: ' + error.message);
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const RatingModal = () => {
    if (!showRatingModal || !ratingData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Rate Your Experience</h3>
            <button
              onClick={() => setShowRatingModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            How was your experience at <span className="font-semibold">{ratingData.businessName}</span>?
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-12 h-12 ${
                    star <= selectedRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            onClick={submitRating}
            disabled={selectedRating === 0}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Rating
          </button>
        </div>
      </div>
    );
  };

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

      {filteredBusinesses.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No businesses found</h3>
          <p className="text-gray-500">Try a different search term</p>
        </div>
      ) : (
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
                {business.image?.startsWith('http') ? (
                  <img src={business.image} alt={business.name} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="text-5xl">{business.image || '🏪'}</div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg">{business.name}</h3>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-semibold">{business.rating || 5.0}</span>
                      {business.totalRatings > 0 && (
                        <span className="text-xs text-gray-500">({business.totalRatings})</span>
                      )}
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
                        {business.currentQueue || 0} in queue
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-600">
                        ~{business.avgWaitTime || 15} min wait
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
            {selectedBusiness.image?.startsWith('http') ? (
              <img src={selectedBusiness.image} alt={selectedBusiness.name} className="w-24 h-24 rounded-lg object-cover mx-auto mb-4" />
            ) : (
              <div className="text-6xl mb-4">{selectedBusiness.image || '🏪'}</div>
            )}
            <h2 className="text-2xl font-bold mb-2">{selectedBusiness.name}</h2>
            <p className="text-gray-600">{selectedBusiness.category}</p>
            <div className="flex items-center justify-center gap-1 text-yellow-500 mt-2">
              <Star className="w-5 h-5 fill-current" />
              <span className="font-semibold">{selectedBusiness.rating || 5.0}</span>
              {selectedBusiness.totalRatings > 0 && (
                <span className="text-sm text-gray-500">({selectedBusiness.totalRatings} ratings)</span>
              )}
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-600">Current Queue</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedBusiness.currentQueue || 0}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-gray-600" />
                <div>
                  <div className="text-sm text-gray-600">Est. Wait Time</div>
                  <div className="text-2xl font-bold">
                    {(selectedBusiness.avgWaitTime || 15) * (selectedBusiness.currentQueue || 0)} min
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
                {queue.businessImage?.startsWith('http') ? (
                  <img src={queue.businessImage} alt={queue.businessName} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="text-4xl">{queue.businessImage || '🏪'}</div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{queue.businessName}</h3>
                  <p className="text-sm text-gray-600">{queue.businessCategory}</p>
                </div>
              </div>
              {queue.status === 'ready' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full animate-pulse">
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
                  <div className="text-3xl font-bold">{queue.estimatedWait || 0} min</div>
                </div>
              </div>

              {queue.status === 'ready' ? (
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                    <CheckCircle className="w-5 h-5" />
                    It's your turn!
                  </div>
                  <p className="text-sm text-gray-600">
                    Please head to {queue.businessName} now. They're ready for you!
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
              onClick={() => leaveQueue(queue.id, queue.businessId)}
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
      <RatingModal />
      
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

      <div className="max-w-2xl mx-auto px-4 py-6">
        {view === 'browse' && <BrowseView />}
        {view === 'queue' && <QueueView />}
        {view === 'myQueues' && <MyQueuesView />}
      </div>
    </div>
  );
};

export default CustomerApp;