

export default function Home() {
  return (
    <>
      {/* Centered Container with generous side margins */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Top Section - Hero Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Large Blue Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-8 h-56 flex flex-col justify-end">
            <h2 className="text-3xl font-bold text-white mb-3">
              Introducing New MTG Set: Bloomburrow
            </h2>
            <p className="text-blue-100 text-sm">2 mins read</p>
          </div>
          
          {/* Small Green Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-8 h-56 flex flex-col justify-end">
            <h3 className="text-xl font-bold text-white mb-3">
              Catching hellbent with ChatGPT
            </h3>
            <p className="text-green-100 text-sm">3 mins read</p>
          </div>
        </div>

        {/* Latest News Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Latest news</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-purple-600 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-purple-500 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">
                OpenAI announces nonprofit conversation initiative
              </h3>
              <p className="text-purple-200 text-sm">Company · Apr 18, 2023</p>
            </div>
            
            <div className="bg-orange-500 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-orange-400 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">
                Our updated Preparedness Framework
              </h3>
              <p className="text-orange-200 text-sm">Publication · Apr 15, 2023</p>
            </div>
            
            <div className="bg-teal-500 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-teal-400 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">
                BrowserGPT: A benchmark for browsing agents
              </h3>
              <p className="text-teal-200 text-sm">Publication · Apr 10, 2023</p>
            </div>
          </div>

          <div className="flex justify-center">
            <button className="border border-gray-600 text-gray-300 px-6 py-3 rounded-full text-sm hover:bg-gray-800 hover:border-gray-500 transition-all">
              View all
            </button>
          </div>
        </div>

        {/* Twitch Streamers Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Twitch Streamers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-red-600 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-red-500 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">MTGNerdGirl</h3>
              <p className="text-red-200 text-sm">Streamer · Twitch</p>
            </div>
            
            <div className="bg-red-600 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-red-500 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">NumotTheNummy</h3>
              <p className="text-red-200 text-sm">Streamer · Twitch</p>
            </div>
            
            <div className="bg-red-600 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-red-500 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">LoadingReadyRun</h3>
              <p className="text-red-200 text-sm">Content · Twitch</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button className="border border-gray-600 text-gray-300 px-6 py-3 rounded-full text-sm hover:bg-gray-800 hover:border-gray-500 transition-all">
              View all
            </button>
          </div>
        </div>

        {/* YouTube Creators Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">YouTube Creators</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-600 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-blue-500 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">The Command Zone</h3>
              <p className="text-blue-200 text-sm">Content · YouTube</p>
            </div>
            
            <div className="bg-blue-600 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-blue-500 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">Tolarian Community College</h3>
              <p className="text-blue-200 text-sm">Education · YouTube</p>
            </div>
            
            <div className="bg-blue-600 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-blue-500 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">MTG Goldfish</h3>
              <p className="text-blue-200 text-sm">Budget · YouTube</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button className="border border-gray-600 text-gray-300 px-6 py-3 rounded-full text-sm hover:bg-gray-800 hover:border-gray-500 transition-all">
              View all
            </button>
          </div>
        </div>

        {/* MTG Blogs Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">MTG Blogs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-700 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-gray-600 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">Best Spy Stories</h3>
              <p className="text-gray-400 text-sm">Blog · MTG Salvation</p>
            </div>
            
            <div className="bg-gray-700 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-gray-600 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">Phyrexian Guildpact</h3>
              <p className="text-gray-400 text-sm">Analysis · EDHRec</p>
            </div>
            
            <div className="bg-gray-700 rounded-xl p-6 aspect-square flex flex-col justify-end hover:bg-gray-600 transition-colors">
              <h3 className="text-white font-semibold text-base mb-2">MTG Arena Updates</h3>
              <p className="text-gray-400 text-sm">News · Wizards of the Coast</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button className="border border-gray-600 text-gray-300 px-6 py-3 rounded-full text-sm hover:bg-gray-800 hover:border-gray-500 transition-all">
              View all
            </button>
          </div>
        </div>


      </div>
    </>
  );
}
