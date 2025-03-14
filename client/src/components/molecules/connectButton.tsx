"use client";

import { useState, useEffect } from "react";
import { useUpProvider } from "@/src/services/lukso/upProvider";

export const ConnectButton = () => {
  const [isInIframe, setIsInIframe] = useState(false);
  const { accounts, isSearching: isLoading, connectWallet } = useUpProvider();

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  const isConnected = accounts && accounts.length > 0;

  const displayAddress = accounts[0];


  // Don't render the button if we're in an iframe
  if (isInIframe) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {isConnected ? (
        <button
          className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium shadow-md hover:bg-green-600 transition-colors"
          disabled
        >
          {displayAddress
            ? `${displayAddress.substring(0, 6)}...${displayAddress.substring(
                displayAddress.length - 4
              )}`
            : "Connected"}
        </button>
      ) : (
        <button
          className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium shadow-md hover:bg-red-600 transition-colors flex items-center"
          onClick={connectWallet}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Connecting...
            </>
          ) : (
            "Connect UP"
          )}
        </button>
      )}
    </div>
  );
};
