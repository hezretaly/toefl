
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Info, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSectionById } from '@/services/api';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const ReadingSectionIntroPage = () => {
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
        const section = await fetchSectionById('reading', Number(sectionId), token);
        setSectionTitle(section.title);
      } catch (error) {
        console.error('Error fetching reading section:', error);
        toast.error('Failed to load section details. Please try again later.');
        navigate('/reading');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (sectionId) {
      loadSection();
    }
  }, [sectionId, token, isAuthenticated, navigate]);
  
  const handleStartTest = () => {
    navigate(`/reading/${sectionId}`);
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
            <CardHeader className="bg-toefl-blue text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6" />
                <CardTitle className="text-2xl">Reading Test: {sectionTitle}</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="pt-6 pb-8">
              <h2 className="text-xl font-semibold mb-6">Before You Begin</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-toefl-blue" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Time Limit</h3>
                    <p className="text-gray-600">
                      You will have 20 minutes to complete this reading section.
                      The timer will start when you begin the test.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <BookOpen className="h-6 w-6 text-toefl-blue" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Reading Passages</h3>
                    <p className="text-gray-600">
                      The test contains academic reading passages followed by questions to test your comprehension.
                      Read each passage carefully before answering the questions.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 border-b pb-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <CheckCircle className="h-6 w-6 text-toefl-blue" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Answering Questions</h3>
                    <p className="text-gray-600">
                      Select the best answer for each question. You can navigate between passages using the buttons at the bottom of the page.
                      Your answers will be automatically saved as you progress.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Info className="h-6 w-6 text-toefl-blue" />
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
                Begin Reading Test
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

export default ReadingSectionIntroPage;
