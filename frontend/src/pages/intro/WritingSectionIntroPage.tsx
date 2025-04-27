
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileEdit, Clock, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSectionById } from '@/services/api';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const WritingSectionIntroPage = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const [sectionTitle, setSectionTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const loadSection = async () => {
      setIsLoading(true);
      try {
        const section = await fetchSectionById('writing', Number(sectionId), token);
        setSectionTitle(section.title);
      } catch (error) {
        console.error('Error fetching writing section:', error);
        toast.error('Failed to load section details. Please try again later.');
        navigate('/writing');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (sectionId) {
      loadSection();
    }
  }, [sectionId, token, isAuthenticated, navigate]);
  
  const handleStartTest = () => {
    navigate(`/writing/${sectionId}`);
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-2xl text-gray-400">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="toefl-container max-w-4xl">
          <Card className="shadow-md">
            <CardHeader className="bg-toefl-orange text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <FileEdit className="h-6 w-6" />
                <CardTitle className="text-2xl">Writing Test: {sectionTitle}</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="pt-6 pb-8">
              <h2 className="text-xl font-semibold mb-6">Before You Begin</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <FileEdit className="h-6 w-6 text-toefl-orange" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Writing Tasks</h3>
                    <p className="text-gray-600">
                      This test includes two writing tasks: an integrated task that combines reading, listening, and writing,
                      and an independent task where you'll express and support your opinion on a topic.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-toefl-orange" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Time Limits</h3>
                    <p className="text-gray-600">
                      You'll have 20 minutes for the integrated task and 30 minutes for the independent task.
                      The timer for each task will be displayed on screen.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <Info className="h-6 w-6 text-toefl-orange" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Scoring</h3>
                    <p className="text-gray-600">
                      Your essays will be evaluated based on development, organization, language use, and grammar.
                      You will receive feedback after your essays have been reviewed.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-center border-t pt-6 pb-6">
              <Button size="lg" onClick={handleStartTest} className="gap-2">
                Begin Writing Test
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default WritingSectionIntroPage;
