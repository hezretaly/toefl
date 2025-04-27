
import React from 'react';
import { Book } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 py-8 mt-auto">
      <div className="toefl-container">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <Book className="h-5 w-5 text-toefl-purple" />
            <span className="text-lg font-semibold text-gray-800">
              TOEFL Test Mastery
            </span>
          </div>
          
          <div className="text-sm text-gray-600 text-center sm:text-right">
            <p>&copy; {new Date().getFullYear()} TOEFL Test Mastery. All rights reserved.</p>
            <p className="mt-1">An interactive platform for TOEFL exam preparation.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
