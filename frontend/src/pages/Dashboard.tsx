
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, Mic, FileEdit, BarChart, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSections } from '@/services/api';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface Section {
  id: number;
  title: string;
}

interface SectionData {
  total: number;
  sections: Section[];
}

const Dashboard = () => {
  const [readingSections, setReadingSections] = useState<SectionData | null>(null);
  const [listeningSections, setListeningSections] = useState<SectionData | null>(null);
  const [speakingSections, setSpeakingSections] = useState<SectionData | null>(null);
  const [writingSections, setWritingSections] = useState<SectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { token, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const loadSections = async () => {
      setIsLoading(true);
      try {
        const [readings, listenings, speakings, writings] = await Promise.all([
          fetchSections('reading', token),
          fetchSections('listening', token),
          fetchSections('speaking', token),
          fetchSections('writing', token),
        ]);
        
        setReadingSections(readings);
        setListeningSections(listenings);
        setSpeakingSections(speakings);
        setWritingSections(writings);
      } catch (error) {
        console.error('Error fetching sections:', error);
        toast.error('Failed to load test sections. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSections();
  }, [token, isAuthenticated, navigate]);
  
  const handleStartTest = (type: string, sectionId: number) => {
    navigate(`/${type}/${sectionId}`);
  };

  const handleProgressReportClick = () => {
    // Check if user data is available and the role is 'admin'
    if (user && user.role === 'admin') {
      navigate('/create-section'); // Navigate admin to create section page
    } else {
      // Handle non-admin users (optional)
      // For example, navigate them to a different page or show a message
      toast.info("Progress report view is not available yet.");
      // navigate('/my-progress'); // Example: navigate to a general user progress page
    }
  };
  
  const renderSections = (
    type: string, 
    sections: SectionData | null, 
    icon: React.ReactNode, 
    description: string,
    bgClass: string
  ) => {
    return (
      <Card className="h-full">
        <CardHeader className={`rounded-t-lg ${bgClass}`}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-xl flex items-center gap-2">
              {icon}
              <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </CardTitle>
            <div className="bg-white text-gray-800 text-sm font-medium px-2 py-1 rounded-full">
              {sections?.total || 0} available
            </div>
          </div>
          <CardDescription className="text-white/80">
            {description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse-light text-gray-400">Loading sections...</div>
            </div>
          ) : sections?.sections.length ? (
            <div className="space-y-3">
              {sections.sections.slice(0, 3).map((section) => (
                <div 
                  key={section.id} 
                  className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="font-medium">{section.title}</div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleStartTest(type, section.id)}
                  >
                    Start
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No {type} sections available
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center border-t p-4">
          <Button
            variant="ghost" 
            className="w-full"
            onClick={() => navigate(`/${type}`)}
          >
            View All {type.charAt(0).toUpperCase() + type.slice(1)} Tests
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="toefl-container">
          <div className="flex flex-col lg:flex-row items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-gray-600">
                Welcome{user ? `, ${user.username}` : ''}! Select a section to start practicing.
              </p>
            </div>
            
            <div className="mt-4 lg:mt-0">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleProgressReportClick}
              >
                {user?.role === 'admin' ? (
                  <> 
                    <PlusCircle className="h-4 w-4" />
                    <span>Create Test Section</span> 
                  </>
                ) : (
                  <> 
                    <BarChart className="h-4 w-4" />
                    <span>View Progress Report</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderSections(
              'reading', 
              readingSections, 
              <BookOpen className="h-5 w-5" />, 
              "Practice academic reading passages and questions",
              "bg-toefl-blue"
            )}
            
            {renderSections(
              'listening', 
              listeningSections, 
              <Headphones className="h-5 w-5" />, 
              "Enhance your listening comprehension skills",
              "bg-toefl-purple"
            )}
            
            {renderSections(
              'speaking', 
              speakingSections, 
              <Mic className="h-5 w-5" />, 
              "Record and practice speaking responses",
              "bg-toefl-green"
            )}
            
            {renderSections(
              'writing', 
              writingSections, 
              <FileEdit className="h-5 w-5" />, 
              "Develop your academic writing skills",
              "bg-toefl-orange"
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
