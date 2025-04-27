import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, PlusCircle, Trash2, ArrowLeft, CheckCircle, CheckSquare, Square } from 'lucide-react'; // Added CheckSquare, Square
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createReadingSection } from '@/services/api';

// --- Updated Question Interface ---
// Made fields optional to accommodate different types
interface Question {
  id: string;
  type: string; // e.g., 'multiple_to_single', 'multiple_to_multiple', 'insert_text', 'prose_summary'
  prompt: string;
  options?: string[]; // Used by multiple_to_single, multiple_to_multiple, prose_summary
  correctOptionIndex?: number | null; // Used by multiple_to_single
  correctAnswerIndices?: number[]; // Used by multiple_to_multiple, prose_summary
  correctInsertionPoint?: string | null; // Used by insert_text ('a', 'b', 'c', 'd')
  paragraphIndex?: number | null | undefined; // below line is changed // Added field for paragraph association (0-based index)
}

interface Passage {
  id: string;
  title: string;
  content: string;
  questions: Question[];
}

// --- Updated Question Types ---
const QUESTION_TYPES = [
  { value: 'multiple_to_single', label: 'Multiple Choice (Select One)', defaultOptions: 4, requiresParagraph: true }, // below line is changed // Mark types needing paragraph
  { value: 'multiple_to_multiple', label: 'Multiple Select (Select Many)', defaultOptions: 4, requiresParagraph: true }, // below line is changed // Mark types needing paragraph
  { value: 'insert_text', label: 'Insert Text', defaultOptions: 0, requiresParagraph: false },
  { value: 'prose_summary', label: 'Prose Summary (Select 3)', defaultOptions: 6, requiresParagraph: false },
];

// --- Helper to get default state for a question type ---
const getDefaultQuestionState = (type: string): Partial<Question> => {
    const typeInfo = QUESTION_TYPES.find(t => t.value === type);
    const numOptions = typeInfo?.defaultOptions ?? 0;

    switch(type) {
        case 'multiple_to_single':
            return {
                options: Array(numOptions).fill(''),
                correctOptionIndex: null,
                correctAnswerIndices: undefined,
                correctInsertionPoint: undefined,
                paragraphIndex: undefined, // below line is changed // Reset paragraph index
            };
        case 'multiple_to_multiple':
            return {
                options: Array(numOptions).fill(''),
                correctAnswerIndices: [],
                correctOptionIndex: undefined,
                correctInsertionPoint: undefined,
                paragraphIndex: undefined, // below line is changed // Reset paragraph index
            };
        case 'insert_text':
            return {
                options: undefined,
                correctInsertionPoint: null,
                correctOptionIndex: undefined,
                correctAnswerIndices: undefined,
                paragraphIndex: undefined, // below line is changed // Reset paragraph index
            };
        case 'prose_summary':
             return {
                options: Array(numOptions).fill(''),
                correctAnswerIndices: [],
                correctOptionIndex: undefined,
                correctInsertionPoint: undefined,
                paragraphIndex: undefined, // below line is changed // Reset paragraph index
            };
        default:
            return {}; // Should not happen if type is valid
    }
}

