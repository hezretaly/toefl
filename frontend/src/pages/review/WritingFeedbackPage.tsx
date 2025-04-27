
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileEdit, CheckCircle, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Mock data for a writing response
const mockWritingTasks = [
  {
    id: 1,
    taskNumber: 1,
    prompt: "Summarize the points made in the lecture, being sure to explain how they cast doubt on specific points made in the reading passage.",
    responseText: "The lecturer contradicts the information provided in the reading passage regarding the causes of dinosaur extinction. While the reading suggests that a meteor impact was the sole cause, the lecturer presents alternative theories. First, he mentions that volcanic activity was already causing climate changes before the meteor impact. Second, he points out that dinosaur populations were gradually declining over millions of years rather than disappearing suddenly. Finally, he argues that some species did survive the meteor impact, contradicting the claim of complete extinction from a single event. This evidence suggests that the extinction was likely caused by multiple factors working together rather than just one catastrophic event."
  },
  {
    id: 2,
    taskNumber: 2,
    prompt: "Do you agree or disagree with the following statement? Technology has made it easier for people to connect with one another. Use specific reasons and examples to support your answer.",
    responseText: "I strongly agree that technology has made it easier for people to connect with one another. Through various means such as social media, video calling, and messaging apps, people from different parts of the world can communicate instantaneously, which was impossible just a few decades ago.\n\nFirst, social media platforms like Facebook, Instagram, and Twitter have revolutionized how we maintain relationships. I can personally attest to this as I regularly use Facebook to stay updated about my friends who live abroad. For example, my childhood friend moved to Australia five years ago, but I still feel connected to her life because I can see her photos, comment on her posts, and send her direct messages anytime.\n\nSecond, video calling applications such as Zoom and FaceTime have eliminated distance barriers. During the COVID-19 pandemic, these tools became essential for both professional and personal connections. My family used Zoom for weekly gatherings when we couldn't meet in person, allowing my grandmother to see and talk to all her grandchildren despite the physical distance.\n\nFinally, instant messaging has made communication more convenient and frequent. Apps like WhatsApp and WeChat allow people to send messages, voice notes, and share files instantly. I communicate with my colleagues through a WhatsApp group, which has improved our team coordination significantly.\n\nHowever, it's important to acknowledge that technology-based connections sometimes lack the depth of face-to-face interactions. Nevertheless, the benefits of technology in facilitating human connection far outweigh this limitation.\n\nIn conclusion, technology has undeniably made it easier for people to connect with one another by providing various platforms for instant communication across distances, maintaining relationships that might otherwise fade, and facilitating both personal and professional connections."
  }
];

const criteriaLabels = [
  { key: "task", label: "Task Achievement", description: "How well the response addresses the task" },
  { key: "coherence", label: "Coherence & Cohesion", description: "How well-organized and logical the response is" },
  { key: "vocabulary", label: "Vocabulary Range", description: "The variety and accuracy of vocabulary used" },
  { key: "grammar", label: "Grammatical Range & Accuracy", description: "The range and accuracy of grammar structures" }
];

