import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';

import Register from './components/auth/Register';
import Login from './components/auth/Login';
import { AuthProvider } from './context/AuthContext';

import ReadingSectionIntroPage from './pages/ReadingSectionIntroPage';
import ListeningSectionIntroPage from './pages/ListeningSectionIntroPage';
import SpeakingSectionIntroPage from './pages/SpeakingSectionIntroPage';
import WritingSectionIntroPage from './pages/WritingSectionIntroPage';
import SectionSelectionPage from './pages/SectionSelectionPage';
import ReadingSectionPage from './pages/ReadingSectionPage';
import ListeningSectionPage from './pages/ListeningSectionPage';
import SpeakingSectionPage from './pages/SpeakingSectionPage';
import WritingSectionPage from './pages/WritingSectionPage';
import ReviewPage from './pages/ReviewPage';
import AdminRoutes from './routes/AdminRoutes';

import AddReadingSectionPage from './pages/admin/reading/AddReadingSectionPage';
import AddListeningSection from './pages/admin/listening/AddListeningSection';
import AddSpeakingSection from './pages/admin/speaking/AddSpeakingSection';
import AddWritingSection from './pages/admin/writing/AddWritingSection';

import TestingPage from './pages/testingPage';

// CSS imports
import './App.css';


const App: React.FC = () => {
  return (
    
      <Router>
        <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<SectionSelectionPage />} />
          <Route path='/register' element={<Register />} />
          <Route path='/login' element={<Login />} />

          <Route path='/reading-intro' element={<ReadingSectionIntroPage />} />
          <Route path='/listening-intro' element={<ListeningSectionIntroPage />} />
          <Route path='/speaking-intro' element={<SpeakingSectionIntroPage />} />
          <Route path='/writing-intro' element={<WritingSectionIntroPage />} />
          <Route path="/reading" element={<ReadingSectionPage />} />
          <Route path="/listening" element={<ListeningSectionPage />} />
          <Route path="/speaking" element={<SpeakingSectionPage />} />
          <Route path="/writing" element={<WritingSectionPage />} />
          <Route path="/review" element={<ReviewPage />} />

          {/* minimal section pages */}
          <Route path="/add-reading-section" element={<AddReadingSectionPage />} />
          <Route path="/add-listening-section" element={<AddListeningSection />} />
          <Route path="/add-speaking-section" element={<AddSpeakingSection />} />
          <Route path="/add-writing-section" element={<AddWritingSection />} />

          <Route path='/testing' element={<TestingPage />} />


          {/* Admin Routes */}
          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* Fallback route */}
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
        </AuthProvider>
      </Router>
    
  );
};

export default App;