const AddReadingSectionPage = () => {
  const [title, setTitle] = useState('');
  const [passages, setPassages] = useState<Passage[]>([{
    id: `passage-${Date.now()}`,
    title: '',
    content: '',
    questions: [{
      id: `question-${Date.now()}`,
      prompt: '',
      type: QUESTION_TYPES[0].value, // Default to first type
      ...getDefaultQuestionState(QUESTION_TYPES[0].value), // Get default structure
    } as Question] // Assert as Question
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isAuthenticated, isLoading, token } = useAuth(); // Get token from auth context
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center"><div>Checking authentication...</div></main>
        <Footer />
      </div>
    );
  }

  // --- Passage Handlers (Unchanged, using IDs) ---
  const handleAddPassage = () => {
    setPassages([...passages, {
      id: `passage-${Date.now()}`,
      title: '',
      content: '',
      questions: [{
        id: `question-${Date.now()}`,
        prompt: '',
        type: QUESTION_TYPES[0].value,
        ...getDefaultQuestionState(QUESTION_TYPES[0].value),
      } as Question]
    }]);
  };

  const handleRemovePassage = (passageId: string) => {
    setPassages(passages.filter(p => p.id !== passageId));
  };

  const handlePassageChange = (passageId: string, field: keyof Omit<Passage, 'id' | 'questions'>, value: string) => {
    setPassages(passages.map(p => p.id === passageId ? { ...p, [field]: value } : p));
  };

  // --- Question Handlers (Updated) ---
  const handleAddQuestion = (passageId: string) => {
    setPassages(passages.map(p =>
      p.id === passageId ? {
        ...p,
        questions: [
          ...p.questions,
          {
            id: `question-${Date.now()}`,
            prompt: '',
            type: QUESTION_TYPES[0].value,
            ...getDefaultQuestionState(QUESTION_TYPES[0].value),
          } as Question
        ]
      } : p
    ));
  };

  const handleRemoveQuestion = (passageId: string, questionId: string) => {
    setPassages(passages.map(p =>
      p.id === passageId ? {
        ...p,
        questions: p.questions.filter(q => q.id !== questionId)
      } : p
    ));
  };

  // Handles prompt changes for all types
  const handleQuestionPromptChange = (passageId: string, questionId: string, value: string) => {
    setPassages(passages.map(p =>
      p.id === passageId ? {
        ...p,
        questions: p.questions.map(q =>
          q.id === questionId ? { ...q, prompt: value } : q
        )
      } : p
    ));
  };

  // Handles type changes and resets structure
  const handleQuestionTypeChange = (passageId: string, questionId: string, type: string) => {
    setPassages(passages.map(p =>
      p.id === passageId ? {
        ...p,
        questions: p.questions.map(q =>
          q.id === questionId ? {
                ...q, // Keep id and prompt
                type: type,
                ...getDefaultQuestionState(type) // Reset specific fields for the new type
            } : q
        )
      } : p
    ));
  };

  // Handles option text changes
  const handleOptionChange = (passageId: string, questionId: string, optionIndex: number, value: string) => {
    setPassages(passages.map(p =>
      p.id === passageId ? {
        ...p,
        questions: p.questions.map(q =>
          q.id === questionId ? {
            ...q,
            options: (q.options ?? []).map((opt, idx) => idx === optionIndex ? value : opt) // Ensure options array exists
          } : q
        )
      } : p
    ));
  };

  // Handles single correct choice (Radio Button)
  const handleCorrectOptionChange = (passageId: string, questionId: string, optionIndex: number) => {
     setPassages(passages.map(p =>
      p.id === passageId ? {
        ...p,
        questions: p.questions.map(q =>
          q.id === questionId ? { ...q, correctOptionIndex: optionIndex } : q
        )
      } : p
    ));
  };

  // --- New Handler for Multiple Correct Choices (Checkbox) ---
  const handleToggleCorrectAnswerIndex = (passageId: string, questionId: string, optionIndex: number) => {
     setPassages(passages.map(p =>
      p.id === passageId ? {
        ...p,
        questions: p.questions.map(q => {
          if (q.id === questionId) {
            const currentIndices = q.correctAnswerIndices ?? [];
            const indexExists = currentIndices.includes(optionIndex);
            let newIndices: number[];

            if (indexExists) {
                newIndices = currentIndices.filter(idx => idx !== optionIndex); // Remove index
            } else {
                 // For prose_summary, limit to 3 selections (optional, adjust if needed)
                 if (q.type === 'prose_summary' && currentIndices.length >= 3) {
                    toast.warning("You can only select up to 3 options for Prose Summary.");
                    return q; // Prevent adding more than 3
                 }
                 newIndices = [...currentIndices, optionIndex]; // Add index
            }
            return { ...q, correctAnswerIndices: newIndices };
          }
          return q;
        })
      } : p
    ));
  };

  // --- New Handler for Insert Text Correct Point ---
  const handleCorrectInsertionPointChange = (passageId: string, questionId: string, point: string) => {
     setPassages(passages.map(p =>
      p.id === passageId ? {
        ...p,
        questions: p.questions.map(q =>
          q.id === questionId ? { ...q, correctInsertionPoint: point || null } : q // Store null if empty
        )
      } : p
    ));
  }

  // # below is a new code
  // --- New Handler for Paragraph Index Selection ---
  const handleParagraphIndexChange = (passageId: string, questionId: string, value: string) => {
    const index = value ? parseInt(value, 10) : null; // Convert string value to number or null
    setPassages(passages.map(p =>
      p.id === passageId ? {
        ...p,
        questions: p.questions.map(q =>
          q.id === questionId ? { ...q, paragraphIndex: index } : q
        )
      } : p
    ));
  };
  // # above is a new code


  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    if (!token) {
        toast.error("Authentication error. Please log in again.");
        return;
    }

    setIsSubmitting(true);

    // Prepare data for the API (Remove client-side IDs if backend doesn't need them)
    // Assuming backend expects snake_case (paragraph_index), otherwise adjust here
    const passagesForApi = passages.map(p => {
        const questionsForApi = p.questions.map(q => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, paragraphIndex, ...rest } = q; // Remove question id, separate paragraphIndex
            const questionPayload: any = { ...rest };
            // Only include paragraph_index if it's defined and not null for relevant types
            if (paragraphIndex !== null && paragraphIndex !== undefined && (q.type === 'multiple_to_single' || q.type === 'multiple_to_multiple')) {
                questionPayload.paragraph_index = paragraphIndex; // Map to snake_case for API
            }
            // Clean up potentially undefined/null fields based on type
            if (q.type !== 'multiple_to_single') questionPayload.correctOptionIndex = undefined;
            if (!['multiple_to_multiple', 'prose_summary'].includes(q.type)) questionPayload.correctAnswerIndices = undefined;
            if (q.type !== 'insert_text') questionPayload.correctInsertionPoint = undefined;
            if (!['multiple_to_single', 'multiple_to_multiple', 'prose_summary'].includes(q.type)) questionPayload.options = undefined;

            // Remove null/undefined values before sending to API
            Object.keys(questionPayload).forEach(key => {
                if (questionPayload[key] === undefined || questionPayload[key] === null) {
                    delete questionPayload[key];
                }
                // Ensure empty arrays are handled if needed, e.g., correctAnswerIndices
                if (Array.isArray(questionPayload[key]) && questionPayload[key].length === 0 && (key === 'correctAnswerIndices' || key === 'options')) {
                     // Decide if empty arrays should be sent or deleted
                     // delete questionPayload[key]; // Example: delete if empty
                }
            });

            return questionPayload;
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = p; // Remove passage id
        return { ...rest, questions: questionsForApi };
    });


    const sectionData = {
      title: title,
      passages: passagesForApi,
    };

    console.log("Submitting Reading Data:", JSON.stringify(sectionData, null, 2)); // Log data before submission with pretty print

    try {
      const response = await createReadingSection(sectionData, token);
      console.log("API Response:", response); // Log success response
      toast.success('Reading section created successfully!');
      navigate('/dashboard'); // Navigate on success
    } catch (error) {
      console.error('Error creating reading section:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Updated Validation ---
  const isFormValid = () => {
    if (!title.trim()) return false;

    for (const passage of passages) {
      if (!passage.title.trim() || !passage.content.trim()) return false;
      if (passage.questions.length === 0) return false;

      // Get non-empty paragraph count for validation
      const paragraphCount = passage.content.split('\n\n').filter(p => p.trim() !== '').length;

      for (const question of passage.questions) {
        if (!question.prompt.trim() || !question.type) return false;

        switch(question.type) {
            case 'multiple_to_single':
                if (!question.options || question.options.some(opt => !opt.trim())) return false;
                if (question.correctOptionIndex === null || question.correctOptionIndex < 0) return false;
                if (question.paragraphIndex === null || question.paragraphIndex === undefined || question.paragraphIndex < 0 || question.paragraphIndex >= paragraphCount) return false; // below line is changed // Validate paragraph index
                break;
            case 'multiple_to_multiple':
                if (!question.options || question.options.some(opt => !opt.trim())) return false;
                if (!question.correctAnswerIndices || question.correctAnswerIndices.length === 0) return false; // Must select at least one
                if (question.paragraphIndex === null || question.paragraphIndex === undefined || question.paragraphIndex < 0 || question.paragraphIndex >= paragraphCount) return false; // below line is changed // Validate paragraph index
                break;
            case 'insert_text':
                // Prompt is the sentence, already checked above
                if (!question.correctInsertionPoint) return false; // Must select a point
                break;
            case 'prose_summary':
                 if (!question.options || question.options.length !== 6 || question.options.some(opt => !opt.trim())) return false; // Must have 6 filled options
                 if (!question.correctAnswerIndices || question.correctAnswerIndices.length !== 3) return false; // Must select exactly 3 for TOEFL standard
                 break;
            default:
                return false; // Unknown type
        }
      }
    }
    return true;
  };

  // --- JSX Structure ---
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8">
        <div className="toefl-container max-w-5xl">
          {/* Header and Back Button */}
           <div className="flex items-center justify-between mb-8">
            <div>
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Button>
              <h1 className="text-3xl font-bold mb-2">Add Reading Section</h1>
              <p className="text-gray-600">Create a new reading section with passages and questions.</p>
            </div>
          </div>

          {/* Section Title Card */}
          <Card className="shadow-md mb-8">
            <CardHeader className="bg-toefl-blue bg-opacity-10">
              <CardTitle className="text-xl flex items-center gap-2"><BookOpen className="h-5 w-5 text-toefl-blue" />Section Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sectionTitle" className="block text-gray-700 font-medium mb-1">Section Title</Label>
                  <Input id="sectionTitle" placeholder="Enter section title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passages Mapping */}
          {passages.map((passage, passageIndex) => {
              // # below is a new code
              // Calculate paragraph count for this passage
              const paragraphs = passage.content.split('\n\n').filter(p => p.trim() !== '');
              const paragraphCount = paragraphs.length;
              // # above is a new code

              return (
                <Card key={passage.id} className="shadow-md mb-8">
                  {/* Passage Header */}
                  <CardHeader className="bg-gray-50 flex flex-row items-center justify-between p-4 border-b">
                    <CardTitle className="text-xl">Passage {passageIndex + 1}</CardTitle>
                    {passages.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemovePassage(passage.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                    )}
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="space-y-6">
                        {/* Passage Title & Content */}
                        <div>
                          <Label htmlFor={`passageTitle-${passage.id}`} className="block text-gray-700 font-medium mb-1">Passage Title</Label>
                          <Input id={`passageTitle-${passage.id}`} placeholder="Enter passage title" value={passage.title} onChange={(e) => handlePassageChange(passage.id, 'title', e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor={`passageContent-${passage.id}`} className="block text-gray-700 font-medium mb-1">Passage Content</Label>
                           <Textarea id={`passageContent-${passage.id}`} placeholder="Enter passage content (separate paragraphs with a blank line)" className="min-h-[200px]" value={passage.content} onChange={(e) => handlePassageChange(passage.id, 'content', e.target.value)} />
                           <p className="text-xs text-gray-500 mt-1">Paragraphs are separated by double line breaks (pressing Enter twice).</p> {/* below line is changed // Added hint */}
                        </div>

                        {/* Questions Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium border-t pt-4">Questions</h3>
                          {passage.questions.map((question, questionIndex) => {
                              // # below is a new code
                              // Check if this question type requires paragraph selection
                              const questionTypeInfo = QUESTION_TYPES.find(t => t.value === question.type);
                              const requiresParagraph = questionTypeInfo?.requiresParagraph ?? false;
                              // # above is a new code

                              return (
                              <div key={question.id} className="border rounded-md p-4 bg-white shadow-sm">
                                {/* Question Header: Number, Type Selector, Remove Button */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                                    <h4 className="font-medium text-base whitespace-nowrap">Question {questionIndex + 1}</h4>
                                    <div className="w-full sm:w-56 flex-shrink-0"> {/* Adjust width */}
                                      <Select value={question.type} onValueChange={(value) => handleQuestionTypeChange(passage.id, question.id, value)}>
                                          <SelectTrigger> <SelectValue placeholder="Select question type" /> </SelectTrigger>
                                          <SelectContent>
                                            {QUESTION_TYPES.map(type => ( <SelectItem key={type.value} value={type.value}> {type.label} </SelectItem> ))}
                                          </SelectContent>
                                      </Select>
                                    </div>
                                    {passage.questions.length > 1 && (
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveQuestion(passage.id, question.id)} className="text-red-500 hover:text-red-700 h-8 w-8 self-start sm:self-center">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Question Body - Conditional Rendering based on Type */}
                                <div className="space-y-4">
                                    {/* Prompt Input (Common to most types) */}
                                    <div>
                                      <Label htmlFor={`questionPrompt-${question.id}`} className="block text-gray-700 font-medium mb-1">
                                          {question.type === 'insert_text' ? 'Sentence to Insert' : 'Question Prompt'}
                                        </Label>
                                      <Textarea
                                          id={`questionPrompt-${question.id}`}
                                          placeholder={question.type === 'insert_text' ? 'Enter the sentence to insert...' : 'Enter question prompt...'}
                                          value={question.prompt}
                                          onChange={(e) => handleQuestionPromptChange(passage.id, question.id, e.target.value)}
                                        />
                                    </div>

                                    {/* # below is a new code */}
                                    {/* Paragraph Selector (Conditional) */}
                                    {requiresParagraph && (
                                      <div>
                                        <Label htmlFor={`paragraphSelect-${question.id}`} className="block text-gray-700 font-medium mb-1">Associated Paragraph</Label>
                                        <Select
                                          value={question.paragraphIndex !== null && question.paragraphIndex !== undefined ? String(question.paragraphIndex) : ''}
                                          onValueChange={(value) => handleParagraphIndexChange(passage.id, question.id, value)}
                                          disabled={paragraphCount === 0} // Disable if no paragraphs exist
                                        >
                                          <SelectTrigger id={`paragraphSelect-${question.id}`}>
                                            <SelectValue placeholder={paragraphCount > 0 ? "Select paragraph..." : "Enter passage content first"} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {paragraphCount > 0 ? (
                                              Array.from({ length: paragraphCount }).map((_, index) => (
                                                <SelectItem key={index} value={String(index)}>
                                                  Paragraph {index + 1}
                                                </SelectItem>
                                              ))
                                            ) : (
                                              // Render a non-selectable message instead of a SelectItem with value=""
                                              <div className="px-2 py-1.5 text-sm text-muted-foreground italic">
                                                No paragraphs detected
                                              </div>
                                            )}
                                          </SelectContent>
                                        </Select>
                                        {paragraphCount === 0 && <p className="text-xs text-red-500 mt-1">Please add content to the passage and ensure paragraphs are separated by double line breaks.</p>}
                                      </div>
                                    )}
                                    {/* # above is a new code */}


                                    {/* Type-Specific Inputs */}
                                    {question.type === 'multiple_to_single' && (
                                      <div className="space-y-3">
                                        <Label className="block text-gray-700 font-medium">Answer Options (Select the correct one)</Label>
                                        <RadioGroup
                                            value={question.correctOptionIndex !== null ? `option-${question.id}-${question.correctOptionIndex}` : undefined}
                                            onValueChange={(value) => {
                                              const index = parseInt(value.split('-').pop() || '-1', 10);
                                              if (index !== -1) handleCorrectOptionChange(passage.id, question.id, index);
                                            }}
                                        >
                                            {(question.options ?? []).map((option, optionIndex) => (
                                              <div key={optionIndex} className="flex items-center gap-3">
                                                  <RadioGroupItem value={`option-${question.id}-${optionIndex}`} id={`option-${question.id}-${optionIndex}`} />
                                                  <Label htmlFor={`option-${question.id}-${optionIndex}`} className="w-6 text-center font-medium cursor-pointer">{String.fromCharCode(65 + optionIndex)}</Label>
                                                  <Input placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} value={option} onChange={(e) => handleOptionChange(passage.id, question.id, optionIndex, e.target.value)} />
                                                  {question.correctOptionIndex === optionIndex && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                                              </div>
                                            ))}
                                        </RadioGroup>
                                      </div>
                                    )}

                                    {(question.type === 'multiple_to_multiple' || question.type === 'prose_summary') && (
                                        <div className="space-y-3">
                                            <Label className="block text-gray-700 font-medium">
                                                {question.type === 'prose_summary' ? 'Answer Options (Select exactly 3)' : 'Answer Options (Select all correct ones)'}
                                            </Label>
                                            {(question.options ?? []).map((option, optionIndex) => (
                                                <div key={optionIndex} className="flex items-center gap-3">
                                                    <Checkbox
                                                        id={`option-${question.id}-${optionIndex}`}
                                                        checked={(question.correctAnswerIndices ?? []).includes(optionIndex)}
                                                        onCheckedChange={() => handleToggleCorrectAnswerIndex(passage.id, question.id, optionIndex)}
                                                    />
                                                    <Label htmlFor={`option-${question.id}-${optionIndex}`} className="w-6 text-center font-medium cursor-pointer">{String.fromCharCode(65 + optionIndex)}</Label>
                                                    <Input placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} value={option} onChange={(e) => handleOptionChange(passage.id, question.id, optionIndex, e.target.value)} />
                                                    {/* Optional: visual checkmark for selected items */}
                                                    {(question.correctAnswerIndices ?? []).includes(optionIndex) && <CheckSquare className="h-5 w-5 text-blue-500 flex-shrink-0" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {question.type === 'insert_text' && (
                                        <div className="space-y-3">
                                            <Label htmlFor={`insertionPoint-${question.id}`} className="block text-gray-700 font-medium">Correct Insertion Point in Passage</Label>
                                            <Select
                                                value={question.correctInsertionPoint ?? ''}
                                                onValueChange={(value) => handleCorrectInsertionPointChange(passage.id, question.id, value)}
                                            >
                                                <SelectTrigger id={`insertionPoint-${question.id}`}>
                                                    <SelectValue placeholder="Select where the sentence should be inserted..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {['a', 'b', 'c', 'd'].map((label) => ( // Assuming 4 insertion points marked [a] [b] [c] [d] in passage content
                                                        <SelectItem key={label} value={label}>Insertion Point [{label}]</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-gray-500">Ensure the passage content includes markers like [a], [b], [c], [d] where the sentence could potentially be inserted.</p>
                                        </div>
                                    )}

                                </div> {/* End Question Body */}
                              </div>
                              );
                          })} {/* End Questions Map */}


                          {/* Add Question Button (Inside Passage Card) */}
                          <div className="flex justify-end pt-4 border-t mt-4">
                              <Button variant="outline" size="sm" onClick={() => handleAddQuestion(passage.id)} className="gap-1">
                                <PlusCircle className="h-4 w-4" /> Add Question to Passage {passageIndex + 1}
                              </Button>
                          </div>
                        </div> {/* End Questions Section */}
                    </div>
                  </CardContent>
                </Card>
              );
          })} {/* End Passages Mapping */}

          {/* Bottom Buttons */}
          <div className="flex justify-between mb-8 mt-8">
            <Button variant="outline" onClick={handleAddPassage} className="gap-2">
              <PlusCircle className="h-4 w-4" /> Add Another Passage
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid()} className="gap-2">
              {isSubmitting ? (<span className="animate-pulse">Submitting...</span>) : (<><BookOpen className="h-4 w-4" /> Create Reading Section</>)}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AddReadingSectionPage;