const AuthSuccessView = ({ children }: any) => (
  <>
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900/10 backdrop-blur-sm">
      <div className="bg-gray-900/90 rounded-2xl shadow-xl overflow-hidden max-w-sm w-full mx-4">
        <div className="p-6 flex flex-col items-center">
          <div className="mb-4">
            <img
              src="/brand_logo.png"
              alt="Chow Live"
              style={{ height: "40px" }}
            />
          </div>

          {children}
        </div>
      </div>
    </div>

    {/* <div className="w-full max-w-md p-8 backdrop-blur-md bg-gray-900/70 rounded-xl shadow-2xl border border-gray-800">
      <div className="text-center">
        <img
          src="/brand_logo.png"
          alt="ChowLive"
          className="h-10 mx-auto mb-6"
        />
        <h1 className="text-2xl font-bold mb-4 text-white">
          Spotify Authentication
        </h1>
      </div>
    </div> */}
  </>
);

export default AuthSuccessView;
