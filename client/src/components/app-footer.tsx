import { Link } from "wouter";
import { Shield, ExternalLink } from "lucide-react";

export function AppFooter() {
  // Check if user is admin (same logic as header)
  const userRole = localStorage.getItem("userRole");
  const isAdmin = userRole === "admin";

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 SiteSense. Professional site survey management.
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 text-sm">
              <Link href="/settings">
                <span className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
                  Privacy
                </span>
              </Link>
              <Link href="/settings">
                <span className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
                  Terms
                </span>
              </Link>
              <Link href="/settings">
                <span className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
                  Support
                </span>
              </Link>
              
              {/* Admin-only link */}
              {isAdmin && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <Link href="/admin">
                    <span className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer font-medium" data-testid="footer-admin-link">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin Dashboard
                      <ExternalLink className="h-3 w-3 ml-1" />
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