// --- File: ReadingSectionPage.tsx ---

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Save, CheckCircle, Square, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // For single choice
import { Checkbox } from "@/components/ui/checkbox"; // For multiple choice
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { fetchSectionById, submitReadingAnswers } from '@/services/api'; // Adjust path as needed
import Header from '@/components/layout/Header'; // Adjust path as needed
import Timer from '@/components/test/Timer';     // Adjust path as needed
import Footer from '@/components/layout/Footer'; // Adjust path as needed
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

// --- Interfaces ---
// Updated Question interface to include paragraph_index (as expected from API)
interface Question {
  id: number;
  type: string; // "multiple_to_single", "multiple_to_multiple", "insert_text", "prose_summary"
  prompt: string;
  options: string[];
  summary_statement?: string;
  paragraph_index?: number | null | undefined; // below line is changed // Added field for paragraph association (0-based index from API)
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

// Specific type for prose summary options used in D&D state
interface SummaryOption {
  id: string;
  text: string;
}

// --- Helper Functions ---
const parsePassageForInsert = (text: string): (string | { type: 'placeholder'; label: string })[] => {
    const regex = /(\[[a-z]\])/g;
    const parts = text.split(regex);
    const result: (string | { type: 'placeholder'; label: string })[] = [];
    parts.forEach((part) => {
        if (regex.test(part)) {
            result.push({ type: 'placeholder', label: part.slice(1, -1) });
        } else if (part) {
            result.push(part);
        }
    });
    return result;
};

// --- Component ---
const ReadingSectionPage = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const [section, setSection] = useState<ReadingSection | null>(null);
  // Answers format: { passageId: { questionId: string[] } } - ALWAYS an array
  const [answers, setAnswers] = useState<Record<number, Record<number, string[]>>>({});
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // --- State specifically for Prose Summary Drag & Drop ---
  const [proseDropZones, setProseDropZones] = useState<(SummaryOption | null)[]>([null, null, null]);
  const [proseAvailableOptions, setProseAvailableOptions] = useState<SummaryOption[]>([]);
  const draggedOptionRef = useRef<SummaryOption | null>(null);
  const draggedFromIndexRef = useRef<number | null>(null);

  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const currentPassage = section?.passages[currentPassageIndex];
  const currentQuestion = currentPassage?.questions[currentQuestionIndex];
  const questionType = currentQuestion?.type || '';

  // --- Derived boolean flags for question types ---
  const isProseSummaryQuestion = questionType === 'prose_summary';
  const isInsertTextQuestion = questionType === 'insert_text';
  const isMultipleToSingle = questionType === 'multiple_to_single';
  const isMultipleToMultiple = questionType === 'multiple_to_multiple';

