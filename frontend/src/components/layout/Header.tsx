
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const Header = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="toefl-container py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Book className="h-6 w-6 text-toefl-blue" />
            <span className="text-xl font-bold bg-gradient-to-r from-toefl-blue to-toefl-purple bg-clip-text text-transparent">
              TOEFL Test Mastery
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="text-sm text-gray-600 mr-2">
                  Welcome, <span className="font-medium">{user?.username}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <Button onClick={() => navigate('/register')} size="sm" className="gap-1">
                  <User className="h-4 w-4" />
                  Register
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
