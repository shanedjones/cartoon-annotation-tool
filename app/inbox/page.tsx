'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AssessmentReviewModal from '@/src/components/AssessmentReviewModal';
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
  reviewSession?: any;
}
interface AssessmentSession {
  id: string;
  athlete: Athlete;
  status: 'Not Started' | 'Completed' | 'Archived';
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
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState('');
  const [reviewAthleteName, setReviewAthleteName] = useState('');
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
        if (searchTerm) {
          filterSessionsBySearch(data, searchTerm);
        } else {
          setFilteredSessions(data);
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
        setLoading(false);
      }
    };
    fetchSessions();
  }, [statusFilter]);
  const filterSessionsBySearch = (sessionsToFilter: AssessmentSession[], term: string) => {
    if (!term.trim()) {
      setFilteredSessions(sessionsToFilter);
      return;
    }
    const lowerCaseSearch = term.toLowerCase();
    const results = sessionsToFilter.filter(session =>
      session.athlete.name.toLowerCase().includes(lowerCaseSearch) ||
      session.coach.toLowerCase().includes(lowerCaseSearch) ||
      session.swings.some(swing =>
        swing.title.toLowerCase().includes(lowerCaseSearch) ||
        swing.description.toLowerCase().includes(lowerCaseSearch) ||
        (swing.tags && Array.isArray(swing.tags) && swing.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch)))
      )
    );
    setFilteredSessions(results);
  };
  useEffect(() => {
    if (sessions.length === 0) return;
    filterSessionsBySearch(sessions, searchTerm);
  }, [searchTerm, sessions]);
  const toggleSessionExpand = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
    }
  };
  const openAssessmentReview = (sessionId: string, athleteName: string) => {
    setReviewSessionId(sessionId);
    setReviewAthleteName(athleteName);
    setIsReviewModalOpen(true);
  };
  const closeAssessmentReview = (saved?: boolean) => {
    setIsReviewModalOpen(false);
    if (saved && reviewSessionId) {
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === reviewSessionId
            ? { ...session, status: 'Completed' }
            : session
        )
      );
      setFilteredSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === reviewSessionId
            ? { ...session, status: 'Completed' }
            : session
        )
      );
    }
  };
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
      {}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search athletes, coaches, swings..."
            className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sm:w-48">
          <select
            className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
      {}
      {filteredSessions.length === 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-lg text-gray-600 dark:text-gray-300">No assessment sessions found matching your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="w-10 px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Athlete
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Swings
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSessions.map((session) => (
                <React.Fragment key={session.id}>
                  <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${expandedSession === session.id ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => toggleSessionExpand(session.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-full shadow-sm focus:outline-none transition-colors !bg-white dark:!bg-blue-600 border border-gray-200 dark:border-blue-500 !text-gray-700 dark:!text-white"
                        aria-label={expandedSession === session.id ? "Collapse" : "Expand"}
                      >
                        <span className="text-base font-bold text-gray-700 dark:text-white">
                          {expandedSession === session.id ? '−' : '+'}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {session.athlete?.name || 'Unknown Athlete'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">
                            Handicap: {session.athlete?.handicap || 'N/A'} | {session.athlete?.gender || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(session.status || 'Not Started')}`}>
                        {session.status || 'Not Started'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {session.swings?.length || 0} {(session.swings?.length || 0) === 1 ? 'swing' : 'swings'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <button
                        onClick={() => openAssessmentReview(session.id, session.athlete?.name || 'Unknown Athlete')}
                        className="px-3 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                      >
                        Review Assessment
                      </button>
                    </td>
                  </tr>
                  {}
                  {expandedSession === session.id && (session.swings || []).map((swing) => (
                    <tr key={swing.id} className="bg-gray-50 dark:bg-gray-700">
                      <td className="px-3 text-gray-500 dark:text-gray-300 text-center">
                        <div className="ml-2 w-5"></div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{swing.title}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-500 dark:text-gray-300">{swing.duration}</span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(swing.status)}`}>
                          {swing.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-500 dark:text-gray-300">-</span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        {swing.status === 'Completed' ? (
                          <button
                            onClick={() => window.location.href = `/review?videoId=${swing.id}&replay=true`}
                            className="px-3 py-1 rounded-md !bg-green-100 !text-green-700 hover:!bg-green-200 dark:!bg-indigo-900 dark:!text-indigo-200 dark:hover:!bg-indigo-800 transition-colors"
                          >
                            Replay
                          </button>
                        ) : (
                          <button
                            onClick={() => window.location.href = `/review?videoId=${swing.id}`}
                            className="px-3 py-1 rounded-md !bg-blue-100 !text-blue-700 hover:!bg-blue-200 dark:!bg-indigo-900 dark:!text-indigo-200 dark:hover:!bg-indigo-800 transition-colors"
                          >
                            Review
                          </button>
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
      {}
      <AssessmentReviewModal
        sessionId={reviewSessionId}
        athleteName={reviewAthleteName}
        isOpen={isReviewModalOpen}
        onClose={closeAssessmentReview}
      />
    </div>
  );
}