  // --- Effects ---
  // Load section data
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const loadSection = async () => {
      setIsLoading(true);
      try {
        const numericSectionId = Number(sectionId);
        if (isNaN(numericSectionId)) {
            throw new Error("Invalid Section ID");
        }
        const data = await fetchSectionById('reading', numericSectionId, token);
        console.log("Fetched Section Data:", data); // Log fetched data
        setSection(data);
        // Initialize answers state based on fetched data
        const initialAnswers: Record<number, Record<number, string[]>> = {};
        data.passages.forEach(passage => {
          initialAnswers[passage.id] = {};
          passage.questions.forEach(question => {
            initialAnswers[passage.id][question.id] = []; // Initialize with empty array
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
    } else {
        toast.error("No section ID provided.");
        setIsLoading(false);
    }
  }, [sectionId, token, isAuthenticated, navigate]);

  // Reset/Initialize Prose Summary state when question changes
  useEffect(() => {
    if (currentQuestion && isProseSummaryQuestion && currentPassage) {
      const savedAnswerIDs = answers[currentPassage.id]?.[currentQuestion.id] || [];
      const allOptions: SummaryOption[] = (currentQuestion.options || []).map((text, index) => ({
        id: String(index), // Assuming backend options don't have unique IDs, use index
        text,
      }));

      const initialDropZones: (SummaryOption | null)[] = [null, null, null];
      const initialAvailableOptions: SummaryOption[] = [];
      const usedIDs = new Set<string>();

      savedAnswerIDs.forEach((id, index) => {
        const option = allOptions.find(opt => opt.id === id);
        if (option && index < initialDropZones.length) {
          initialDropZones[index] = option;
          usedIDs.add(id);
        }
      });

      allOptions.forEach(option => {
        if (!usedIDs.has(option.id)) {
          initialAvailableOptions.push(option);
        }
      });

      setProseDropZones(initialDropZones);
      setProseAvailableOptions(initialAvailableOptions);

    } else {
      setProseDropZones([null, null, null]);
      setProseAvailableOptions([]);
    }
  }, [currentQuestion, currentPassage?.id, answers, isProseSummaryQuestion]);


  // --- Handlers ---
  const handleAnswerChange = (passageId: number, questionId: number, value: string | string[]) => {
     const answerArray = Array.isArray(value) ? value : [value];
     setAnswers(prev => {
        const passageAnswers = prev[passageId] || {};
        return {
            ...prev,
            [passageId]: {
                ...passageAnswers,
                [questionId]: answerArray
            }
        };
     });
  };

  // Prose Summary Drag & Drop Handlers
  const handleProseDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    option: SummaryOption,
    fromDropZoneIndex: number | null = null
  ) => {
    draggedOptionRef.current = option;
    draggedFromIndexRef.current = fromDropZoneIndex;
    e.currentTarget.classList.add('opacity-50', 'shadow-lg');
     e.dataTransfer.setData('text/plain', option.id);
     e.dataTransfer.effectAllowed = "move";
  };

  const handleProseDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
     e.currentTarget.classList.remove('opacity-50', 'shadow-lg');
     draggedOptionRef.current = null;
     draggedFromIndexRef.current = null;
  };


  const handleProseDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleProseDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const droppedOnOption = proseDropZones[dropIndex];
    const draggedOption = draggedOptionRef.current;

    if (!draggedOption || !currentPassage || !currentQuestion) return;

    if (draggedFromIndexRef.current === dropIndex) {
        draggedOptionRef.current = null;
        draggedFromIndexRef.current = null;
        return;
    }

    const newDropZones = [...proseDropZones];
    let newAvailableOptions = [...proseAvailableOptions];

    if (draggedFromIndexRef.current !== null) {
      newDropZones[draggedFromIndexRef.current] = null;
    } else {
      newAvailableOptions = newAvailableOptions.filter(opt => opt.id !== draggedOption.id);
    }

    if (droppedOnOption) {
      if (!newAvailableOptions.some(opt => opt.id === droppedOnOption.id)) {
         newAvailableOptions.push(droppedOnOption);
      }
    }

    newDropZones[dropIndex] = draggedOption;

    setProseDropZones(newDropZones);
    setProseAvailableOptions(newAvailableOptions);

    const finalAnswerIDs = newDropZones
      .filter((opt): opt is SummaryOption => opt !== null)
      .map(opt => opt.id);
    handleAnswerChange(currentPassage.id, currentQuestion.id, finalAnswerIDs);

    draggedOptionRef.current = null;
    draggedFromIndexRef.current = null;
  };

  const handleProseRemoveFromDropZone = (removeIndex: number) => {
    const optionToRemove = proseDropZones[removeIndex];
    if (!optionToRemove || !currentPassage || !currentQuestion) return;

    const newDropZones = [...proseDropZones];
    newDropZones[removeIndex] = null;

    const newAvailableOptions = [...proseAvailableOptions];
    if (!newAvailableOptions.some(opt => opt.id === optionToRemove.id)) {
        newAvailableOptions.push(optionToRemove);
    }

    setProseDropZones(newDropZones);
    setProseAvailableOptions(newAvailableOptions);

    const finalAnswerIDs = newDropZones
      .filter((opt): opt is SummaryOption => opt !== null)
      .map(opt => opt.id);
    handleAnswerChange(currentPassage.id, currentQuestion.id, finalAnswerIDs);
  };


  const handleSubmit = async () => {
    if (!section || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const numericSectionId = Number(sectionId);
      if (isNaN(numericSectionId)) {
          throw new Error("Invalid Section ID during submission");
      }
      // Transform answers if needed (e.g., prose summary options might be indices but need IDs)
      // For now, assuming the `answers` state holds the correct format for the API.
      const response = await submitReadingAnswers(
        numericSectionId,
        answers,
        token
      );

      setScore(response.score);
      setIsComplete(true);
      toast.success('Test completed successfully!');
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast.error('Failed to submit answers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    const currentPassage = section?.passages[currentPassageIndex];
    if (!currentPassage) return;

    if (currentQuestionIndex < currentPassage.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      window.scrollTo(0, 0);
    } else if (currentPassageIndex < (section?.passages.length || 0) - 1) {
      setCurrentPassageIndex(currentPassageIndex + 1);
      setCurrentQuestionIndex(0);
      window.scrollTo(0, 0);
    }
   };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      window.scrollTo(0, 0);
    } else if (currentPassageIndex > 0) {
      const prevPassageIndex = currentPassageIndex - 1;
      const prevPassage = section?.passages[prevPassageIndex];
      if (prevPassage) {
        setCurrentPassageIndex(prevPassageIndex);
        setCurrentQuestionIndex(prevPassage.questions.length - 1);
      }
      window.scrollTo(0, 0);
    }
   };

