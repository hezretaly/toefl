import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, Clock, ChevronRight, Save, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSectionById, submitSpeakingAnswers, getFileUrl } from '@/services/api'; // Assuming this service exists and works
import Header from '@/components/layout/Header'; // Assuming these layout components exist
import Timer from '@/components/test/Timer'; // Assuming this Timer component exists and matches the revised signature
import AudioPlayer from '@/components/test/AudioPlayer'; // Assuming this component exists
import Footer from '@/components/layout/Footer'; // Assuming these layout components exist


// Task 1 Times
const TASK1_INTRO_TIME = 5;
const TASK1_QUESTION_TIME = 5;
const TASK1_PREP_TIME = 15;
const TASK1_RESPONSE_TIME = 45;

// Task 2/3 Times
const TASK2_INTRO_TIME = 5;
const TASK2_READING_TIME = 45;
// Listening time is dynamic (audio length)
const TASK2_QUESTION_TIME = 5;
const TASK2_PREP_TIME = 30;
const TASK2_RESPONSE_TIME = 60;

// Task 4 Times
const TASK4_INTRO_TIME = 5;
// Listening time is dynamic
const TASK4_QUESTION_TIME = 5;
const TASK4_PREP_TIME = 20;
const TASK4_RESPONSE_TIME = 60;

// Default Times (if tasks > 4 exist)
const DEFAULT_PREP_TIME = 30;
const DEFAULT_RESPONSE_TIME = 60;

// --- Helper Functions ---
const resolveStaticUrl = (relativeUrl?: string): string => {
  if (!relativeUrl) return '';
  // Ensure no double slashes and correct base URL
  return getFileUrl(relativeUrl);
};

// --- Frontend Interfaces ---
interface SpeakingTask {
  id: number;
  task_number: number;
  passage?: string | null;
  prompt: string;
  audio_url?: string | null;
  preparation_time: number; // Now set during transformation
  response_time: number; // Now set during transformation
}

interface SpeakingSection {
  id: number;
  title: string;
  tasks: SpeakingTask[];
}

// --- Interface for Raw Backend Data ---
interface RawSpeakingTaskData {
    id: number;
    task_number: number;
    passage?: string | null;
    prompt: string;
    audio_url?: string | null;
    // preparation_time and response_time might be missing from raw data
}

interface RawBackendSpeakingResponse {
    id: number;
    title: string;
    task1?: RawSpeakingTaskData;
    task2?: RawSpeakingTaskData;
    task3?: RawSpeakingTaskData;
    task4?: RawSpeakingTaskData;
    // Add more task keys if needed (task5, task6...)
}

