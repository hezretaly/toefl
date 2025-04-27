
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, Clock, VolumeX, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSectionById } from '@/services/api';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const SpeakingSectionIntroPage = () => {
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
        const section = await fetchSectionById('speaking', Number(sectionId), token);
        setSectionTitle(section.title);
      } catch (error) {
        console.error('Error fetching speaking section:', error);
        toast.error('Failed to load section details. Please try again later.');
        navigate('/speaking');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (sectionId) {
      loadSection();
    }
  }, [sectionId, token, isAuthenticated, navigate]);
  
  const handleStartTest = () => {
    navigate(`/speaking/${sectionId}`);
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
            <CardHeader className="bg-toefl-green text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <Mic className="h-6 w-6" />
                <CardTitle className="text-2xl">Speaking Test: {sectionTitle}</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="pt-6 pb-8">
              <h2 className="text-xl font-semibold mb-6">Before You Begin</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Mic className="h-6 w-6 text-toefl-green" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Microphone Access</h3>
                    <p className="text-gray-600">
                      This test requires microphone access. Please ensure your microphone is working 
                      and you allow the browser to use it when prompted.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-toefl-green" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Time Constraints</h3>
                    <p className="text-gray-600">
                      Each speaking task has strict time limits for preparation and response.
                      The timer will be displayed on screen for each section.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <VolumeX className="h-6 w-6 text-toefl-green" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Quiet Environment</h3>
                    <p className="text-gray-600">
                      Find a quiet place to take the test. Background noise can interfere with your recordings
                      and make evaluation difficult.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Info className="h-6 w-6 text-toefl-green" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Scoring</h3>
                    <p className="text-gray-600">
                      Your speaking responses will be stored for evaluation. You will receive feedback
                      on your performance after review.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-center border-t pt-6 pb-6">
              <Button size="lg" onClick={handleStartTest} className="gap-2">
                Begin Speaking Test
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

export default SpeakingSectionIntroPage;