  const calculateProgress = () => {
     if (!section) return 0;
     let totalQuestions = 0;
     section.passages.forEach(p => totalQuestions += p.questions.length);
     if (totalQuestions === 0) return 0;

     let completedQuestions = 0;
     for (let i = 0; i < currentPassageIndex; i++) {
         completedQuestions += section.passages[i].questions.length;
     }
     completedQuestions += currentQuestionIndex + 1;

     return Math.min(100, (completedQuestions / totalQuestions) * 100);
  };


  // --- Layout Determination ---
  const isFullWidthLayout = isInsertTextQuestion || isProseSummaryQuestion;

  // --- Render Logic ---

  // Loading State
  if (isLoading) {
    // below line is changed
    // Restore the actual loading state JSX
    return (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse text-2xl font-semibold mb-2">Loading Reading Test...</div>
              <p className="text-gray-500">Please wait while we prepare your test.</p>
            </div>
          </main>
          <Footer />
        </div>
      );
  }

  // Error State (if section failed to load)
  if (!section) {
    // below line is changed
    // Restore the actual error state JSX
    return (
       <div className="flex flex-col min-h-screen">
         <Header />
         <main className="flex-1 flex items-center justify-center px-4">
           <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <CardTitle className="text-red-600">Loading Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-700 mb-4">Failed to load the reading section data. Please check the URL or try again later.</p>
                    <Button onClick={() => navigate('/reading')}> {/* Adjust navigation target as needed */}
                        Return to Reading Sections
                    </Button>
                </CardContent>
           </Card>
         </main>
         <Footer />
       </div>
     );
  }