// --- Component ---
const SpeakingSectionPage = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const [section, setSection] = useState<SpeakingSection | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [recordings, setRecordings] = useState<Record<number, Blob>>({}); // Task ID -> Recording Blob
  const [phase, setPhase] = useState<
    'initial' |
    'task1_intro' | 'task1_question' |
    'task2_intro' | 'task2_reading' | 'task2_listening' | 'task2_question' | // Covers Task 2 & 3
    'task4_intro' | 'task4_listening' | 'task4_question' |                 // Covers Task 4
    'reading_listening' | // Fallback for Tasks 5+
    'preparation' | 'recording' | 'completed_task'
  >('initial');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [hasPlayedTaskAudio, setHasPlayedTaskAudio] = useState(false); // Tracks audio play for standard flow (Tasks 5+)
  

  // Refs for cleanup
  const collectedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Optional: Ref for recorder too
  // const blobUrlRef = useRef<string | null>(null); // If using blob URL cleanup pattern

  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // --- Load and Transform Data ---
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const loadSection = async () => {
      if (!sectionId || !token) return;
      setIsLoading(true);
      setSection(null);
      setCurrentTaskIndex(0);
      setPhase('initial');
      setRecordings({});

      try {
        // Fetch raw data (adapt 'speaking' type if needed by your API service)
        const rawData: RawBackendSpeakingResponse = await fetchSectionById('speaking', Number(sectionId), token);

        const tasks: SpeakingTask[] = [];
        // Iterate through possible task keys (adjust if more than 4 tasks are possible)
        for (let i = 1; i <= 4; i++) {
            const taskKey = `task${i}` as keyof RawBackendSpeakingResponse;
            const taskData = rawData[taskKey] as RawSpeakingTaskData | undefined;

            if (taskData) {
                const taskNumber = taskData.task_number;
                let prepTime = DEFAULT_PREP_TIME;
                let respTime = DEFAULT_RESPONSE_TIME;

                // Apply specific times based on task number
                if (taskNumber === 1) {
                    prepTime = TASK1_PREP_TIME;
                    respTime = TASK1_RESPONSE_TIME;
                } else if (taskNumber === 2 || taskNumber === 3) {
                    prepTime = TASK2_PREP_TIME;
                    respTime = TASK2_RESPONSE_TIME;
                } else if (taskNumber === 4) {
                    prepTime = TASK4_PREP_TIME;
                    respTime = TASK4_RESPONSE_TIME;
                }
                // Tasks 5+ will use the defaults

                tasks.push({
                    ...taskData,
                    audio_url: taskData.audio_url ? resolveStaticUrl(taskData.audio_url) : null,
                    preparation_time: prepTime,
                    response_time: respTime,
                });
            }
        }

        // Sort tasks by task_number just in case
        tasks.sort((a, b) => a.task_number - b.task_number);

        const transformedSection: SpeakingSection = {
            id: rawData.id,
            title: rawData.title,
            tasks: tasks,
        };

        setSection(transformedSection);

        // --- Set Initial Phase Based on First Task ---
        if (transformedSection.tasks.length > 0) {
            const firstTaskNumber = transformedSection.tasks[0].task_number;
            if (firstTaskNumber === 1) setPhase('task1_intro');
            else if (firstTaskNumber === 2 || firstTaskNumber === 3) setPhase('task2_intro');
            else if (firstTaskNumber === 4) setPhase('task4_intro');
            else setPhase('reading_listening'); // Default for tasks 5+
        } else {
             setPhase('initial'); // No tasks, will show error state later
        }

      } catch (error) {
        console.error('Error fetching or processing speaking section:', error);
        toast.error('Failed to load speaking section. Please try again.');
        setSection(null); // Ensure section is null on error
      } finally {
        setIsLoading(false);
      }
    };

    loadSection();
  }, [sectionId, token, isAuthenticated, navigate]);

  // --- Phase Reset Logic ---
  useEffect(() => {
      // Handles phase reset *when the task index changes*
      if (!section || section.tasks.length === 0) return;
      const task = section.tasks[currentTaskIndex];
      if (!task) return; // Safety check
      const taskNumber = task.task_number;

      console.log(`Task Index Changed to ${currentTaskIndex}, Task Number: ${taskNumber}. Resetting Phase.`);

      // Reset phase based on the NEW current task number
      if (taskNumber === 1) setPhase('task1_intro');
      else if (taskNumber === 2 || taskNumber === 3) setPhase('task2_intro');
      else if (taskNumber === 4) setPhase('task4_intro');
      else setPhase('reading_listening'); // Fallback for 5+

      setHasPlayedTaskAudio(false); // Reset audio flag for all task transitions

  }, [currentTaskIndex, section]); // Rerun when task index or section data changes


  // --- Recording Logic ---
  const startNativeRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") { // Check ref
        console.warn("Recording already in progress.");
        return;
    }
    // ... (getUserMedia setup, stream check, MIME type check) ...
    // Ensure errors clean up refs if needed

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // ... (Stream validation)

        const options = { mimeType: 'audio/webm' }; // Or your preferred/checked type
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder; // Store recorder in ref

        // --- Clear the Ref before starting ---
        collectedChunksRef.current = [];

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                // --- Push directly to Ref ---
                collectedChunksRef.current.push(event.data);
                console.log(`ondataavailable: chunk size=${event.data.size}, total chunks=${collectedChunksRef.current.length}`);
            } else {
                console.warn('Received empty data chunk.');
            }
        };

        recorder.onstop = () => {
            console.log("Recorder stopped.");
            const taskForRecording = section?.tasks?.[currentTaskIndex];

            // --- Create Blob from Ref ---
            const audioBlob = new Blob(collectedChunksRef.current, { type: options.mimeType });

            console.log(`Blob created for task ${taskForRecording?.id} (Index: ${currentTaskIndex}):`, audioBlob);
            console.log(`>>> Blob size (from ref): ${audioBlob.size}`); // Check this size!
            console.log(`>>> Blob type: ${audioBlob.type}`);

            // --- Clear the Ref for next recording ---
            collectedChunksRef.current = [];

            if (taskForRecording) {
                if (audioBlob.size > 0) {
                    setRecordings(prev => ({ ...prev, [taskForRecording.id]: audioBlob }));
                    console.log("Valid blob stored.");
                    toast.success('Response recorded');
                    setPhase('completed_task'); // Correct: Move to completion
                } else {
                    // This path should be much less likely now, but keep the warning
                    console.warn(`Blob size is 0 for task ${taskForRecording.id}. Discarding.`);
                    toast.warning("Recording captured no audio data. Please ensure microphone is working and try again.");
                    setPhase('preparation'); // Fallback still needed just in case
                }
            } else {
                 console.error("Could not find current task when stopping recording.");
                 setPhase('preparation'); // Fallback
            }

            // Cleanup stream and recorder instance
            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            mediaRecorderRef.current = null; // Clear recorder ref
            setIsRecording(false);
        };

        recorder.onerror = (event) => {
            // ... (error handling, ensure refs are cleaned up) ...
            console.error("MediaRecorder error:", event);
            toast.error("An error occurred during recording.");
            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            mediaRecorderRef.current = null;
            collectedChunksRef.current = []; // Clear chunks on error too
            setIsRecording(false);
            setPhase('preparation'); // Fallback
        };

        recorder.start();
        setIsRecording(true);
        setPhase('recording');
        console.log("Recording started with recorder state:", recorder.state);

    } catch (err) {
        // ... (error handling) ...
        console.error('Error accessing microphone or starting recorder:', err);
        toast.error('Could not access microphone. Please check permissions and ensure it is not in use.');
        setIsRecording(false); // Ensure state is correct
        setPhase('preparation'); // Fallback
    }
  };

  const stopNativeRecording = () => {
    // Use the ref to check state and call stop
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        console.log("Attempting to stop recording via ref...");
        mediaRecorderRef.current.stop();
        // State changes are handled in onstop
    } else {
        console.warn("Stop recording called but recorder ref not active/recording.");
        // Force cleanup if needed
        if (isRecording) setIsRecording(false);
        if (streamRef.current) {
             streamRef.current.getTracks().forEach(track => track.stop());
             streamRef.current = null;
        }
         mediaRecorderRef.current = null;
         collectedChunksRef.current = [];
    }
  };

   // --- Phase Transitions & Handlers ---

    // Task 1 handlers
    const handleIntroTimeout = () => {
        if (currentTask?.task_number === 1) setPhase('task1_question');
    };
    const handleQuestionTimeout = () => {
        if (currentTask?.task_number === 1) setPhase('preparation');
    };

    // Task 2/3 handlers
    const handleTask2IntroTimeout = () => {
        if (currentTask?.task_number === 2 || currentTask?.task_number === 3) setPhase('task2_reading');
    };
    const handleTask2ReadingTimeout = () => {
        if (currentTask?.task_number === 2 || currentTask?.task_number === 3) {
            if (currentTask.audio_url) setPhase('task2_listening');
            else { console.warn(`Task ${currentTask.task_number} has no audio, skipping listening.`); setPhase('task2_question'); }
        }
    };
    const handleTask2ListeningComplete = () => {
        if (currentTask?.task_number === 2 || currentTask?.task_number === 3) setPhase('task2_question');
    };
    const handleTask2QuestionTimeout = () => {
        if (currentTask?.task_number === 2 || currentTask?.task_number === 3) setPhase('preparation');
    };

    // Task 4 handlers
    const handleTask4IntroTimeout = () => {
        if (currentTask?.task_number === 4) {
             if (currentTask.audio_url) setPhase('task4_listening');
             else { console.warn("Task 4 has no audio, skipping listening."); setPhase('task4_question'); }
        }
    };
    const handleTask4ListeningComplete = () => {
        if (currentTask?.task_number === 4) setPhase('task4_question');
    };
    const handleTask4QuestionTimeout = () => {
        if (currentTask?.task_number === 4) setPhase('preparation');
    };

    // Standard handlers (Tasks 5+)
    const handleReadingListeningComplete = () => {
        // Only relevant if currentTask.task_number > 4
        if (currentTask && currentTask.task_number > 4) setPhase('preparation');
    };
    const handleTaskAudioComplete = () => {
        // Only relevant if currentTask.task_number > 4
        if (currentTask && currentTask.task_number > 4) {
             setHasPlayedTaskAudio(true);
             // Decide if auto-advance needed based on presence of passage etc.
             handleReadingListeningComplete(); // Simple advance for now
        }
   };

  // Generic Preparation/Recording timeouts (used by all tasks)
  const handlePreparationTimeout = () => {
    if (phase === 'preparation') { // Extra check
        toast.info('Preparation time is up. Recording starting.');
        startNativeRecording();
    }
  };

  const handleRecordingTimeout = () => {
     if (phase === 'recording') { // Extra check
        toast.warning('Recording time is up. Stopping recording.');
        stopNativeRecording();
     }
  };

  // --- Next Task / Submission ---
  const handleNextTask = () => {
    if (!section) return;
    // Stop recording if somehow still active (safety check)
    if (isRecording) {
        stopNativeRecording();
    }

    // // Cleanup Blob URL if using that pattern
    // if (blobUrlRef.current) {
    //   URL.revokeObjectURL(blobUrlRef.current);
    //   blobUrlRef.current = null;
    // }

    if (currentTaskIndex < section.tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
      // Phase reset is handled by the useEffect watching currentTaskIndex
      window.scrollTo(0, 0);
    } else {
      // Last task completed, initiate submission
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!section || !currentTask) return;
    if (!token) {
        toast.error("Authentication error. Please log in again.");
        navigate('/login');
        return;
    }

    const expectedRecordings = section.tasks.length;
    if (Object.keys(recordings).length !== expectedRecordings) {
        toast.error(`Please complete all ${expectedRecordings} tasks before submitting.`);
        const missingTask = section.tasks.find(task => !recordings[task.id]);
        console.warn("Submission blocked. Missing recordings. First missing task number:", missingTask?.task_number);
        return;
    }

    setIsSubmitting(true);

    // --- Prepare the recordings object for the API function ---
    const recordingsForApi: Record<string, Blob> = {};
    let allRecordingsFound = true;

    section.tasks.forEach(task => {
        const recordingBlob = recordings[task.id]; // Get blob using task.id key from state
        if (recordingBlob) {
            const key = `task${task.task_number}Recording`; // Create backend-expected key
            recordingsForApi[key] = recordingBlob; // Add blob to the object with the correct key
        } else {
             console.warn(`Attempting to submit, but recording for task ID ${task.id} (Task Number ${task.task_number}) not found!`);
             toast.error(`Internal error: Recording for task ${task.task_number} missing.`);
             allRecordingsFound = false;
        }
    });

    if (!allRecordingsFound) {
        setIsSubmitting(false);
        return;
    }
    // --- End data preparation ---

    console.log("Calling submitSpeakingAnswers with recordings object keys:", Object.keys(recordingsForApi));

    try {
      // --- Call the imported API function ---
      const response = await submitSpeakingAnswers(
        Number(section.id), // Ensure sectionId is a number
        recordingsForApi,
        token
      );

      // Assuming submitSpeakingAnswers (or handleResponse it uses) throws on error
      console.log("Speaking Submission Successful:", response);
      setIsComplete(true);
      toast.success('Speaking responses submitted successfully!');

    } catch (error: any) {
      console.error('Error submitting speaking responses:', error);
      toast.error(error.message || 'Failed to submit responses. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Calculations & Current Task ---
  const calculateProgress = () => {
    if (!section || section.tasks.length === 0) return 0;
    // Progress based on current index
    return ((currentTaskIndex + 1) / section.tasks.length) * 100;
  };

  const currentTask = section?.tasks?.[currentTaskIndex];

  // --- Render Logic ---

  // Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-700">Loading Speaking Test...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error State (Failed to load/process section, or no tasks)
  if (!section || !section.tasks || section.tasks.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center p-6 border border-red-200 bg-red-50 rounded-lg max-w-md">
            <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-red-700">Error Loading Test</h2>
            <p className="text-gray-700 mb-6">
              Failed to load the speaking section data, or the section contains no tasks. Please check the section ID or try again later.
            </p>
            <Button onClick={() => navigate('/speaking')}> {/* Adjust route if needed */}
              Return to Sections
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Completion State
  if (isComplete) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 py-8 flex items-center justify-center">
          <div className="toefl-container max-w-lg mx-auto px-4">
            <Card className="shadow-lg">
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Test Complete!</h2>
                <p className="text-gray-600 mb-6">
                  Your responses for the speaking section have been submitted.
                </p>
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <Button onClick={() => navigate('/speaking')}> {/* Adjust route */}
                    Back to Speaking Sections
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}> {/* Adjust route */}
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

  // Main Test View Guard (Should not be reached if loading/error handled, but good practice)
  if (!currentTask) {
     return (
          <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 flex items-center justify-center">
                  <p className="text-red-600 font-medium">Error: Could not load the current task details.</p>
              </main>
              <Footer />
          </div>
      );
  }

  // --- Main Test View ---
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="toefl-container max-w-5xl mx-auto px-4">
          {/* Test header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-1 text-gray-800">{section.title}</h1>
              <div className="flex items-center text-sm text-gray-600">
                <Mic className="mr-1.5 h-4 w-4 text-toefl-green" /> {/* Use appropriate theme color */}
                <span>Speaking Task {currentTask.task_number} of {section.tasks.length}</span>
              </div>
            </div>

            {/* --- Timers Display Area --- */}
            <div className="mt-4 sm:mt-0 min-w-[220px]">
                {/* Task 1 Timers */}
                {phase === 'task1_intro' && currentTask.task_number === 1 && (
                    <div className="flex items-center bg-blue-100 border border-blue-200 px-4 py-2 rounded-md shadow-sm">
                        <Clock className="mr-2 h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div>
                            <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Get Ready</div>
                            <Timer key={`t1-intro-${currentTask.id}`} initialSeconds={TASK1_INTRO_TIME} onTimeout={handleIntroTimeout} running={phase === 'task1_intro'} />
                        </div>
                    </div>
                )}
                {phase === 'task1_question' && currentTask.task_number === 1 && (
                    <div className="flex items-center bg-purple-100 border border-purple-200 px-4 py-2 rounded-md shadow-sm">
                        <Clock className="mr-2 h-5 w-5 text-purple-600 flex-shrink-0" />
                        <div>
                            <div className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Read Question</div>
                            <Timer key={`t1-q-${currentTask.id}`} initialSeconds={TASK1_QUESTION_TIME} onTimeout={handleQuestionTimeout} running={phase === 'task1_question'} />
                        </div>
                    </div>
                )}

                {/* Task 2/3 Timers */}
                {phase === 'task2_intro' && (currentTask.task_number === 2 || currentTask.task_number === 3) && (
                    <div className="flex items-center bg-teal-100 border border-teal-200 px-4 py-2 rounded-md shadow-sm">
                        <Clock className="mr-2 h-5 w-5 text-teal-600 flex-shrink-0" />
                        <div>
                            <div className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Get Ready (Task {currentTask.task_number})</div>
                            <Timer key={`t23-intro-${currentTask.id}`} initialSeconds={TASK2_INTRO_TIME} onTimeout={handleTask2IntroTimeout} running={phase === 'task2_intro'} />
                        </div>
                    </div>
                )}
                {phase === 'task2_reading' && (currentTask.task_number === 2 || currentTask.task_number === 3) && (
                     <div className="flex items-center bg-orange-100 border border-orange-200 px-4 py-2 rounded-md shadow-sm">
                       <Clock className="mr-2 h-5 w-5 text-orange-600 flex-shrink-0" />
                       <div>
                         <div className="text-xs font-semibold text-orange-800 uppercase tracking-wide">Reading Time</div>
                         <Timer key={`t23-read-${currentTask.id}`} initialSeconds={TASK2_READING_TIME} onTimeout={handleTask2ReadingTimeout} running={phase === 'task2_reading'}/>
                       </div>
                     </div>
                )}
                {phase === 'task2_listening' && (currentTask.task_number === 2 || currentTask.task_number === 3) && (
                     <div className="flex items-center bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-md shadow-sm text-indigo-700"> <Mic className="mr-2 h-5 w-5 flex-shrink-0" /> <span>Listening...</span> </div>
                )}
                {phase === 'task2_question' && (currentTask.task_number === 2 || currentTask.task_number === 3) && (
                    <div className="flex items-center bg-cyan-100 border border-cyan-200 px-4 py-2 rounded-md shadow-sm">
                        <Clock className="mr-2 h-5 w-5 text-cyan-600 flex-shrink-0" />
                        <div>
                            <div className="text-xs font-semibold text-cyan-800 uppercase tracking-wide">Read Question</div>
                            <Timer key={`t23-q-${currentTask.id}`} initialSeconds={TASK2_QUESTION_TIME} onTimeout={handleTask2QuestionTimeout} running={phase === 'task2_question'} />
                        </div>
                    </div>
                )}

                {/* Task 4 Timers */}
                 {phase === 'task4_intro' && currentTask.task_number === 4 && (
                      <div className="flex items-center bg-pink-100 border border-pink-200 px-4 py-2 rounded-md shadow-sm"> <Clock className="mr-2 h-5 w-5 text-pink-600 flex-shrink-0" /> <div> <div className="text-xs font-semibold text-pink-800 uppercase tracking-wide">Get Ready (Task 4)</div> <Timer key={`t4-intro-${currentTask.id}`} initialSeconds={TASK4_INTRO_TIME} onTimeout={handleTask4IntroTimeout} running={phase === 'task4_intro'} /> </div> </div>
                 )}
                 {phase === 'task4_listening' && currentTask.task_number === 4 && (
                      <div className="flex items-center bg-purple-100 border border-purple-200 px-4 py-2 rounded-md shadow-sm text-purple-700"> <Mic className="mr-2 h-5 w-5 flex-shrink-0" /> <span>Listening...</span> </div>
                 )}
                 {phase === 'task4_question' && currentTask.task_number === 4 && (
                      <div className="flex items-center bg-lime-100 border border-lime-200 px-4 py-2 rounded-md shadow-sm"> <Clock className="mr-2 h-5 w-5 text-lime-600 flex-shrink-0" /> <div> <div className="text-xs font-semibold text-lime-800 uppercase tracking-wide">Read Question</div> <Timer key={`t4-q-${currentTask.id}`} initialSeconds={TASK4_QUESTION_TIME} onTimeout={handleTask4QuestionTimeout} running={phase === 'task4_question'} /> </div> </div>
                 )}

               {/* Preparation Timer (Handles all tasks using currentTask time) */}
               {phase === 'preparation' && (
                 <div className="flex items-center bg-yellow-100 border border-yellow-200 px-4 py-2 rounded-md shadow-sm">
                   <Clock className="mr-2 h-5 w-5 text-yellow-600 flex-shrink-0" />
                   <div>
                     <div className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">Preparation Time</div>
                     <Timer
                       key={`prep-${currentTask.id}`}
                       initialSeconds={currentTask.preparation_time} // Correct duration is set here
                       onTimeout={handlePreparationTimeout}
                       running={phase === 'preparation'}
                     />
                   </div>
                 </div>
               )}
               {/* Recording Timer (Handles all tasks using currentTask time) */}
               {phase === 'recording' && (
                 <div className="flex items-center bg-red-100 border border-red-200 px-4 py-2 rounded-md shadow-sm">
                   <Mic className="mr-2 h-5 w-5 text-red-600 animate-pulse flex-shrink-0" />
                   <div>
                     <div className="text-xs font-semibold text-red-800 uppercase tracking-wide">Response Time</div>
                     <Timer
                       key={`rec-${currentTask.id}`}
                       initialSeconds={currentTask.response_time} // Correct duration is set here
                       onTimeout={handleRecordingTimeout}
                       running={phase === 'recording'}
                     />
                   </div>
                 </div>
               )}
                {/* Inactive Timer Display (Handles other phases like 'reading_listening' for Tasks 5+, 'completed_task') */}
                {(phase === 'initial' || phase === 'reading_listening' || phase === 'completed_task') && (
                  <div className="flex items-center bg-gray-100 border border-gray-200 px-4 py-2 rounded-md shadow-sm text-gray-500">
                    <Clock className="mr-2 h-5 w-5 flex-shrink-0" />
                    <span>Timer inactive</span>
                  </div>
                )}
             </div>
           </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8 dark:bg-gray-700">
            <div
              className="bg-toefl-green h-2.5 rounded-full transition-width duration-300 ease-linear" // Use theme color
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>

          {/* Task Content Area */}
          <Card className="shadow-md mb-8 border border-gray-200 bg-white">
             <CardHeader className="bg-gray-50 border-b border-gray-200">
               <CardTitle className="text-xl lg:text-2xl flex items-center gap-3 text-gray-800">
                 <span className="bg-toefl-green text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"> {/* Use theme color */}
                   {currentTask.task_number}
                 </span>
                 Speaking Task {currentTask.task_number}
               </CardTitle>
             </CardHeader>

            <CardContent className="p-6 space-y-6">

              {/* --- Task 1 Specific Content --- */}
              {phase === 'task1_intro' && currentTask.task_number === 1 && (
                 <div className="text-center p-6 bg-blue-50 rounded-md border border-blue-100"> <h3 className="text-xl font-semibold text-blue-800 mb-2">Task 1: Independent Speaking</h3> <p className="text-gray-700">You will be asked a question about a familiar topic.</p> <p className="text-gray-700 mt-2">The question will appear next.</p> </div>
              )}
              {phase === 'task1_question' && currentTask.task_number === 1 && (
                 <div> <h3 className="font-semibold text-lg mb-3 text-gray-700">Question</h3> <div className="border p-4 rounded-md bg-purple-50 border-purple-200 text-gray-900 min-h-[100px] flex items-center justify-center text-center"> <p className="text-lg">{currentTask.prompt}</p> </div> <p className="text-xs text-center text-gray-500 mt-2 italic">Read the question carefully. Preparation will begin shortly.</p> </div>
               )}

              {/* --- Task 2 / Task 3 Specific Content --- */}
              {phase === 'task2_intro' && (currentTask.task_number === 2 || currentTask.task_number === 3) && (
                 <div className="text-center p-6 bg-teal-50 rounded-md border border-teal-100"> <h3 className="text-xl font-semibold text-teal-800 mb-2">Task {currentTask.task_number}: Integrated Reading & Listening</h3> <p className="text-gray-700">You will read a short passage and then listen to a related audio clip.</p> <p className="text-gray-700 mt-2">The reading passage will appear next.</p> </div>
              )}
              {phase === 'task2_reading' && (currentTask.task_number === 2 || currentTask.task_number === 3) && currentTask.passage && (
                 <div> <h3 className="font-semibold text-lg mb-3 text-gray-700">Reading Passage</h3> <div className="border-l-4 border-orange-400 pl-4 py-3 bg-orange-50 rounded-r-md prose prose-sm max-w-none text-gray-800"> <p style={{ whiteSpace: 'pre-wrap' }}>{currentTask.passage}</p> </div> <p className="text-xs text-center text-gray-500 mt-2 italic">Read the passage carefully. The listening section will begin when the timer ends.</p> </div>
              )}
               {phase === 'task2_listening' && (currentTask.task_number === 2 || currentTask.task_number === 3) && currentTask.audio_url && (
                 <div> <h3 className="font-semibold text-lg mb-3 text-gray-700">Listening Passage</h3> <div className="flex justify-center mb-2 p-4 bg-indigo-50 rounded-md border border-indigo-200"> <AudioPlayer key={`audio-${currentTask.id}-t23listen`} src={currentTask.audio_url} allowReplay={false} onComplete={handleTask2ListeningComplete} autoPlay disabled={false} /> </div> <p className="text-xs text-center text-gray-500 italic">Listen carefully. The question will appear next.</p> </div>
               )}
               {phase === 'task2_question' && (currentTask.task_number === 2 || currentTask.task_number === 3) && (
                 <div> <h3 className="font-semibold text-lg mb-3 text-gray-700">Question</h3> <div className="border p-4 rounded-md bg-cyan-50 border-cyan-200 text-gray-900 min-h-[100px] flex items-center justify-center text-center"> <p className="text-lg">{currentTask.prompt}</p> </div> <p className="text-xs text-center text-gray-500 mt-2 italic">Read the question. Preparation will begin shortly.</p> </div>
               )}

              {/* --- Task 4 Specific Content --- */}
              {phase === 'task4_intro' && currentTask.task_number === 4 && (
                   <div className="text-center p-6 bg-pink-50 rounded-md border border-pink-100"> <h3 className="text-xl font-semibold text-pink-800 mb-2">Task 4: Integrated Listening</h3> <p className="text-gray-700">You will listen to part of a lecture.</p> <p className="text-gray-700 mt-2">The listening passage will begin playing next.</p> </div>
              )}
               {phase === 'task4_listening' && currentTask.task_number === 4 && currentTask.audio_url && (
                   <div> <h3 className="font-semibold text-lg mb-3 text-gray-700">Lecture Excerpt</h3> <div className="flex justify-center mb-2 p-4 bg-purple-50 rounded-md border border-purple-200"> <AudioPlayer key={`audio-${currentTask.id}-t4listen`} src={currentTask.audio_url} allowReplay={false} onComplete={handleTask4ListeningComplete} autoPlay disabled={false} /> </div> <p className="text-xs text-center text-gray-500 italic">Listen carefully. The question will appear next.</p> </div>
               )}
               {phase === 'task4_question' && currentTask.task_number === 4 && (
                   <div> <h3 className="font-semibold text-lg mb-3 text-gray-700">Question</h3> <div className="border p-4 rounded-md bg-lime-50 border-lime-200 text-gray-900 min-h-[100px] flex items-center justify-center text-center"> <p className="text-lg">{currentTask.prompt}</p> </div> <p className="text-xs text-center text-gray-500 mt-2 italic">Read the question. Preparation will begin shortly.</p> </div>
               )}

              {/* --- Standard Content (Tasks 5+) --- */}
              {currentTask.passage && phase === 'reading_listening' && currentTask.task_number > 4 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Reading Passage</h3>
                  <div className="border-l-4 border-toefl-green pl-4 py-3 bg-gray-50 rounded-r-md prose prose-sm max-w-none text-gray-800">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{currentTask.passage}</p>
                  </div>
                </div>
              )}
              {currentTask.audio_url && phase === 'reading_listening' && currentTask.task_number > 4 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">Listening Passage</h3>
                  <div className="flex justify-center mb-2 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <AudioPlayer key={`audio-${currentTask.id}-t5listen`} src={currentTask.audio_url} allowReplay={true} onComplete={handleTaskAudioComplete} disabled={false}/>
                  </div>
                  <p className="text-xs text-center text-gray-500 italic">Listen carefully.</p>
                </div>
              )}
               {phase === 'reading_listening' && currentTask.task_number > 4 && (
                  <div className="text-center pt-4">
                     <Button onClick={handleReadingListeningComplete} disabled={!!currentTask.audio_url && !hasPlayedTaskAudio} >
                         {currentTask.preparation_time > 0 ? "Begin Preparation" : "Start Recording"} <ChevronRight className="h-4 w-4 ml-2" />
                     </Button>
                     {!!currentTask.audio_url && !hasPlayedTaskAudio && ( <p className="text-xs text-gray-500 mt-2">Listen to the audio passage first.</p> )}
                  </div>
               )}

              {/* --- Speaking Prompt (Visible during Prep/Recording for ALL tasks) --- */}
              {(phase === 'preparation' || phase === 'recording') && (
                 <div className='space-y-4'>
                     <div>
                         <h3 className="font-semibold text-lg mb-3 text-gray-700">Question</h3>
                         <div className="border p-4 rounded-md bg-blue-50 border-blue-200 text-gray-900">
                             {currentTask.prompt}
                         </div>
                     </div>

                      {/* Passage/Listening reminders during PREPARATION for integrated tasks */}
                     {phase === 'preparation' && currentTask.passage && (currentTask.task_number >= 2 && currentTask.task_number <= 3) && ( // Only Tasks 2/3 have reading
                         <details className="text-sm">
                             <summary className="cursor-pointer text-gray-600 hover:text-gray-800">Show Reading Passage</summary>
                             <div className="mt-2 border-l-4 border-gray-300 pl-3 py-2 bg-gray-50 text-gray-700 prose prose-sm max-w-none"> <p style={{ whiteSpace: 'pre-wrap' }}>{currentTask.passage}</p> </div>
                         </details>
                     )}
                     {phase === 'preparation' && currentTask.audio_url && currentTask.task_number >= 2 && ( // Tasks 2, 3, 4 have listening
                         <details className="text-sm">
                             <summary className="cursor-pointer text-gray-600 hover:text-gray-800">Replay Listening Passage (During Prep)</summary>
                             <div className="mt-2 flex justify-center p-2 bg-gray-50 rounded border border-gray-200">
                                 <AudioPlayer key={`audio-${currentTask.id}-prep-replay`} src={currentTask.audio_url} allowReplay={true} disabled={false} />
                             </div>
                         </details>
                     )}
                 </div>
              )}


              {/* --- Response Area (Conditional based on phase) --- */}
              <div className="pt-6 border-t border-gray-200 mt-6">
                <h3 className="font-semibold text-lg mb-4 text-gray-700">Your Response</h3>

                {/* Preparation Phase Display */}
                {phase === 'preparation' && (
                  <div className="text-center p-6 bg-yellow-50 rounded-md border border-yellow-100">
                    <p className="text-gray-700 mb-4">
                      Prepare your response. Recording will begin automatically. ({currentTask.preparation_time} seconds)
                    </p>
                    {/* Consider adding manual start button */}
                    {/* <Button onClick={startNativeRecording} className="gap-2 bg-toefl-green hover:bg-toefl-green-dark" disabled={isRecording} > <Mic className="h-4 w-4" /> Start Recording Now </Button> */}
                  </div>
                )}

                {/* Recording Phase Display */}
                {phase === 'recording' && (
                  <div className="text-center p-6 bg-red-50 rounded-md border border-red-100">
                    <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4 ring-4 ring-red-200 animate-pulse">
                      <Mic className="h-8 w-8 text-red-600" />
                    </div>
                    <p className="text-gray-700 mb-4 font-medium">
                      Recording in progress... Speak clearly.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={stopNativeRecording}
                      className="gap-2"
                      disabled={!isRecording} // Disable if not recording
                    >
                      Stop Recording
                    </Button>
                  </div>
                )}

                 {/* Completed Task Phase Display */}
                 {phase === 'completed_task' && (
                  <div className="text-center p-6 bg-green-50 rounded-md border border-green-100">
                    <CheckCircle className="h-10 w-10 mx-auto text-green-600 mb-3" />
                    <p className="text-gray-700 mb-1 font-medium">
                      Response recorded successfully.
                    </p>
                     {/* === Playback Section === */}
                     {recordings[currentTask.id] && ( // Check if recording exists for the current task
                        <div className="my-4">
                           {/* Use standard HTML audio tag with controls */}
                           <audio
                             controls
                             src={URL.createObjectURL(recordings[currentTask.id])} // Create a temporary URL from the Blob
                             className="mx-auto w-full max-w-xs" // Basic styling
                           >
                             Your browser does not support the audio element. {/* Fallback text */}
                           </audio>
                           {/*
                             NOTE: For applications with many recordings or long sessions,
                             managing these Blob URLs is important. You might want to
                             revoke the URL when the user moves to the next task or
                             the component unmounts using URL.revokeObjectURL().
                             Example (in handleNextTask or a cleanup useEffect):
                             const url = audioPlayerRef.current?.src; // If using a ref to store URL
                             if (url && url.startsWith('blob:')) {
                               URL.revokeObjectURL(url);
                             }
                           */}
                        </div>
                     )}
                     {/* === End Playback Section === */}
                    <Button
                      onClick={handleNextTask}
                      className="gap-2 mt-2"
                      disabled={isSubmitting} // Disable while submitting final task
                    >
                      {currentTaskIndex < section.tasks.length - 1
                        ? 'Proceed to Next Task'
                        : 'Finish & Submit Responses'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}

                 {/* Placeholder/Indicator for non-interactive phases */}
                 {['task1_intro', 'task1_question', 'task2_intro', 'task2_reading', 'task2_listening', 'task2_question', 'task4_intro', 'task4_listening', 'task4_question'].includes(phase) && (
                     <div className="text-center p-4 text-gray-500 italic">
                        {/* Placeholder text appropriate for the current phase */}
                        {phase.endsWith('_intro') && `Getting ready for Task ${currentTask?.task_number}...`}
                        {phase.endsWith('_reading') && 'Reading passage...'}
                        {phase.endsWith('_listening') && 'Listening passage playing...'}
                        {phase.endsWith('_question') && 'Reviewing question...'}
                    </div>
                 )}

                 {/* Placeholder for standard reading/listening (Task 5+) */}
                  {phase === 'reading_listening' && currentTask.task_number > 4 && (
                      <div className="text-center p-4 text-gray-500 italic">
                          Please read the passage and/or listen to the audio above.
                      </div>
                  )}

              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SpeakingSectionPage;