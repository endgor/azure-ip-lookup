import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  query: {
    ipOrDomain?: string;
    region?: string;
    service?: string;
  };
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  query
}) => {
  const router = useRouter();
  // Determine which page links to show
  const getPageNumbers = () => {
    const pages = [];
    const MAX_VISIBLE = 5;
    
    // Always show first page
    pages.push(1);
    
    if (totalPages <= MAX_VISIBLE) {
      // If we have 5 or fewer pages, show all of them
      for (let i = 2; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // More complex case with ellipsis
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      if (startPage > 2) pages.push(-1); // Add ellipsis after 1
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages - 1) pages.push(-2); // Add ellipsis before last page
      
      // Always show last page if we have more than 1 page
      if (totalPages > 1) pages.push(totalPages);
    }
    
    return pages;
  };
  
  // Helper to build URL with query params
  const getPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (query.ipOrDomain) params.append('ipOrDomain', query.ipOrDomain);
    if (query.region) params.append('region', query.region);
    if (query.service) params.append('service', query.service);
    if (page > 1) params.append('page', page.toString());
    if (pageSize !== 50) params.append('pageSize', pageSize.toString());

    return `/?${params.toString()}`;
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newSize = value === 'all' ? totalItems : parseInt(value, 10);

    const params = new URLSearchParams();
    if (query.ipOrDomain) params.append('ipOrDomain', query.ipOrDomain);
    if (query.region) params.append('region', query.region);
    if (query.service) params.append('service', query.service);
    if (newSize !== 50) params.append('pageSize', newSize.toString());

    router.push(`/?${params.toString()}`);
  };

  const hasMultiplePages = totalPages > 1;

  // Calculate range of items being shown
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Get pages to display
  const pageNumbers = getPageNumbers();

  const selectValue = pageSize >= totalItems ? 'all' : pageSize.toString();

  return (
    <nav className="flex justify-between items-center my-4" aria-label="Search results pagination">
      <div className="text-sm text-gray-700 flex items-center gap-4">
        <span>
          Showing items <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{totalItems}</span>
        </span>
        <label className="flex items-center gap-1">
          Items per page:
          <select
            className="border-gray-300 rounded-md text-sm"
            value={selectValue}
            onChange={handlePageSizeChange}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <div className="flex gap-2" role="navigation" aria-label="Pagination">
        {hasMultiplePages && (
          <>
            {currentPage > 1 && (
              <Link href={getPageUrl(currentPage - 1)} className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">
                Previous
              </Link>
            )}

            {pageNumbers.map((page, index) => {
              if (page < 0) {
                // Ellipsis
                return <span key={`ellipsis-${index}`} className="px-3 py-1">...</span>;
              }

              return (
                <Link
                  key={page}
                  href={getPageUrl(page)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </Link>
              );
            })}

            {currentPage < totalPages && (
              <Link href={getPageUrl(currentPage + 1)} className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200">
                Next
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
};

export default Pagination;