  // Completion State
  if (isComplete) {
    // below line is changed
    // Restore the actual completion state JSX
     return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 py-8">
          <div className="toefl-container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Test Complete!</h2>
                  <p className="text-gray-600 mb-4">
                    Thank you for completing the reading section.
                  </p>

                  <div className="inline-block bg-gray-100 rounded-lg px-6 py-4 mb-6">
                    <h3 className="text-lg mb-1">Your Score</h3>
                    <p className="text-4xl font-bold text-blue-600">{score !== null ? `${score}` : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Button onClick={() => navigate('/reading')}> {/* Adjust navigation target */}
                    Return to Reading Sections
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}> {/* Adjust navigation target */}
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
  const currentAnswerForInsert = answers[currentPassage?.id ?? -1]?.[currentQuestion?.id ?? -1]?.[0];

  // # below is a new code
  // Helper to format prompt with paragraph info
  const formatQuestionPrompt = (question: Question | undefined): string => {
    if (!question) return '';
    // Check if paragraph index exists (is not null or undefined) and question type is relevant
    if (
        (question.type === 'multiple_to_single' || question.type === 'multiple_to_multiple') &&
        question.paragraph_index !== null &&
        question.paragraph_index !== undefined
    ) {
      return `[Paragraph ${question.paragraph_index + 1}] ${question.prompt}`;
    }
    return question.prompt;
  };

  const formattedPrompt = formatQuestionPrompt(currentQuestion);
  // # above is a new code


  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 py-8">
        <div className="toefl-container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Test header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
             {/* Info */}
             <div>
              <h1 className="text-2xl font-bold mb-1 sm:mb-2">{section.title}</h1>
              {currentPassage && currentQuestion && (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="mr-1 h-4 w-4 flex-shrink-0" />
                  <span>
                    Reading • P {currentPassageIndex + 1}/{section.passages.length} •
                    Q {currentQuestionIndex + 1}/{currentPassage.questions.length}
                  </span>
                </div>
              )}
            </div>
            {/* Timer */}
            <div className="flex-shrink-0">
              <Timer initialSeconds={1200} running={!isComplete && !isSubmitting} onTimeout={() => {
                if (!isComplete && !isSubmitting) {
                    toast.warning("Time's up! Submitting your answers.");
                    handleSubmit();
                }
              }} />
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>

          {/* Main content area: Passage and Question */}
          <div className={`flex ${isFullWidthLayout ? 'flex-col' : 'flex-col lg:flex-row gap-8'}`}>

            {/* Reading passage (Side view with highlighting/indenting) */}
            {!isFullWidthLayout && currentPassage && (
               <div className="lg:w-1/2">
                <div className="sticky top-24"> {/* Adjust top offset as needed */}
                  <Card className="shadow-md">
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold mb-4">{currentPassage.title}</h2>
                      <div className="prose dark:prose-invert max-w-none reading-passage space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                        {(currentPassage.content || '')
                          .replace(/\[[a-z]\]/g, '') // Still remove insert placeholders
                          .split('\n\n')
                          .map((paragraphText, index) => {
                            // Highlight logic already uses paragraph_index from the question
                            const shouldHighlight =
                              currentQuestion &&
                              currentQuestion.paragraph_index === index && // Condition uses API field name
                              !isInsertTextQuestion &&
                              !isProseSummaryQuestion;

                            if (paragraphText.trim() === '') return null;

                            return (
                              <p
                                key={`passage-p-${index}`}
                                className={`
                                  transition-all duration-200 ease-in-out
                                  [text-indent:2em]
                                  ${shouldHighlight
                                    ? 'border-l-4 border-blue-500 pl-4 py-1 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-l-4 border-transparent pl-4 py-1'
                                  }
                                `}
                                dangerouslySetInnerHTML={{ __html: paragraphText }}
                              />
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* --- Question Area --- */}
            <div className={isFullWidthLayout ? 'w-full' : 'lg:w-1/2'}>
              {currentQuestion && currentPassage && (
                <>
                  {/* --- PROSE SUMMARY --- */}
                  {isProseSummaryQuestion && (
                      <Card className="shadow-md overflow-hidden">
                        <CardHeader>
                          <CardTitle>Prose Summary</CardTitle>
                          {currentQuestion.summary_statement && (
                              <CardDescription className="pt-2 !mt-2 border-t">
                                <span className="font-semibold block mb-2">Summary Statement:</span>
                                <span className="italic">{currentQuestion.summary_statement}</span>
                              </CardDescription>
                          )}
                          <CardDescription className="!mt-4">
                            {currentQuestion.prompt} {/* Prompt doesn't get paragraph prefix for summary */}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Available Options */}
                            <div className="space-y-3">
                               <h3 className="text-md font-semibold text-muted-foreground mb-2">Available Choices</h3>
                              {proseAvailableOptions.length > 0 ? (
                                proseAvailableOptions.map((option) => (
                                  <div
                                    key={`avail-${option.id}`}
                                    draggable
                                    onDragStart={(e) => handleProseDragStart(e, option)}
                                    onDragEnd={handleProseDragEnd}
                                    className="p-3 border rounded-md bg-card text-card-foreground cursor-move hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
                                  >
                                    <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                                    <span className="flex-1">{option.text}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground italic">All options used.</p>
                              )}
                            </div>
                             {/* Drop Zones */}
                            <div className="space-y-3">
                               <h3 className="text-md font-semibold text-muted-foreground mb-2">Your Summary (in order)</h3>
                              {proseDropZones.map((droppedOption, index) => (
                                <div
                                  key={`dropzone-${index}`}
                                  onDragOver={handleProseDragOver}
                                  onDrop={(e) => handleProseDrop(e, index)}
                                  className={`min-h-[60px] border-2 rounded-md flex items-center justify-center p-2 transition-colors ${
                                    droppedOption ? 'border-primary bg-primary/10' : 'border-dashed border-muted-foreground/50 bg-muted/30 hover:border-muted-foreground/80 hover:bg-muted/50'
                                  }`}
                                >
                                  {droppedOption ? (
                                    <div
                                      draggable
                                      onDragStart={(e) => handleProseDragStart(e, droppedOption, index)}
                                      onDragEnd={handleProseDragEnd}
                                      className="w-full p-2 bg-card text-card-foreground rounded shadow-sm cursor-move flex items-start justify-between gap-2"
                                    >
                                      <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5 invisible" aria-hidden="true" />
                                      <span className="flex-1 text-sm">{droppedOption.text}</span>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0" onClick={() => handleProseRemoveFromDropZone(index)} aria-label={`Remove option ${index + 1}`}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Drop choice #{index + 1}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                  )}

                  {/* --- INSERT TEXT --- */}
                  {isInsertTextQuestion && (
                      <Card className="shadow-md">
                        <CardContent className="p-6 space-y-6">
                             {/* Instruction Text */}
                            <div className="prose dark:prose-invert max-w-none">
                              <p>Look at the four squares <Square className="inline-block h-4 w-4 mx-1 align-middle" /> that indicate where the following sentence could be added to the passage.</p>
                              <p className="font-semibold border p-3 rounded bg-muted dark:bg-muted/30">
                                  {currentQuestion.prompt} {/* Prompt is the sentence, no paragraph prefix */}
                              </p>
                              <p>Where would the sentence best fit? Click a square <Square className="inline-block h-4 w-4 mx-1 align-middle" /> to select your answer.</p>
                            </div>
                             {/* Passage with interactive placeholders */}
                            <div className="prose dark:prose-invert max-w-none reading-passage border-t pt-4 mt-4">
                              {currentPassage?.title && <h3 className="text-lg font-semibold mb-3 !mt-0">{currentPassage.title}</h3>}
                              {parsePassageForInsert(currentPassage.content).map((part, index) => {
                                const key = typeof part === 'string' ? `text-${index}` : `placeholder-${part.label}`;
                                if (typeof part === 'string') {
                                  return <span key={key} dangerouslySetInnerHTML={{ __html: part }} />;
                                } else {
                                  const isSelected = currentAnswerForInsert === part.label;
                                  const insertedSentenceHtml = `<span class="inserted-text font-bold text-blue-700 dark:text-blue-400 mx-1">[${currentQuestion.prompt}]</span>`; // Example styling for inserted text
                                  return (
                                      <React.Fragment key={key}>
                                          {/* Render the clickable square/button *before* the potential insertion point */}
                                          <Button
                                              variant={isSelected ? "default" : "outline"} // Change variant when selected
                                              size="icon"
                                              className={`h-5 w-5 mx-1 align-middle relative -top-0.5 ${isSelected ? 'border-2 border-blue-600 ring-2 ring-blue-300' : 'border-muted-foreground/50 hover:border-muted-foreground'}`}
                                              onClick={() => handleAnswerChange(currentPassage.id, currentQuestion.id, part.label)}
                                              aria-label={`Insert text at position ${part.label}`}
                                          >
                                              <Square className="h-3 w-3" />
                                          </Button>
                                          {/* Conditionally render the inserted sentence *after* the button */}
                                          {isSelected && <span dangerouslySetInnerHTML={{ __html: insertedSentenceHtml }} />}
                                      </React.Fragment>
                                  );
                                }
                              })}
                            </div>
                         </CardContent>
                      </Card>
                  )}

                  {/* --- MULTIPLE TO SINGLE (Radio Buttons) --- */}
                  {isMultipleToSingle && (
                     <Card className="shadow-md">
                      <CardContent className="p-6 space-y-6">
                        <div className="flex items-start space-x-3">
                          <span className="inline-flex items-center justify-center bg-muted rounded-full w-7 h-7 text-center leading-7 font-semibold flex-shrink-0">
                              {currentQuestionIndex + 1}
                          </span>
                          {/* Use the formatted prompt */}
                          <p className="question-prompt prose dark:prose-invert max-w-none pt-0.5" dangerouslySetInnerHTML={{ __html: formattedPrompt }} /> {/* below line is changed */}
                        </div>
                        {/* Paragraph Cue - This might be redundant now the prompt includes it, but kept for clarity */}
                        {currentQuestion.paragraph_index !== undefined && currentQuestion.paragraph_index !== null && (
                          <p className="pl-10 text-sm text-muted-foreground italic">
                            (This question refers to paragraph {currentQuestion.paragraph_index + 1})
                          </p>
                        )}
                        {currentQuestion.options && currentQuestion.options.length > 0 && (
                          <RadioGroup
                            value={answers[currentPassage.id]?.[currentQuestion.id]?.[0] || ''}
                            onValueChange={(value) => {
                              handleAnswerChange(currentPassage.id, currentQuestion.id, value);
                            }}
                            className="mt-4 space-y-3 pl-10"
                          >
                            {currentQuestion.options.map((option, optIndex) => {
                              const optionValue = String.fromCharCode(97 + optIndex); // 'a', 'b', 'c'...
                              const optionId = `q${currentQuestion.id}-opt${optionValue}`;
                              return (
                                <div key={optionId} className="flex items-start space-x-2 test-option">
                                  <RadioGroupItem value={optionValue} id={optionId} className="mt-1" />
                                  <Label htmlFor={optionId} className="cursor-pointer flex-1 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: option }} />
                                </div>
                              );
                            })}
                          </RadioGroup>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* --- MULTIPLE TO MULTIPLE (Checkboxes) --- */}
                  {isMultipleToMultiple && (
                     <Card className="shadow-md">
                      <CardContent className="p-6 space-y-6">
                         <div className="flex items-start space-x-3">
                          <span className="inline-flex items-center justify-center bg-muted rounded-full w-7 h-7 text-center leading-7 font-semibold flex-shrink-0">
                              {currentQuestionIndex + 1}
                          </span>
                           {/* Use the formatted prompt */}
                          <p className="question-prompt prose dark:prose-invert max-w-none pt-0.5" dangerouslySetInnerHTML={{ __html: formattedPrompt }} /> {/* below line is changed */}
                        </div>
                         {/* Paragraph Cue - Redundant but kept */}
                         {currentQuestion.paragraph_index !== undefined && currentQuestion.paragraph_index !== null && (
                          <p className="pl-10 text-sm text-muted-foreground italic">
                            (This question refers to paragraph {currentQuestion.paragraph_index + 1})
                          </p>
                        )}
                         {currentQuestion.options && currentQuestion.options.length > 0 && (
                          <div className="mt-4 space-y-3 pl-10">
                            {currentQuestion.options.map((option, optIndex) => {
                              const optionValue = String.fromCharCode(97 + optIndex); // 'a', 'b', 'c'...
                              const optionId = `q${currentQuestion.id}-opt${optionValue}`;
                              const currentSelectedAnswers = answers[currentPassage.id]?.[currentQuestion.id] || [];

                              return (
                                <div key={optionId} className="flex items-start space-x-2 test-option">
                                  <Checkbox
                                    id={optionId}
                                    checked={currentSelectedAnswers.includes(optionValue)}
                                    onCheckedChange={(isChecked) => {
                                      let nextSelectedAnswers: string[];
                                      if (isChecked) {
                                        nextSelectedAnswers = Array.from(new Set([...currentSelectedAnswers, optionValue]));
                                      } else {
                                        nextSelectedAnswers = currentSelectedAnswers.filter(val => val !== optionValue);
                                      }
                                      handleAnswerChange(currentPassage.id, currentQuestion.id, nextSelectedAnswers);
                                    }}
                                    className="mt-1"
                                  />
                                  <Label htmlFor={optionId} className="cursor-pointer flex-1 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: option }} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* --- Question Navigation --- */}
              <div className="mt-6 flex justify-between items-center">
                {/* Previous Button */}
                <Button
                  variant="outline"
                  onClick={handlePrevQuestion}
                  disabled={(currentPassageIndex === 0 && currentQuestionIndex === 0) || isLoading || isSubmitting}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {/* Question number pagination (centered, optional) */}
                 {currentPassage && currentPassage.questions.length > 1 && (
                  <Pagination className="w-auto mx-auto hidden sm:flex">
                    <PaginationContent>
                      {currentPassage.questions.map((_, index) => (
                        <PaginationItem key={`qnav-${index}`}>
                          <PaginationLink
                            size="sm"
                            isActive={index === currentQuestionIndex}
                            onClick={() => !isLoading && !isSubmitting && setCurrentQuestionIndex(index)}
                            className={`cursor-pointer ${isLoading || isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}
                            aria-label={`Go to question ${index + 1}`}
                          >
                            {index + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    </PaginationContent>
                  </Pagination>
                 )}

                {/* Next / Submit Button */}
                {currentPassage && currentPassageIndex === section.passages.length - 1 && currentQuestionIndex === currentPassage.questions.length - 1 ? (
                  // Last question: Show Submit button
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || isLoading}
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSubmitting ? (
                       <>
                         <span className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full mr-2"></span>
                         Submitting...
                       </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Submit Test
                      </>
                    )}
                  </Button>
                ) : (
                  // Not the last question: Show Next button
                  <Button
                    onClick={handleNextQuestion}
                    disabled={isLoading || isSubmitting}
                    className="gap-1.5"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div> {/* End Question Area */}
          </div> {/* End Main Content Flex */}
        </div> {/* End Container */}
      </main>

      <Footer />
    </div>
  );
};

export default ReadingSectionPage;