import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileEdit, Clock, Book, Headphones, Save, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSectionById, submitWritingAnswers } from '@/services/api'; // Assuming this fetches the raw JSON provided
import Header from '@/components/layout/Header';
import Timer from '@/components/test/Timer';
import AudioPlayer from '@/components/test/AudioPlayer';
import Footer from '@/components/layout/Footer';

// --- Interfaces remain the same, defining the desired structure ---
interface WritingTask {
  id: number;
  task_number: number;
  passage?: string | null; // Allow null based on JSON
  prompt: string;
  audio_url?: string | null; // Allow null based on JSON
  time_limit: number; // This will be added during transformation
}

interface WritingSection {
  id: number;
  title: string;
  tasks: WritingTask[]; // The component expects tasks as an array
}

// --- Raw Data Structure (as received from backend) ---
// This interface is just for type safety during transformation
interface RawWritingTaskData {
  id: number;
  task_number: number;
  passage?: string | null;
  prompt: string;
  audio_url?: string | null;
  // time_limit is missing here
}

interface RawSectionData {
    id: number;
    title: string;
    task1?: RawWritingTaskData;
    task2?: RawWritingTaskData;
    // Potentially more task keys like task3, task4...
    [key: string]: any; // Allow dynamic task keys
}


const WritingSectionPage = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const [section, setSection] = useState<WritingSection | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [wordCounts, setWordCounts] = useState<Record<number, number>>({});

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
        // Fetch the raw data with the structure { id, title, task1: {...}, task2: {...} }
        const rawData: RawSectionData = await fetchSectionById('writing', Number(sectionId), token);

        // --- Data Transformation ---
        const tasks: WritingTask[] = [];
        // Define default time limits in seconds (e.g., 20 mins for Task 1, 10 mins for Task 2)
        // Adjust these values as needed for your specific test structure
        const defaultTimeLimits: Record<number, number> = {
          1: 1200, // 20 minutes for task_number 1
          2: 600   // 10 minutes for task_number 2
        };
        const fallbackTimeLimit = 600; // Fallback if task_number is unexpected

        // Find keys starting with 'task' and sort them numerically
        const taskKeys = Object.keys(rawData)
          .filter(key => key.startsWith('task'))
          .sort((a, b) => {
            const numA = parseInt(a.replace('task', ''), 10);
            const numB = parseInt(b.replace('task', ''), 10);
            return numA - numB;
          });

        // Iterate through sorted task keys and transform data
        taskKeys.forEach(key => {
          const taskData = rawData[key] as RawWritingTaskData | undefined;
          if (taskData && typeof taskData === 'object' && taskData.id && taskData.task_number) {
            tasks.push({
              ...taskData,
              // Inject the time_limit based on task_number or use fallback
              time_limit: defaultTimeLimits[taskData.task_number] || fallbackTimeLimit
            });
          } else {
            console.warn(`Skipping invalid task data found under key: ${key}`);
          }
        });

        if (tasks.length === 0) {
            throw new Error("No valid tasks found in the received data.");
        }

        // Create the section object in the format the component expects
        const formattedSection: WritingSection = {
          id: rawData.id,
          title: rawData.title,
          tasks: tasks // Use the transformed array
        };
        // --- End Transformation ---

        setSection(formattedSection); // Set state with the correctly structured data

        // Initialize responses and word counts based on the formatted tasks
        const initialResponses: Record<number, string> = {};
        const initialWordCounts: Record<number, number> = {};
        formattedSection.tasks.forEach(task => {
          initialResponses[task.id] = '';
          initialWordCounts[task.id] = 0;
        });
        setResponses(initialResponses);
        setWordCounts(initialWordCounts);

      } catch (error) {
        console.error('Error fetching or processing writing section:', error);
        toast.error(`Failed to load writing section. ${error instanceof Error ? error.message : 'Please try again.'}`);
        // Optionally set section to null to show error screen on processing failure too
        setSection(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (sectionId) {
      loadSection();
    }
  }, [sectionId, token, isAuthenticated, navigate]);

  const handleResponseChange = (taskId: number, value: string) => {
    setResponses(prev => ({
      ...prev,
      [taskId]: value
    }));

    // Update word count
    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
    setWordCounts(prev => ({
      ...prev,
      [taskId]: wordCount
    }));
  };

  const handleSubmit = async () => {
    if (!section) return;
    if (!token) {
        toast.error("Authentication error. Please log in again.");
        navigate('/login');
        return;
    }

    setIsSubmitting(true);

    // --- Prepare the 'answers' object as expected by the API function ---
    const answersForApi: { [key: string]: string } = {}; // Define explicitly
    let dataMappingSuccessful = true;

    section.tasks.forEach(task => {
        const taskKey = `task${task.task_number}`; // "task1", "task2"
        const responseText = responses[task.id];
        if (responseText !== undefined) {
            answersForApi[taskKey] = responseText;
        } else {
            console.error(`Response for task ID ${task.id} (Task Number ${task.task_number}) not found in state!`);
            toast.error(`Internal error: Could not find response data for Task ${task.task_number}.`);
            dataMappingSuccessful = false;
        }
    });

    if (!dataMappingSuccessful) {
        setIsSubmitting(false);
        return;
    }
    // --- End data preparation ---

    // The API function expects { task1: "...", task2: "..." }
    // Ensure the object matches this shape if only 2 tasks are guaranteed
    const finalAnswersObject = {
        task1: answersForApi['task1'] || '', // Provide default empty string if somehow missing
        task2: answersForApi['task2'] || ''
    };

    console.log("Calling submitWritingAnswers with answers object:", finalAnswersObject);

    try {
      // --- Call the imported API function ---
      const response = await submitWritingAnswers(
        Number(section.id), // Ensure sectionId is a number
        finalAnswersObject, // Pass the object { task1: "...", task2: "..." }
        token
      );

      // Assuming submitWritingAnswers (or authenticatedFetch it uses) throws on error
      console.log("Writing Submission Successful:", response);
      setIsComplete(true);
      toast.success('Writing responses submitted successfully!');

    } catch (error: any) {
      console.error('Error submitting writing responses:', error);
      toast.error(error.message || 'Failed to submit responses. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextTask = () => {
    if (!section) return;
    if (currentTaskIndex < section.tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  const calculateProgress = () => {
    if (!section || section.tasks.length === 0) return 0;
    return ((currentTaskIndex + 1) / section.tasks.length) * 100;
  };

  // Safely access the current task using the index and the tasks array
  const currentTask = section?.tasks?.[currentTaskIndex];

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse text-2xl font-semibold mb-2">Loading Writing Test...</div>
            <p className="text-gray-500">Please wait while we prepare your test.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // --- Error State (No section data after loading) ---
  if (!section || !currentTask) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-semibold mb-2 text-red-500">Error</div>
            <p className="text-gray-700">Failed to load the writing section data correctly. Please try again later.</p>
            <Button className="mt-4" onClick={() => navigate('/writing')}>
              Return to Writing Sections
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // --- Completion State ---
  if (isComplete) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 py-8">
          <div className="toefl-container max-w-4xl mx-auto"> {/* Added mx-auto */}
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600" /> {/* Adjusted color */}
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Test Complete!</h2>
                  <p className="text-gray-600 mb-6">
                    Thank you for completing the writing section.
                    Your responses have been submitted. {/* Adjusted text slightly */}
                  </p>
                </div>

                <div className="flex justify-center space-x-4">
                  <Button onClick={() => navigate('/writing')}>
                    Return to Writing Sections
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
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

  // --- Active Test State ---
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 py-8">
        <div className="toefl-container mx-auto px-4"> {/* Added mx-auto and padding */}
          {/* Test header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4"> {/* Added gap */}
            <div>
              <h1 className="text-2xl font-bold mb-1">{section.title}</h1> {/* Reduced mb */}
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="mr-1 h-4 w-4" />
                <span>Writing Task {currentTaskIndex + 1} of {section.tasks.length}</span>
              </div>
            </div>

            <div className="mt-4 sm:mt-0">
              {/* Timer component uses the time_limit added during transformation */}
              <Timer
                key={currentTask.id} // Add key to force re-render on task change
                initialSeconds={currentTask.time_limit}
                running={true}
                onTimeout={() => {
                  toast.warning("Time's up! Moving to next step or submitting.");
                  if (currentTaskIndex < section.tasks.length - 1) {
                    handleNextTask();
                  } else {
                    handleSubmit();
                  }
                }}
              />
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out" // Adjusted color and added transition
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Task materials */}
            <div>
              <Card className="shadow-md mb-6">
                <CardHeader className="bg-orange-500 bg-opacity-10"> {/* Adjusted color */}
                  <CardTitle className="text-xl flex items-center gap-2">
                    <span className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"> {/* Adjusted color */}
                      {currentTaskIndex + 1}
                    </span>
                    Writing Task {currentTaskIndex + 1}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6">
                  <Tabs defaultValue="instructions" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="instructions">Instructions</TabsTrigger>
                      <TabsTrigger value="materials" disabled={!currentTask.passage && !currentTask.audio_url}>
                        {currentTask.passage || currentTask.audio_url
                          ? 'Reading & Listening'
                          : 'Topic'}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="instructions" className="p-4 border rounded-md">
                      <h3 className="font-medium text-lg mb-3">Task Instructions</h3>
                      <div className="text-gray-700 space-y-4">
                        <p>
                          {/* Dynamic instructions based on task number (more robust than index) */}
                          {currentTask.task_number === 1 ? (
                            "In this integrated task, you will read a passage, listen to a lecture (if available), and then write a response based on what you have read and heard."
                          ) : (
                            "In this writing task, you will write an essay based on the provided prompt, often drawing on personal experience or knowledge."
                          )}
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {/* Corrected time display */}
                          <li>Time limit: {Math.floor((currentTask.time_limit || 0) / 60)} minutes</li>
                          {/* Dynamic word count recommendation */}
                          <li>Word count: {currentTask.task_number === 1 ? '150-225 words recommended' : 'At least 100 words recommended'}</li> {/* Adjusted Task 2 recommendation */}
                          <li>Read the prompt and any materials carefully before writing.</li>
                          <li>Your response will be evaluated on the quality of your writing and how well you address the task.</li>
                        </ul>
                      </div>
                    </TabsContent>

                    <TabsContent value="materials" className="space-y-4">
                      {currentTask.passage && (
                        <div>
                          <div className="flex items-center text-lg font-medium mb-2">
                            <Book className="h-5 w-5 mr-2 text-orange-600" /> {/* Adjusted color */}
                            Reading Passage
                          </div>
                          <div className="border-l-4 border-orange-500 pl-4 py-2 bg-gray-50 rounded"> {/* Adjusted color and added rounded */}
                            <div className="max-h-64 overflow-y-auto pr-2 text-sm leading-relaxed"> {/* Adjusted text size/leading */}
                              {/* Use whiteSpace to preserve formatting from JSON */}
                              <pre className="whitespace-pre-wrap font-sans">{currentTask.passage}</pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {currentTask.audio_url && (
                        <div>
                          <div className="flex items-center text-lg font-medium mb-2">
                            <Headphones className="h-5 w-5 mr-2 text-orange-600" /> {/* Adjusted color */}
                            Listening Passage
                          </div>
                          <div className="flex justify-center p-4 bg-gray-50 border rounded-md">
                            <AudioPlayer
                              src={'http://127.0.0.1:5000/files/'+currentTask.audio_url} // Assuming base URL is handled or src is absolute
                              allowReplay={true}
                            />
                          </div>
                        </div>
                      )}

                      {/* Always show the prompt */}
                      <div>
                        <div className="flex items-center text-lg font-medium mb-2 mt-4"> {/* Added margin top */}
                          <FileEdit className="h-5 w-5 mr-2 text-orange-600" /> {/* Adjusted color */}
                          Writing Prompt
                        </div>
                        <div className="p-4 border rounded-md bg-orange-500 bg-opacity-5 text-gray-800"> {/* Adjusted color */}
                          <p className="whitespace-pre-wrap">{currentTask.prompt}</p> {/* Added whitespace-pre-wrap */}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Essay input */}
            <div>
              <Card className="shadow-md">
                <CardHeader className="bg-gray-50 flex flex-row items-center justify-between p-4 border-b"> {/* Added border */}
                  <CardTitle className="text-lg">Your Response</CardTitle>
                  <div className="text-sm text-gray-600"> {/* Adjusted color */}
                    Word count: <span className={`font-semibold ${wordCounts[currentTask.id] < (currentTask.task_number === 1 ? 150 : 100) ? 'text-red-600' : 'text-green-600'}`}>
                      {wordCounts[currentTask.id]}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-0"> {/* Removed padding */}
                  <Textarea
                    placeholder="Start writing your response here..."
                    className="min-h-[400px] w-full p-4 border-0 rounded-b-md focus-visible:ring-0 focus-visible:ring-offset-0" // Adjusted styling
                    value={responses[currentTask.id] || ''}
                    onChange={(e) => handleResponseChange(currentTask.id, e.target.value)}
                    aria-label="Writing response area"
                  />
                </CardContent>
              </Card>

              {/* Navigation buttons */}
              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevTask}
                  disabled={currentTaskIndex === 0 || isSubmitting}
                >
                  Previous Task
                </Button>

                {currentTaskIndex < section.tasks.length - 1 ? (
                  <Button onClick={handleNextTask} disabled={isSubmitting}>
                    Next Task
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="gap-2 bg-green-600 hover:bg-green-700" // Submit button styling
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">Submitting...</span>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Submit Responses
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WritingSectionPage;