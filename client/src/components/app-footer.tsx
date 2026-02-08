import { Link } from "wouter";
import { Shield } from "lucide-react";

export function AppFooter() {
  // Check if user is admin (same logic as header)
  const userRole = localStorage.getItem("userRole");
  const isAdmin = userRole === "admin";
  
  // For development: also check if we're in development mode and no user is set
  const isDev = import.meta.env.DEV;
  const showAdminLink = isAdmin || (isDev && !userRole);

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} AbateIQ.
            </p>
          </div>
          
	          <div className="flex items-center space-x-6">
	            <div className="flex items-center space-x-4 text-sm">
	              {/* Admin-only link */}
	              {showAdminLink && (
	                <>
	                  <Link href="/admin">
	                    <span className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer font-medium" data-testid="footer-admin-link">
	                      <Shield className="h-3 w-3 mr-1" />
	                      Admin Dashboard
	                    </span>
	                  </Link>
	                </>
	              )}
	            </div>
	          </div>
	        </div>
	      </div>
	    </footer>
  );
}
