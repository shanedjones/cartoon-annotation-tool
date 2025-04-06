'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
// Removed Image import

// Define the cartoon interface
interface Cartoon {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  dateAdded: string;
  status: 'Not Started' | 'Completed' | 'Archived';
  categories: string[];
  metrics: Record<string, string | number>;
}

export default function InboxPage() {
  const [cartoons, setCartoons] = useState<Cartoon[]>([]);
  const [filteredCartoons, setFilteredCartoons] = useState<Cartoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch cartoons data
  useEffect(() => {
    const fetchCartoons = async () => {
      try {
        setLoading(true);
        const response = await fetch('/cartoons.json');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch cartoons: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setCartoons(data);
        setFilteredCartoons(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching cartoons:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch cartoons');
        setLoading(false);
      }
    };

    fetchCartoons();
  }, []);

  // Apply filters when status filter or search term changes
  useEffect(() => {
    let results = cartoons;
    
    // Apply status filter
    if (statusFilter !== 'All') {
      results = results.filter(cartoon => cartoon.status === statusFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      results = results.filter(cartoon => 
        cartoon.title.toLowerCase().includes(lowerCaseSearch) || 
        cartoon.description.toLowerCase().includes(lowerCaseSearch) ||
        cartoon.categories.some(category => category.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    setFilteredCartoons(results);
  }, [cartoons, statusFilter, searchTerm]);

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
        <h1 className="text-3xl font-bold">Cartoon Review Inbox</h1>
      </div>

      {/* Filters and search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search cartoons..."
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

      {/* Cartoons list */}
      {filteredCartoons.length === 0 ? (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-lg text-gray-600">No cartoons found matching your filters.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredCartoons.map((cartoon) => (
            <div key={cartoon.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Thumbnail */}
                <div className="md:w-1/4 h-48 md:h-auto relative">
                  <img 
                    src={cartoon.thumbnailUrl} 
                    alt={cartoon.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Content */}
                <div className="p-6 md:w-3/4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xl font-bold">{cartoon.title}</h2>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(cartoon.status)}`}>
                        {cartoon.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{cartoon.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {cartoon.categories.map((category, index) => (
                        <span key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                          {category}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{cartoon.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Added: {formatDate(cartoon.dateAdded)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/?cartoonId=${cartoon.id}`}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors"
                    >
                      Review Cartoon
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Status summary */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">{cartoons.length}</div>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="text-sm text-gray-500">Not Started</div>
            <div className="text-2xl font-bold">
              {cartoons.filter(c => c.status === 'Not Started').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-bold">
              {cartoons.filter(c => c.status === 'Completed').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="text-sm text-gray-500">Archived</div>
            <div className="text-2xl font-bold">
              {cartoons.filter(c => c.status === 'Archived').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}