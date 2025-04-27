import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Headphones, Clock, Save, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSectionById, submitListeningAnswers } from '@/services/api'; // Assume these are correctly implemented
import Header from '@/components/layout/Header';
import Timer from '@/components/test/Timer';
import AudioPlayer from '@/components/test/AudioPlayer';
import Footer from '@/components/layout/Footer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import ShadCN Table components

// --- Configuration ---
const API_BASE_URL = 'http://127.0.0.1:5000/files'; //process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000';

const resolveStaticUrl = (relativeUrl?: string): string => {
  if (!relativeUrl) return '';
  return `${API_BASE_URL}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
};

// --- Interfaces matching backend structure ---
interface Question {
  id: number;
  type: string; // 'multiple_to_single', 'multiple_to_multiple', 'table', 'audio'
  prompt: string;
  options?: string[]; // For multiple_choice types and audio
  audio_url?: string; // For audio type question AND main audio
  columns?: string[]; // For table type
  rows?: string[]; // For table type
}

interface ListeningAudio {
  id: number;
  title: string;
  audio_url: string;
  photo_url?: string;
  questions: Question[];
}

interface ListeningSection {
  id: number;
  title: string;
  audios: ListeningAudio[];
}

// --- Component ---
const ListeningSectionPage = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const [section, setSection] = useState<ListeningSection | null>(null);
  // Answer state: audioId -> questionId -> answer data
  const [answers, setAnswers] = useState<Record<number, Record<number, any>>>({});
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // <-- New state for question pagination
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false); // Tracks if the current audio has played *once*

  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const currentAudio = useMemo(() => section?.audios[currentAudioIndex], [section, currentAudioIndex]);
  const currentQuestion = useMemo(() => currentAudio?.questions[currentQuestionIndex], [currentAudio, currentQuestionIndex]);

  // --- Load Section Data ---
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const loadSection = async () => {
      if (!sectionId || !token) return;
      setIsLoading(true);
      setSection(null); // Reset section on load
      setAnswers({}); // Reset answers
      setCurrentAudioIndex(0); // Reset audio index
      setCurrentQuestionIndex(0); // Reset question index
      setHasPlayedAudio(false); // Reset play state
      setIsComplete(false); // Reset completion state
      setScore(null); // Reset score

      try {
        const data: ListeningSection = await fetchSectionById('listening', Number(sectionId), token);
        setSection(data);

        // Initialize answers state
        const initialAnswers: Record<number, Record<number, any>> = {};
        data.audios.forEach(audio => {
          initialAnswers[audio.id] = {};
          audio.questions.forEach(question => {
            if (question.type === 'table') {
              initialAnswers[audio.id][question.id] = {}; // Store as { rowIndex: { colIndex: boolean } }
            } else {
              initialAnswers[audio.id][question.id] = []; // For single ['a'] or multi ['a', 'c']
            }
          });
        });
        setAnswers(initialAnswers);
      } catch (error) {
        console.error('Error fetching listening section:', error);
        toast.error('Failed to load listening section. Please try again.');
        setSection(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadSection();
  }, [sectionId, token, isAuthenticated, navigate]);

  // --- Reset Play State & Question Index on Audio Change ---
  useEffect(() => {
    setHasPlayedAudio(false);
    setCurrentQuestionIndex(0); // Reset question index when audio changes
  }, [currentAudioIndex]);

  // --- Answer Handling ---
  const handleAnswerChange = useCallback((
    audioId: number,
    questionId: number,
    value: string, // option identifier ('a', 'b', ..)
    questionType: string,
    isChecked?: boolean // For multi choice checkbox
  ) => {
    setAnswers(prev => {
      const newAnswersForAudio = { ...(prev[audioId] || {}) };
      const currentQuestionAnswer = newAnswersForAudio[questionId];

      if (questionType === 'multiple_to_multiple') {
        const currentSelection = (Array.isArray(currentQuestionAnswer) ? currentQuestionAnswer : []) as string[];
        if (isChecked) {
          if (!currentSelection.includes(value)) {
            newAnswersForAudio[questionId] = [...currentSelection, value].sort();
          }
        } else {
          newAnswersForAudio[questionId] = currentSelection.filter(item => item !== value);
        }
      } else { // 'multiple_to_single', 'audio'
        newAnswersForAudio[questionId] = [value]; // Store as single element array
      }

      return { ...prev, [audioId]: newAnswersForAudio };
    });
  }, []); // No dependencies, relies on arguments

  // Handler for Inline Table Checkbox Changes (nested inside component render)
  // This needs access to the specific `question` and `currentAudio` being rendered.

  // --- Submission ---
  const handleSubmit = async () => {
    if (!section || !token || isSubmitting || isComplete) return;

    // --- Validation ---
    let allAnswered = true;
    let firstUnansweredQuestionCoords: { audioIdx: number; questionIdx: number } | null = null;

    section.audios.forEach((audio, audioIdx) => {
      audio.questions.forEach((question, questionIdx) => {
        const answer = answers[audio.id]?.[question.id];
        let isQuestionAnswered = false;

        if (question.type === 'multiple_to_multiple') {
          isQuestionAnswered = answer && Array.isArray(answer) && answer.length > 0;
        } else if (question.type === 'table') {
          const tableAnswer = answer as Record<number, Record<number, boolean>>;
          isQuestionAnswered = tableAnswer && Object.keys(tableAnswer).length > 0 &&
            Object.values(tableAnswer).some(row =>
              Object.keys(row).length > 0 && Object.values(row).some(cell => cell === true)
            );
        } else { // 'multiple_to_single', 'audio'
          isQuestionAnswered = answer && Array.isArray(answer) && answer.length > 0;
        }

        if (!isQuestionAnswered) {
          allAnswered = false;
          if (!firstUnansweredQuestionCoords) {
            firstUnansweredQuestionCoords = { audioIdx, questionIdx };
          }
          // console.log(`Unanswered: Audio ${audio.id}, Q ${question.id}`);
        }
      });
    });

    if (!allAnswered && firstUnansweredQuestionCoords) {
        toast.warning("Please answer all questions before submitting.", {
            description: "Scroll through the test to find unanswered questions.",
        });
        // Navigate to the first unanswered question
        setCurrentAudioIndex(firstUnansweredQuestionCoords.audioIdx);
        setCurrentQuestionIndex(firstUnansweredQuestionCoords.questionIdx);
        // Try to scroll after state update (might need a slight delay)
        setTimeout(() => {
            const element = document.getElementById(`q-${section.audios[firstUnansweredQuestionCoords!.audioIdx].questions[firstUnansweredQuestionCoords!.questionIdx].id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2', 'transition-all', 'duration-300');
                setTimeout(() => element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2'), 2500);
            }
        }, 100); // Small delay for state to potentially apply
        return;
    }
    // --- End Validation ---

    setIsSubmitting(true);
    try {
      console.log("Submitting answers:", JSON.stringify(answers, null, 2));
      const response = await submitListeningAnswers(Number(sectionId), answers, token);
      setScore(response.score);
      setIsComplete(true);
      toast.success('Test completed successfully!');
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error('Error submitting answers:', error);
      const errorMsg = error.response?.data?.message || 'Failed to submit answers. Please try again.';
      toast.error(errorMsg);
      // Only set submitting false if there was an error, otherwise it stays submitting until complete screen
      setIsSubmitting(false);
    }
    // No finally block needed here for setIsSubmitting if success path leads to completion screen
  };

  // --- Navigation & Callbacks ---

  // Question Navigation
  const handleNextQuestion = useCallback(() => {
    if (currentAudio && currentQuestionIndex < currentAudio.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  }, [currentAudio, currentQuestionIndex]); // Dependency on currentAudio needed

  const handlePrevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  }, [currentQuestionIndex]);

  // Audio Navigation
  const handleNextAudio = () => {
    if (!section || isSubmitting) return;
    // Ensure we are on the last question OR the current audio has no questions
    const isLastQuestion = currentAudio ? currentQuestionIndex >= currentAudio.questions.length - 1 : true;
    const audioHasQuestions = currentAudio ? currentAudio.questions.length > 0 : false;

    // Can proceed if audio played AND ( (it has questions AND we're on the last one) OR it has no questions )
    if (hasPlayedAudio && ( (audioHasQuestions && isLastQuestion) || !audioHasQuestions ) ) {
        if (currentAudioIndex < section.audios.length - 1) {
            setCurrentAudioIndex(currentAudioIndex + 1);
            window.scrollTo(0, 0);
            // Resetting question index is handled by the useEffect [currentAudioIndex]
        }
    } else if (!hasPlayedAudio) {
        toast.info("Please listen to the audio before proceeding.");
    } else {
        toast.info("Please navigate through all questions for this audio first.");
    }
  };

  const handlePrevAudio = () => {
    if (currentAudioIndex > 0 && !isSubmitting) {
      setCurrentAudioIndex(currentAudioIndex - 1);
      window.scrollTo(0, 0);
      // Resetting question index is handled by the useEffect [currentAudioIndex]
    }
  };

  const handleAudioComplete = () => {
    setHasPlayedAudio(true);
    setCurrentQuestionIndex(0); // Ensure question index is 0 when questions appear/reappear
  };

  // --- Calculations ---
  const calculateProgress = () => {
    if (!section) return 0;
    const totalAudios = section.audios.length;
    if (totalAudios === 0) return 0;
    // Progress based on *reaching* audios
    return ((currentAudioIndex + 1) / totalAudios) * 100;
  };


  // --- Render Logic ---

  // Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <div className="text-2xl font-semibold mb-2">Loading Listening Test...</div>
            <p className="text-gray-500">Please wait while we prepare your test.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error State (Failed to load section)
  if (!section) { // No need to check currentAudio here, section check is sufficient
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
             <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <div className="text-2xl font-semibold mb-2 text-red-600">Error Loading Test</div>
            <p className="text-gray-700 mb-6 max-w-md mx-auto">
              Failed to load the listening section data. Please check your connection or try again later.
            </p>
            <Button onClick={() => navigate('/listening')}>
              Return to Listening Sections
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
        <main className="flex-1 py-8">
          <div className="toefl-container max-w-4xl mx-auto px-4">
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Test Complete!</h2>
                  <p className="text-gray-600 mb-4">
                    You have successfully submitted the listening section.
                  </p>
                  {score !== null && (
                     <div className="inline-block bg-gray-100 rounded-lg px-6 py-4 mb-6">
                       <h3 className="text-lg mb-1 text-gray-700">Your Score</h3>
                       {/* Adjust score calculation if needed */}
                       <p className="text-4xl font-bold text-toefl-purple">{score} / {section.audios.reduce((sum, audio) => sum + audio.questions.length, 0)}</p>
                     </div>
                  )}
                   {score === null && (
                     <p className="text-gray-500 mb-6">Score calculation pending or not available.</p>
                   )}
                </div>
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <Button onClick={() => navigate('/listening')}>
                    Try Another Listening Section
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

  // --- Main Test View ---
  // Need to handle the case where section is loaded but currentAudio might be temporarily undefined (shouldn't happen with checks)
   if (!currentAudio) {
       // This case should ideally not be reached if loading/error states are correct
       // But as a fallback:
       return (
           <div className="flex flex-col min-h-screen">
               <Header />
               <main className="flex-1 flex items-center justify-center">
                   <p>Error: Could not find the current audio data.</p>
               </main>
               <Footer />
           </div>
       );
   }

  const isLastQuestionOfAudio = currentQuestionIndex >= currentAudio.questions.length - 1;
  const isLastAudio = currentAudioIndex >= section.audios.length - 1;
  const canProceedToNextAudio = hasPlayedAudio && (isLastQuestionOfAudio || currentAudio.questions.length === 0);
  const canSubmit = hasPlayedAudio && isLastAudio && (isLastQuestionOfAudio || currentAudio.questions.length === 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="toefl-container max-w-5xl mx-auto px-4"> {/* Increased max-width */}
          {/* Test header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-1 text-gray-800">{section.title}</h1>
              <div className="flex items-center text-sm text-gray-600">
                <Headphones className="mr-1.5 h-4 w-4 text-toefl-purple" />
                <span>Listening Section • Audio {currentAudioIndex + 1} of {section.audios.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 border rounded-lg px-4 py-2 shadow-sm bg-white">
                 <Clock className="mr-1 h-5 w-5 text-gray-500" />
                 <Timer initialSeconds={1800} running={!isComplete && !isLoading} onTimeout={() => { // Ensure timer stops on complete/loading
                    if (!isComplete && !isSubmitting) {
                       toast.warning("Time's up! Submitting your answers automatically.");
                       handleSubmit();
                    }
                 }} />
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8 dark:bg-gray-700">
            <div
              className="bg-toefl-purple h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${calculateProgress()}%` }}
              aria-valuenow={calculateProgress()}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="space-y-8">
            {/* Audio player and image */}
            <Card className="shadow-md overflow-hidden border border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl lg:text-2xl text-gray-800">{currentAudio.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {currentAudio.photo_url && (
                  <div className="mb-6 flex justify-center bg-gray-100 p-4 rounded-md border border-gray-200">
                    <img
                      src={resolveStaticUrl(currentAudio.photo_url)}
                      alt={`Visual aid for ${currentAudio.title}`}
                      className="max-w-md w-full h-auto rounded-md shadow-sm object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; console.error("Failed to load image:", currentAudio.photo_url); }}
                    />
                  </div>
                )}
                <div className="audio-player flex justify-center mb-3">
                  <AudioPlayer
                    key={currentAudio.id} // Force re-render on audio change
                    src={resolveStaticUrl(currentAudio.audio_url)}
                    onComplete={handleAudioComplete}
                    allowReplay={false} // Enforce single play for main audio
                  />
                </div>
                <p className="text-center text-sm text-gray-500 italic">
                  Listen carefully. The audio will play only once.
                </p>
              </CardContent>
            </Card>

            {/* Questions Area - Display current question */}
            {hasPlayedAudio && currentAudio.questions.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">
                    Question {currentQuestionIndex + 1} of {currentAudio.questions.length}
                    <span className='font-normal text-gray-600'> for "{currentAudio.title}"</span>
                </h3>
                {(() => { // Use IIFE to create scope for currentQuestion
                    // const question = currentAudio.questions[currentQuestionIndex]; // Already got this from useMemo: currentQuestion
                    if (!currentQuestion) return null; // Should not happen if length > 0, but safety first

                    const question = currentQuestion; // Alias for clarity if needed

                    // DEDICATED Handler for Inline Table Checkbox Changes
                    const handleInlineTableChange = (
                        rowIndex: number,
                        colIndex: number,
                        isChecked: boolean
                    ) => {
                        setAnswers(prev => {
                            const currentQuestionId = question.id;
                            const currentAudioId = currentAudio.id;

                            const newAnswers = JSON.parse(JSON.stringify(prev)); // Deep copy
                            if (!newAnswers[currentAudioId]) newAnswers[currentAudioId] = {};
                            if (!newAnswers[currentAudioId][currentQuestionId]) newAnswers[currentAudioId][currentQuestionId] = {};
                            if (!newAnswers[currentAudioId][currentQuestionId][rowIndex]) newAnswers[currentAudioId][currentQuestionId][rowIndex] = {};

                            newAnswers[currentAudioId][currentQuestionId][rowIndex][colIndex] = isChecked;

                            if (!isChecked) {
                                delete newAnswers[currentAudioId][currentQuestionId][rowIndex][colIndex];
                                if (Object.keys(newAnswers[currentAudioId][currentQuestionId][rowIndex]).length === 0) {
                                    delete newAnswers[currentAudioId][currentQuestionId][rowIndex];
                                }
                               // We keep the question entry even if table is empty now, simplifies submission/validation
                            }
                            return newAnswers;
                        });
                    };
                    // --- End Inline Table Handler ---

                    // --- RENDER THE CURRENT QUESTION CARD ---
                    return (
                        <Card key={question.id} id={`q-${question.id}`} className="shadow-sm border border-gray-200 bg-white">
                            <CardContent className="p-6">
                                {/* Question Prompt */}
                                <div className="flex items-start gap-3 mb-4">
                                <span className="flex-shrink-0 bg-gray-100 rounded-full w-7 h-7 text-sm text-center leading-7 font-medium text-gray-700 mt-0.5">
                                    {currentQuestionIndex + 1}
                                </span>
                                <p className="question-prompt flex-1 text-base text-gray-800">{question.prompt}</p>
                                </div>

                                {/* Question-specific audio */}
                                {question.type === 'audio' && question.audio_url && (
                                    <div className="my-4 pl-10">
                                        <p className="text-sm text-gray-600 mb-2 italic">Listen to part of the lecture again:</p>
                                        <AudioPlayer
                                        key={`q-${question.id}-audio`}
                                        src={resolveStaticUrl(question.audio_url)}
                                        allowReplay={true} // Usually allow replay for snippets
                                        />
                                    </div>
                                )}

                                {/* Render Options based on Type */}
                                <div className="options-container mt-4 pl-10 space-y-3">
                                    {/* === Multiple Choice Single Answer ('multiple_to_single', 'audio') === */}
                                    {(question.type === 'multiple_to_single' || question.type === 'audio') && question.options && (
                                        <RadioGroup
                                            value={answers[currentAudio.id]?.[question.id]?.[0] || ''} // Get single value
                                            onValueChange={(value) =>
                                                handleAnswerChange(currentAudio.id, question.id, value, question.type)
                                            }
                                            className="space-y-3"
                                        >
                                            {question.options.map((option, optIndex) => {
                                                const optionId = String.fromCharCode(97 + optIndex);
                                                return (
                                                <div key={optIndex} className="flex items-center test-option">
                                                    <RadioGroupItem value={optionId} id={`q${question.id}-opt${optIndex}`} className="mr-3" />
                                                    <Label htmlFor={`q${question.id}-opt${optIndex}`} className="cursor-pointer flex-1 font-normal text-gray-700">{option}</Label>
                                                </div>
                                                );
                                            })}
                                        </RadioGroup>
                                    )}

                                    {/* === Multiple Choice Multiple Answer ('multiple_to_multiple') === */}
                                    {question.type === 'multiple_to_multiple' && question.options && (
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-500 mb-2">Select all that apply:</p>
                                            {question.options.map((option, optIndex) => {
                                                const optionId = String.fromCharCode(97 + optIndex);
                                                const isChecked = (answers[currentAudio.id]?.[question.id] as string[])?.includes(optionId) ?? false;
                                                return (
                                                <div key={optIndex} className="flex items-center test-option">
                                                    <Checkbox
                                                        id={`q${question.id}-opt${optIndex}`}
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => handleAnswerChange(currentAudio.id, question.id, optionId, question.type, !!checked)}
                                                        className="mr-3"
                                                    />
                                                    <Label htmlFor={`q${question.id}-opt${optIndex}`} className="cursor-pointer flex-1 font-normal text-gray-700">{option}</Label>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* === Table Question ('table') with Inline Checkboxes === */}
                                    {question.type === 'table' && question.rows && question.columns && (
                                        <div className="overflow-x-auto -ml-10 pr-1">
                                            <Table className="border border-gray-300">
                                                <TableHeader className="bg-gray-100">
                                                    <TableRow>
                                                        <TableHead className="w-[200px] min-w-[150px] border-r border-gray-300 px-4 py-3"></TableHead>
                                                        {question.columns.map((col, colIndex) => (
                                                            <TableHead key={colIndex} className="text-center border-r border-gray-300 px-4 py-3 font-semibold text-gray-700">{col}</TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {question.rows.map((row, rowIndex) => (
                                                        <TableRow key={rowIndex} className="bg-white hover:bg-gray-50">
                                                            <TableCell className="font-semibold border-r border-gray-300 px-4 py-3 text-gray-800 align-middle">{row}</TableCell>
                                                            {question.columns?.map((_, colIndex) => {
                                                                const isChecked = Boolean(answers[currentAudio.id]?.[question.id]?.[rowIndex]?.[colIndex]);
                                                                return (
                                                                    <TableCell key={colIndex} className="text-center border-r border-gray-300 px-4 py-3 align-middle">
                                                                        <Checkbox
                                                                            id={`q${question.id}-row${rowIndex}-col${colIndex}`}
                                                                            checked={isChecked}
                                                                            onCheckedChange={(checked) => handleInlineTableChange(rowIndex, colIndex, !!checked)}
                                                                            aria-label={`Select column ${question.columns?.[colIndex] ?? colIndex + 1} for row ${row}`}
                                                                            className="h-5 w-5 mx-auto"
                                                                        />
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()} {/* End of IIFE for rendering current question */}

                {/* --- Add Question Navigation Buttons --- */}
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0 || isSubmitting}
                    className="gap-2"
                  >
                     <ChevronLeft className="h-4 w-4" />
                    Previous Question
                  </Button>
                  <Button
                    onClick={handleNextQuestion}
                    disabled={isLastQuestionOfAudio || isSubmitting} // Use calculated boolean
                    className="gap-2"
                  >
                    Next Question
                     <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

              </div>
            ) : hasPlayedAudio && currentAudio.questions.length === 0 ? (
                // Handle case where audio has played but has no questions
                <Card className="text-center py-12 border-dashed border-2 border-gray-300 bg-gray-100">
                    <CardContent>
                        <CheckCircle className="h-16 w-16 mx-auto text-green-500 opacity-70 mb-4" />
                        <h3 className="text-xl font-semibold mb-2 text-gray-700">Audio Complete</h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                           There are no questions for this audio segment. You can proceed to the next one when ready.
                        </p>
                    </CardContent>
                </Card>
            ) : (
              // Placeholder before audio has been played
              <Card className="text-center py-12 border-dashed border-2 border-gray-300 bg-gray-100">
                  <CardContent>
                     <Headphones className="h-16 w-16 mx-auto text-toefl-purple opacity-70 mb-4" />
                     <h3 className="text-xl font-semibold mb-2 text-gray-700">Listen to the Audio First</h3>
                     <p className="text-gray-600 max-w-md mx-auto">
                        The questions related to this audio passage will appear here after you finish listening.
                     </p>
                  </CardContent>
              </Card>
            )}
          </div>

          {/* Main Navigation buttons (Audio/Submit) */}
          <div className="mt-10 pt-6 border-t border-gray-300 flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
            <Button
              variant="outline"
              onClick={handlePrevAudio}
              disabled={currentAudioIndex === 0 || isSubmitting}
              className="gap-2 w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Audio
            </Button>

            {!isLastAudio ? ( // Show Next Audio Button if not the last audio
              <Button
                onClick={handleNextAudio}
                disabled={!canProceedToNextAudio || isSubmitting} // Use calculated boolean
                className="gap-2 w-full sm:w-auto"
              >
                Next Audio
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : ( // Show Submit Button on the last audio
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting} // Use calculated boolean
                className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                     Submitting...
                  </>
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

export default ListeningSectionPage;