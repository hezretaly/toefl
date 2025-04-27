
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, Play, CheckCircle, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Mock data for a speaking response
const mockSpeakingTasks = [
  {
    id: 1,
    taskNumber: 1,
    prompt: "Talk about a teacher who has influenced you the most and explain why this person had such an influence on you.",
    audioUrl: "#"
  },
  {
    id: 2,
    taskNumber: 2,
    prompt: "Some people prefer to get up early in the morning and start work. Others prefer to get up later and work until late at night. Which do you prefer and why?",
    audioUrl: "#"
  },
  {
    id: 3,
    taskNumber: 3,
    prompt: "Based on the lecture and reading, explain the concept of photosynthesis and its importance to life on Earth.",
    audioUrl: "#"
  },
  {
    id: 4,
    taskNumber: 4,
    prompt: "Describe a technology that you think will be important in the future and explain why you think it will be important.",
    audioUrl: "#"
  }
];

const SpeakingFeedbackPage = () => {
  const { secId, studentId } = useParams<{ secId: string; studentId: string }>();
  const { isAuthenticated, isLoading } = useAuth(); // <--- Add isLoading
  const navigate = useNavigate();
  
  const [activeTask, setActiveTask] = useState(0);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);
  const [feedback, setFeedback] = useState<string[]>(["", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  React.useEffect(() => {
      // --- Add isLoading check ---
      // If still loading, do nothing and wait for the next effect run
      if (isLoading) {
        return;
      }
  
      // Only redirect if loading is finished AND user is not authenticated
      if (!isLoading && !isAuthenticated) {
        console.log("ReviewPage: Auth check complete, user NOT authenticated. Redirecting.");
        navigate('/login');
      } else if (!isLoading && isAuthenticated) {
        console.log("ReviewPage: Auth check complete, user IS authenticated. No redirect.");
      }
      // --- End modification ---
  
    }, [isAuthenticated, isLoading, navigate]); // <--- Add isLoading to dependency array
  
    // --- Optional: Add a loading indicator while auth check is running ---
    if (isLoading) {
      return (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 flex items-center justify-center">
              <div>Checking authentication status...</div> {/* Or a spinner */}
          </main>
          <Footer />
        </div>
      );
    }
    // --- End optional loading indicator ---
  
  const handleScoreChange = (index: number, value: number[]) => {
    const newScores = [...scores];
    newScores[index] = value[0];
    setScores(newScores);
  };
  
  const handleFeedbackChange = (index: number, value: string) => {
    const newFeedback = [...feedback];
    newFeedback[index] = value;
    setFeedback(newFeedback);
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // In a real implementation, this would submit the feedback and scores to the API
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Feedback submitted successfully');
      navigate(`/review/speaking/${secId}`);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const allTasksScored = scores.every(score => score > 0);
  const allTasksFeedback = feedback.every(fb => fb.trim().length > 0);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="toefl-container max-w-5xl">
          <div className="flex flex-col lg:flex-row items-start justify-between mb-8">
            <div>
              <Button 
                variant="ghost"
                onClick={() => navigate(`/review/speaking/${secId}`)}
                className="pl-0 mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Student List
              </Button>
              
              <h1 className="text-3xl font-bold mb-2">Review Speaking Responses</h1>
              <p className="text-gray-600">
                Listen to the student's responses and provide scores and feedback.
              </p>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="space-y-4">
                {mockSpeakingTasks.map((task, index) => (
                  <Card 
                    key={task.id} 
                    className={`cursor-pointer transition-all ${
                      activeTask === index 
                        ? 'border-toefl-green shadow-md' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTask(index)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          scores[index] > 0 ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {scores[index] > 0 
                            ? <CheckCircle className="h-5 w-5 text-toefl-green" />
                            : <Mic className="h-5 w-5 text-gray-400" />
                          }
                        </div>
                        <div>
                          <div className="font-medium">Task {task.taskNumber}</div>
                          {scores[index] > 0 && (
                            <div className="text-sm text-toefl-green">Score: {scores[index]}/5</div>
                          )}
                        </div>
                      </div>
                      
                      {activeTask === index && (
                        <div className="w-2 h-2 rounded-full bg-toefl-green" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-3">
              <Card className="shadow-md">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-xl">Task {mockSpeakingTasks[activeTask].taskNumber}</CardTitle>
                </CardHeader>
                
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Speaking Prompt</h3>
                    <p className="p-4 bg-gray-50 rounded-md border text-gray-700">
                      {mockSpeakingTasks[activeTask].prompt}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Student Response</h3>
                    <Button variant="outline" className="w-full py-8 gap-2">
                      <Play className="h-5 w-5" />
                      Play Student Recording
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-4">Evaluation</h3>
                    
                    <div className="space-y-8">
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-gray-700 font-medium">Score (1-5)</label>
                          <span className="font-bold text-lg">{scores[activeTask]}</span>
                        </div>
                        <Slider
                          value={[scores[activeTask]]}
                          min={0}
                          max={5}
                          step={1}
                          onValueChange={(value) => handleScoreChange(activeTask, value)}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>1 - Poor</span>
                          <span>3 - Average</span>
                          <span>5 - Excellent</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 font-medium mb-2">
                          Feedback for Student
                        </label>
                        <Textarea
                          placeholder="Provide detailed feedback on the student's response..."
                          className="min-h-[150px]"
                          value={feedback[activeTask]}
                          onChange={(e) => handleFeedbackChange(activeTask, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || !allTasksScored || !allTasksFeedback}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Submitting...</span>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Submit All Feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SpeakingFeedbackPage;