const WritingFeedbackPage = () => {
  const { secId, studentId } = useParams<{ secId: string; studentId: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTask, setActiveTask] = useState(0);
  const [scores, setScores] = useState([
    { task: 0, coherence: 0, vocabulary: 0, grammar: 0 },
    { task: 0, coherence: 0, vocabulary: 0, grammar: 0 }
  ]);
  const [feedback, setFeedback] = useState<string[]>(["", ""]);
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
  
  const handleScoreChange = (taskIndex: number, criterion: string, value: number[]) => {
    const newScores = [...scores];
    newScores[taskIndex] = { ...newScores[taskIndex], [criterion]: value[0] };
    setScores(newScores);
  };
  
  const handleFeedbackChange = (index: number, value: string) => {
    const newFeedback = [...feedback];
    newFeedback[index] = value;
    setFeedback(newFeedback);
  };
  
  const calculateTotalScore = (taskIndex: number) => {
    const taskScores = scores[taskIndex];
    return (taskScores.task + taskScores.coherence + taskScores.vocabulary + taskScores.grammar) / 4;
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // In a real implementation, this would submit the feedback and scores to the API
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Feedback submitted successfully');
      navigate(`/review/writing/${secId}`);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const allTasksScored = scores.every(taskScore => 
    Object.values(taskScore).every(score => score > 0)
  );
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
                onClick={() => navigate(`/review/writing/${secId}`)}
                className="pl-0 mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Student List
              </Button>
              
              <h1 className="text-3xl font-bold mb-2">Review Writing Responses</h1>
              <p className="text-gray-600">
                Read the student's essays and provide scores and feedback.
              </p>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="space-y-4">
                {mockWritingTasks.map((task, index) => (
                  <Card 
                    key={task.id} 
                    className={`cursor-pointer transition-all ${
                      activeTask === index 
                        ? 'border-toefl-orange shadow-md' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTask(index)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          calculateTotalScore(index) > 0 ? 'bg-orange-100' : 'bg-gray-100'
                        }`}>
                          {calculateTotalScore(index) > 0 
                            ? <CheckCircle className="h-5 w-5 text-toefl-orange" />
                            : <FileEdit className="h-5 w-5 text-gray-400" />
                          }
                        </div>
                        <div>
                          <div className="font-medium">Task {task.taskNumber}</div>
                          {calculateTotalScore(index) > 0 && (
                            <div className="text-sm text-toefl-orange">
                              Score: {calculateTotalScore(index).toFixed(1)}/5
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {activeTask === index && (
                        <div className="w-2 h-2 rounded-full bg-toefl-orange" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-3">
              <Card className="shadow-md">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-xl">Task {mockWritingTasks[activeTask].taskNumber}</CardTitle>
                </CardHeader>
                
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Writing Prompt</h3>
                    <p className="p-4 bg-gray-50 rounded-md border text-gray-700">
                      {mockWritingTasks[activeTask].prompt}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Student Response</h3>
                    <div className="p-4 bg-white rounded-md border border-gray-200 max-h-[300px] overflow-y-auto whitespace-pre-line">
                      {mockWritingTasks[activeTask].responseText}
                    </div>
                    <div className="text-right text-sm text-gray-500 mt-1">
                      Word count: {mockWritingTasks[activeTask].responseText.split(/\s+/).length}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-4">Evaluation</h3>
                    
                    <div className="space-y-6">
                      {criteriaLabels.map(criterion => (
                        <div key={criterion.key} className="space-y-2">
                          <div className="flex justify-between">
                            <label className="text-gray-700 font-medium">{criterion.label}</label>
                            <span className="font-bold">
                              {scores[activeTask][criterion.key as keyof typeof scores[0]]}/5
                            </span>
                          </div>
                          <Slider
                            value={[scores[activeTask][criterion.key as keyof typeof scores[0]]]}
                            min={0}
                            max={5}
                            step={1}
                            onValueChange={(value) => 
                              handleScoreChange(activeTask, criterion.key, value)
                            }
                          />
                          <p className="text-xs text-gray-500">{criterion.description}</p>
                        </div>
                      ))}
                      
                      <div className="pt-4">
                        <label className="block text-gray-700 font-medium mb-2">
                          Detailed Feedback
                        </label>
                        <Textarea
                          placeholder="Provide detailed feedback on the student's writing..."
                          className="min-h-[150px]"
                          value={feedback[activeTask]}
                          onChange={(e) => handleFeedbackChange(activeTask, e.target.value)}
                        />
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md flex justify-between items-center">
                        <div>
                          <span className="text-gray-700 font-medium">Overall Score:</span>
                          <span className="text-xl font-bold ml-2 text-toefl-orange">
                            {calculateTotalScore(activeTask).toFixed(1)}/5
                          </span>
                        </div>
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

export default WritingFeedbackPage;
