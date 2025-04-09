'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AssessmentReviewModal from '@/src/components/AssessmentReviewModal';

// Define the assessment session interface
interface Athlete {
  name: string;
  handicap: number;
  gender: string;
}

interface Swing {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  status: 'Not Started' | 'Completed' | 'Archived';
  tags: string[];
  metrics: Record<string, string | number>;
  reviewSession?: any; // The feedback data for this swing (if completed)
}

interface AssessmentSession {
  id: string;
  athlete: Athlete;
  date: string;
  timeWindow: string;
  status: 'Not Started' | 'Completed' | 'Archived';
  location: string;
  coach: string;
  swings: Swing[];
}

export default function InboxPage() {
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<AssessmentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  
  // Assessment review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState('');
  const [reviewAthleteName, setReviewAthleteName] = useState('');

  // Fetch assessment sessions from Cosmos DB API
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const url = statusFilter !== 'All' 
          ? `/api/videos?status=${encodeURIComponent(statusFilter)}`
          : '/api/videos';
          
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setSessions(data);
        
        // Apply search filter separately
        if (searchTerm) {
          filterSessionsBySearch(data, searchTerm);
        } else {
          setFilteredSessions(data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
        setLoading(false);
      }
    };

    fetchSessions();
  }, [statusFilter]); // Re-fetch when status filter changes
  
  // Function to filter sessions by search term
  const filterSessionsBySearch = (sessionsToFilter: AssessmentSession[], term: string) => {
    if (!term.trim()) {
      setFilteredSessions(sessionsToFilter);
      return;
    }
    
    const lowerCaseSearch = term.toLowerCase();
    const results = sessionsToFilter.filter(session => 
      session.athlete.name.toLowerCase().includes(lowerCaseSearch) || 
      session.location.toLowerCase().includes(lowerCaseSearch) ||
      session.coach.toLowerCase().includes(lowerCaseSearch) ||
      session.swings.some(swing => 
        swing.title.toLowerCase().includes(lowerCaseSearch) || 
        swing.description.toLowerCase().includes(lowerCaseSearch) ||
        swing.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch))
      )
    );
    
    setFilteredSessions(results);
  };

  // Apply only search filter when search term changes
  useEffect(() => {
    if (sessions.length === 0) return;
    filterSessionsBySearch(sessions, searchTerm);
  }, [searchTerm, sessions]);

  // Toggle session expansion
  const toggleSessionExpand = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
    }
  };
  
  // Open the assessment review modal
  const openAssessmentReview = (sessionId: string, athleteName: string) => {
    setReviewSessionId(sessionId);
    setReviewAthleteName(athleteName);
    setIsReviewModalOpen(true);
  };
  
  // Close the assessment review modal
  const closeAssessmentReview = (saved?: boolean) => {
    setIsReviewModalOpen(false);
    
    // If a review was saved, update the session status in the UI
    if (saved && reviewSessionId) {
      // Update the sessions state to reflect the completion
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === reviewSessionId 
            ? { ...session, status: 'Completed' } 
            : session
        )
      );
      
      // Also update filtered sessions to immediately reflect the change in UI
      setFilteredSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === reviewSessionId 
            ? { ...session, status: 'Completed' } 
            : session
        )
      );
    }
  };

  // Function to get appropriate status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-200 text-gray-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Archived':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-100 text-red-800 p-4 rounded-lg">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Assessment Sessions</h1>
      </div>

      {/* Filters and search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search athletes, locations, coaches..."
            className="w-full px-4 py-2 border rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sm:w-48">
          <select
            className="w-full px-4 py-2 border rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Sessions list */}
      {filteredSessions.length === 0 ? (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-lg text-gray-600">No assessment sessions found matching your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-10 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Athlete
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Swings
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <React.Fragment key={session.id}>
                  <tr className={`hover:bg-gray-50 ${expandedSession === session.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => toggleSessionExpand(session.id)}
                        className="p-1 rounded-full hover:bg-gray-100 focus:outline-none"
                        aria-label={expandedSession === session.id ? "Collapse" : "Expand"}
                      >
                        <svg 
                          className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedSession === session.id ? 'rotate-90' : ''}`} 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 20 20" 
                          fill="currentColor"
                        >
                          <path 
                            fillRule="evenodd" 
                            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-0">
                          <div className="text-sm font-medium text-gray-900">
                            {session.athlete?.name || 'Unknown Athlete'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Handicap: {session.athlete?.handicap || 'N/A'} | {session.athlete?.gender || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{session.date ? formatDate(session.date) : 'No date'}</div>
                      <div className="text-sm text-gray-500">{session.timeWindow || 'No time specified'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.location || 'No location'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(session.status || 'Not Started')}`}>
                        {session.status || 'Not Started'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.swings?.length || 0} {(session.swings?.length || 0) === 1 ? 'swing' : 'swings'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <button
                        onClick={() => openAssessmentReview(session.id, session.athlete?.name || 'Unknown Athlete')}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Review Assessment
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded swing rows */}
                  {expandedSession === session.id && (session.swings || []).map((swing) => (
                    <tr key={swing.id} className="bg-gray-50">
                      <td className="px-3 text-gray-500 text-center">
                        <div className="ml-2 w-5"></div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{swing.title}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{swing.duration}</span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-500">-</span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(swing.status)}`}>
                          {swing.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-500">-</span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        {swing.status === 'Completed' ? (
                          <Link
                            href={`/?videoId=${swing.id}&replay=true`}
                            className="text-green-600 hover:text-green-900"
                          >
                            Replay
                          </Link>
                        ) : (
                          <Link
                            href={`/?videoId=${swing.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Review
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      
      {/* Assessment Review Modal */}
      <AssessmentReviewModal
        sessionId={reviewSessionId}
        athleteName={reviewAthleteName}
        isOpen={isReviewModalOpen}
        onClose={closeAssessmentReview}
      />
    </div>
  );
}