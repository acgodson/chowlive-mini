const RoomSkeletonLoader = () => (
  <div className="w-full max-w-md mx-auto p-4">
    <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden w-full">
      <div className="flex justify-center items-center h-64 p-8">
        <div className="animate-pulse w-full">
          {/* Header skeleton */}
          <div className="mb-4">
            <div className="h-6 bg-gray-700 rounded-lg w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-800 rounded-lg w-2/4"></div>
          </div>

          {/* Album art skeleton */}
          <div className="flex justify-center mb-6">
            <div className="rounded-lg bg-gray-700 h-32 w-32"></div>
          </div>

          {/* Controls skeleton */}
          <div className="space-y-3">
            {/* Progress bar skeleton */}
            <div className="h-2 bg-gray-800 rounded-full w-full"></div>

            {/* Buttons skeleton */}
            <div className="flex justify-between">
              <div className="flex space-x-2">
                <div className="rounded-full bg-gray-800 h-10 w-10"></div>
                <div className="rounded-full bg-gray-800 h-10 w-10"></div>
              </div>
              <div className="flex space-x-2">
                <div className="rounded-full bg-gray-800 h-10 w-10"></div>
                <div className="rounded-full bg-gray-800 h-10 w-10"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default RoomSkeletonLoader;
