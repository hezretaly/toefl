import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Save, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSectionById, submitReadingAnswers } from '@/services/api';
import Header from '@/components/layout/Header';
import Timer from '@/components/test/Timer';
import Footer from '@/components/layout/Footer';

interface Option {
  id: number;
  option_text: string;
}

interface Question {
  id: number;
  type: string;
  prompt: string;
  options: string[];
}

interface ReadingPassage {
  id: number;
  title: string;
  content: string;
  questions: Question[];
}

interface ReadingSection {
  id: number;
  title: string;
  passages: ReadingPassage[];
}

const ReadingTest = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const [section, setSection] = useState<ReadingSection | null>(null);
  const [answers, setAnswers] = useState<Record<number, Record<number, string[]>>>({});
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  
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
        const data = await fetchSectionById('reading', Number(sectionId), token);
        setSection(data);
        
        const initialAnswers: Record<number, Record<number, string[]>> = {};
        data.passages.forEach(passage => {
          initialAnswers[passage.id] = {};
          passage.questions.forEach(question => {
            initialAnswers[passage.id][question.id] = [];
          });
        });
        setAnswers(initialAnswers);
      } catch (error) {
        console.error('Error fetching reading section:', error);
        toast.error('Failed to load reading section. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (sectionId) {
      loadSection();
    }
  }, [sectionId, token, isAuthenticated, navigate]);
  
  const handleAnswerChange = (passageId: number, questionId: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [passageId]: {
        ...prev[passageId],
        [questionId]: [value]
      }
    }));
  };
  
  const handleSubmit = async () => {
    if (!section) return;
    
    setIsSubmitting(true);
    try {
      const response = await submitReadingAnswers(
        Number(sectionId),
        answers,
        token
      );
      
      setScore(response.score);
      setIsComplete(true);
      toast.success('Test completed successfully!');
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast.error('Failed to submit answers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleNextPassage = () => {
    if (!section) return;
    if (currentPassageIndex < section.passages.length - 1) {
      setCurrentPassageIndex(currentPassageIndex + 1);
      window.scrollTo(0, 0);
    }
  };
  
  const handlePrevPassage = () => {
    if (currentPassageIndex > 0) {
      setCurrentPassageIndex(currentPassageIndex - 1);
      window.scrollTo(0, 0);
    }
  };
  
  const calculateProgress = () => {
    if (!section) return 0;
    return ((currentPassageIndex + 1) / section.passages.length) * 100;
  };
  
  const currentPassage = section?.passages[currentPassageIndex];
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse-light text-2xl font-semibold mb-2">Loading Reading Test...</div>
            <p className="text-gray-500">Please wait while we prepare your test.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!section) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-semibold mb-2 text-red-500">Error</div>
            <p className="text-gray-700">Failed to load the reading section. Please try again later.</p>
            <Button className="mt-4" onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (isComplete) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 py-8">
          <div className="toefl-container max-w-4xl">
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-toefl-green" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Test Complete!</h2>
                  <p className="text-gray-600 mb-4">
                    Thank you for completing the reading section.
                  </p>
                  
                  <div className="inline-block bg-gray-100 rounded-lg px-6 py-4 mb-6">
                    <h3 className="text-lg mb-1">Your Score</h3>
                    <p className="text-4xl font-bold text-toefl-blue">{score}</p>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <Button onClick={() => navigate('/dashboard')}>
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="toefl-container">
          {/* Test header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{section.title}</h1>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="mr-1 h-4 w-4" />
                <span>Reading Section • Passage {currentPassageIndex + 1} of {section.passages.length}</span>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0">
              <Timer initialMinutes={20} onTimeout={() => {
                toast.warning("Time's up! Your answers will be automatically submitted.");
                handleSubmit();
              }} />
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div 
              className="bg-toefl-blue h-2 rounded-full" 
              style={{ width: `${calculateProgress()}%` }} 
            />
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Reading passage */}
            <div className="lg:w-1/2">
              <div className="sticky top-4">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">{currentPassage?.title}</h2>
                    <div 
                      className="reading-passage max-w-none overflow-auto max-h-[70vh] border-l-4 border-toefl-blue pl-4 py-2"
                      dangerouslySetInnerHTML={{ __html: currentPassage?.content || '' }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Questions */}
            <div className="lg:w-1/2 space-y-8">
              {currentPassage?.questions.map((question, index) => (
                <Card key={question.id} className="shadow-sm">
                  <CardContent className="p-6">
                    <div className="question-prompt">
                      <span className="inline-block bg-gray-100 rounded-full w-8 h-8 text-center leading-8 mr-2">
                        {index + 1}
                      </span>
                      {question.prompt}
                    </div>
                    
                    <RadioGroup 
                      value={answers[currentPassage.id][question.id][0] || ''}
                      onValueChange={(value) => 
                        handleAnswerChange(currentPassage.id, question.id, value)
                      }
                      className="mt-4 space-y-3"
                    >
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="test-option">
                          <RadioGroupItem 
                            value={String.fromCharCode(97 + optIndex)} 
                            id={`q${question.id}-opt${optIndex}`}
                            className="mr-3"
                          />
                          <Label 
                            htmlFor={`q${question.id}-opt${optIndex}`}
                            className="cursor-pointer flex-1"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Navigation buttons */}
          <div className="mt-8 flex justify-between">
            <Button 
              variant="outline"
              onClick={handlePrevPassage}
              disabled={currentPassageIndex === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Passage
            </Button>
            
            {currentPassageIndex < section.passages.length - 1 ? (
              <Button 
                onClick={handleNextPassage}
                className="gap-2"
              >
                Next Passage
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <span className="animate-pulse-light">Submitting...</span>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Submit Answers
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ReadingTest;
