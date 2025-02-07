import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo/Brand */}
            <div className="flex-shrink-0">
              <Link to="/" className="text-xl font-bold text-blue-600">
                RealLeads
              </Link>
            </div>
            {/* Navigation Links */}
            <div className="ml-10 flex items-center space-x-8">
              <Link
                to="/"
                className={`px-3 py-4 text-sm font-medium border-b-2 ${
                  isActive("/")
                    ? "border-blue-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/leads"
                className={`px-3 py-4 text-sm font-medium border-b-2 ${
                  isActive("/leads")
                    ? "border-blue-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Leads
              </Link>
              <Link
                to="/messages"
                className={`px-3 py-4 text-sm font-medium border-b-2 ${
                  isActive("/messages")
                    ? "border-blue-500 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Messages
              </Link>
              <a
                href="#"
                className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 px-3 py-4 text-sm font-medium"
              >
                Analytics
              </a>
              <a
                href="#"
                className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 px-3 py-4 text-sm font-medium"
              >
                Settings
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
