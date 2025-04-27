
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSections } from '@/services/api';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface Section {
  id: number;
  title: string;
}

const ListeningSectionsPage = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const loadSections = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSections('listening', token);
        setSections(data.sections);
      } catch (error) {
        console.error('Error fetching listening sections:', error);
        toast.error('Failed to load listening sections. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSections();
  }, [token, isAuthenticated, navigate]);
  
  const handleStartTest = (sectionId: number) => {
    navigate(`/listening-intro/${sectionId}`);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="toefl-container">
          <div className="flex flex-col lg:flex-row items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Listening Sections</h1>
              <p className="text-gray-600">
                Choose a listening section to practice your comprehension skills.
              </p>
            </div>
            
            <div className="mt-4 lg:mt-0">
              <Button 
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse text-xl text-gray-400">Loading sections...</div>
            </div>
          ) : sections.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.map((section) => (
                <Card key={section.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="bg-toefl-purple text-white rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Headphones className="h-5 w-5" />
                      <CardTitle>Listening Test</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <h3 className="text-xl font-semibold mb-4">{section.title}</h3>
                    <p className="text-gray-600">
                      Practice your listening skills with academic lectures and conversations.
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end pt-4 border-t">
                    <Button onClick={() => handleStartTest(section.id)}>
                      Start Test
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <Headphones className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">No Listening Sections Available</h3>
              <p className="text-gray-500 mb-6">Check back later for new listening tests.</p>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ListeningSectionsPage;
