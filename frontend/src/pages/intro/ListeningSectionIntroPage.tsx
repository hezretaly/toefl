
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Headphones, Clock, VolumeX, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSectionById } from '@/services/api';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const ListeningSectionIntroPage = () => {
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
        const section = await fetchSectionById('listening', Number(sectionId), token);
        setSectionTitle(section.title);
      } catch (error) {
        console.error('Error fetching listening section:', error);
        toast.error('Failed to load section details. Please try again later.');
        navigate('/listening');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (sectionId) {
      loadSection();
    }
  }, [sectionId, token, isAuthenticated, navigate]);
  
  const handleStartTest = () => {
    navigate(`/listening/${sectionId}`);
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
            <CardHeader className="bg-toefl-purple text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <Headphones className="h-6 w-6" />
                <CardTitle className="text-2xl">Listening Test: {sectionTitle}</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="pt-6 pb-8">
              <h2 className="text-xl font-semibold mb-6">Before You Begin</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Headphones className="h-6 w-6 text-toefl-purple" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Audio Equipment</h3>
                    <p className="text-gray-600">
                      Make sure your audio equipment is working properly. You'll need to listen to lectures and conversations.
                      Use headphones for the best experience if available.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-toefl-purple" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Time Limit</h3>
                    <p className="text-gray-600">
                      The listening section will take approximately 30 minutes to complete.
                      Each audio clip can only be played once, just like in the real TOEFL test.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <VolumeX className="h-6 w-6 text-toefl-purple" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Quiet Environment</h3>
                    <p className="text-gray-600">
                      Find a quiet place to take the test. Background noise can interfere with your ability to hear the audio clearly.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Info className="h-6 w-6 text-toefl-purple" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Scoring</h3>
                    <p className="text-gray-600">
                      Your score will be calculated based on the number of correct answers.
                      You will see your score immediately after completing the test.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-center border-t pt-6 pb-6">
              <Button size="lg" onClick={handleStartTest} className="gap-2">
                Begin Listening Test
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

export default ListeningSectionIntroPage;
