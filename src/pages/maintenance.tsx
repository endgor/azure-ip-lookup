import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Maintenance() {
  return (
    <>
      <Head>
        <title>Maintenance - Azure IP Lookup</title>
        <meta name="description" content="Azure IP Lookup is temporarily unavailable for maintenance. Please check back shortly." />
        <meta name="robots" content="noindex, nofollow" />
        <meta httpEquiv="refresh" content="300" />
      </Head>

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg">
          <div className="container mx-auto px-4">
            <nav className="flex justify-between items-center py-4">
              <div className="flex items-center text-2xl font-bold">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-8 w-8 mr-2" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  role="img"
                  aria-label="Azure IP Lookup Logo"
                >
                  <title>Azure IP Lookup Logo</title>
                  <path d="M21.3 12c0 .9-5.5 5.6-9.3 5.6S2.7 12.9 2.7 12s5.5-5.6 9.3-5.6c3.8-.1 9.3 4.7 9.3 5.6zm-9.3-3.5c1.9 0 3.5 1.6 3.5 3.5s-1.6 3.5-3.5 3.5-3.5-1.6-3.5-3.5 1.5-3.5 3.5-3.5z" />
                </svg>
                <span>Azure IP Lookup</span>
              </div>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
              {/* Maintenance Icon */}
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
                  <svg 
                    className="w-10 h-10 text-amber-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Temporarily Unavailable
                </h1>
                <p className="text-lg text-gray-600">
                  We&apos;re currently updating the Azure IP Lookup service
                </p>
              </div>

              {/* Status Information */}
              <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h2 className="text-lg font-semibold text-amber-800 mb-2">
                  What&apos;s happening?
                </h2>
                <p className="text-amber-700 mb-2">
                  The Azure IP Lookup service is temporarily unavailable due to deployment updates. 
                  This usually takes just a few minutes to resolve.
                </p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                  <li>Service data is being updated with the latest Azure IP ranges</li>
                  <li>New features and improvements are being deployed</li>
                  <li>All data remains secure and intact</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
                
                <div className="text-sm text-gray-500">
                  <p>This page will automatically refresh in 5 minutes</p>
                  <p className="mt-2">
                    For updates, check our{' '}
                    <a 
                      href="https://github.com/endgor/azure-ip-lookup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      GitHub repository
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Alternative Resources */}
            <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Alternative Resources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <a 
                  href="https://www.microsoft.com/en-us/download/details.aspx?id=56519"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-150 ease-in-out"
                >
                  <div className="font-medium text-blue-600">Microsoft Azure IP Ranges</div>
                  <div className="text-gray-600">Official Microsoft download</div>
                </a>
                <a 
                  href="https://azurespeedtest.azurewebsites.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-150 ease-in-out"
                >
                  <div className="font-medium text-blue-600">Azure Speed Test</div>
                  <div className="text-gray-600">Network testing tools</div>
                </a>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-50 border-t">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-600">
            <p>Azure IP Lookup Tool - Temporarily under maintenance</p>
          </div>
        </footer>
      </div>
    </>
  );
}