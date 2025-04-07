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

  // Fetch cartoons data from Cosmos DB API
  useEffect(() => {
    const fetchCartoons = async () => {
      try {
        setLoading(true);
        const url = statusFilter !== 'All' 
          ? `/api/cartoons?status=${encodeURIComponent(statusFilter)}`
          : '/api/cartoons';
          
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch cartoons: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setCartoons(data);
        
        // Apply search filter separately
        if (searchTerm) {
          filterCartoonsBySearch(data, searchTerm);
        } else {
          setFilteredCartoons(data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching cartoons:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch cartoons');
        setLoading(false);
      }
    };

    fetchCartoons();
  }, [statusFilter]); // Re-fetch when status filter changes
  
  // Function to filter cartoons by search term
  const filterCartoonsBySearch = (cartoonsToFilter: Cartoon[], term: string) => {
    if (!term.trim()) {
      setFilteredCartoons(cartoonsToFilter);
      return;
    }
    
    const lowerCaseSearch = term.toLowerCase();
    const results = cartoonsToFilter.filter(cartoon => 
      cartoon.title.toLowerCase().includes(lowerCaseSearch) || 
      cartoon.description.toLowerCase().includes(lowerCaseSearch) ||
      cartoon.categories.some(category => category.toLowerCase().includes(lowerCaseSearch))
    );
    
    setFilteredCartoons(results);
  };

  // Apply only search filter when search term changes
  // (Status filter is handled in the API call)
  useEffect(() => {
    // Don't reapply if we don't have cartoons yet
    if (cartoons.length === 0) return;
    
    // Apply search filter locally
    filterCartoonsBySearch(cartoons, searchTerm);
  }, [searchTerm, cartoons]);

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
        <h1 className="text-3xl font-bold">Inbox</h1>
      </div>

      {/* Filters and search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search sessions..."
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
          <p className="text-lg text-gray-600">No sessions found matching your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Added
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categories
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCartoons.map((cartoon) => (
                <tr key={cartoon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full object-cover" src={cartoon.thumbnailUrl} alt={cartoon.title} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{cartoon.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{cartoon.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(cartoon.dateAdded)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cartoon.duration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(cartoon.status)}`}>
                      {cartoon.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {cartoon.categories.slice(0, 2).map((category, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {category}
                        </span>
                      ))}
                      {cartoon.categories.length > 2 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          +{cartoon.categories.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-3 justify-end">
                      <Link
                        href={`/?cartoonId=${cartoon.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Review
                      </Link>
                      {cartoon.status === 'Completed' && (
                        <Link
                          href={`/?cartoonId=${cartoon.id}&replay=true`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Replay
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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