import React, { useState, useEffect } from 'react';
import TopMenu from '../components/TopMenu';
import Navigation from '../components/Navigation';
import AudioPlayerComponent from '../components/AudioPlayerComponent';
import StaticImageArea from '../components/StaticImageArea';
import TableCompletionQuestion from '../components/TableCompletionQuestion';
import MultipleChoiceQuestion from '../components/MultipleChoiceQuestion';
import { TrackConfig, Question, TableCompletionQuestion as TableCompletionQuestionType, QuestionType } from '../types/listening';

interface ListeningQuestionPageProps {
    trackType: 'conversation' | 'lecture';
    trackConfig: TrackConfig;
    sectionProgress: string;
    sectionTimer: string;
    onTrackComplete: () => void;
}

const ListeningQuestionPage: React.FC<ListeningQuestionPageProps> = ({
    trackType,
    trackConfig,
    sectionProgress,
    sectionTimer,
    onTrackComplete,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioCompleted, setAudioCompleted] = useState(false);
    const [showQuestions, setShowQuestions] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>(
        {}
    );

    useEffect(() => {
        if (trackConfig) {
            setIsPlaying(true);
            setAudioCompleted(false);
            setShowQuestions(false);
            const timer = setTimeout(() => {
                setAudioCompleted(true);
                setIsPlaying(false);
                setShowQuestions(true);
            }, trackConfig.audioLength * 1000);

            return () => clearTimeout(timer);
        }
    }, [trackConfig]);

    useEffect(() => {
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
    }, [trackConfig]);

    const handlePlay = () => {
        setIsPlaying(true);
    };

    const handlePause = () => {
        setIsPlaying(false);
    };

    const submitAnswers = () => {
        console.log('Submitting answers:', selectedAnswers);
    };

    const handleNext = () => {
        if (!showQuestions) {
            setShowQuestions(true);
            return;
        }

        if (currentQuestionIndex < trackConfig.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            submitAnswers();
            onTrackComplete();
        }
    };

    const handleTableAnswerChange = (questionId: string, rowIndex: number, colIndex: number, value: string | boolean) => {
        setSelectedAnswers(prev => {
            const currentQuestion = trackConfig.questions[currentQuestionIndex];
            const currentQuestionId = currentQuestion.id;

            const currentAnswers = (prev[currentQuestionId] || []) as (string | boolean)[][];
            const updatedAnswers = currentAnswers.map(row => [...row]);

            if (!updatedAnswers[rowIndex]) {
                updatedAnswers[rowIndex] = [];
            }

            updatedAnswers[rowIndex][colIndex] = value;

            return {
                ...prev,
                [currentQuestionId]: updatedAnswers
            };
        });
    };

    const handleMultipleChoiceAnswerChange = (questionId: string, answerId: string) => {
        setSelectedAnswers(prev => {
            const question = trackConfig.questions.find(q => q.id === questionId);
            const isMultipleChoice = question?.type === 'multiple-choice-multiple-answer';

            if (isMultipleChoice) {
                const selectedAnswersArray = (prev[questionId] || []) as string[];
                if (selectedAnswersArray.includes(answerId)) {
                    return {
                        ...prev,
                        [questionId]: selectedAnswersArray.filter(id => id !== answerId)
                    };
                } else {
                    return {
                        ...prev,
                        [questionId]: [...selectedAnswersArray, answerId]
                    };
                }
            } else {
                return {
                    ...prev,
                    [questionId]: answerId
                };
            }
        });
    };

    const renderQuestionComponent = (question: Question | TableCompletionQuestionType) => {
        switch (question.type) {
            case 'table-completion':
                const tableQuestion = question as TableCompletionQuestionType;
                const questionId = tableQuestion.id;
                return (
                    <TableCompletionQuestion
                        questionText={tableQuestion.text}
                        columnHeaders={tableQuestion.columnHeaders}
                        rowHeaders={tableQuestion.rowHeaders}
                        answers={(selectedAnswers[questionId] || [[]]) as boolean[][]}
                        onAnswerChange={(rowIndex, colIndex, value) => handleTableAnswerChange(questionId, rowIndex, colIndex, value)}
                    />
                );
            case 'single-choice':
            case 'multiple-choice-multiple-answer':
                return (
                    <MultipleChoiceQuestion
                        questionText={question.text}
                        options={question.options}
                        selectedAnswer={selectedAnswers[question.id] || []}
                        onAnswerChange={(answerId) => handleMultipleChoiceAnswerChange(question.id, answerId)}
                        isMultipleChoice={question.type === 'multiple-choice-multiple-answer'}
                    />
                );
            default:
                return <div>Unsupported Question Type</div>;
        }
    };

    const currentQuestion = trackConfig.questions[currentQuestionIndex];

    if (!currentQuestion) {
        return null;
    }


  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <TopMenu
        sectionTitle="Listening Section"
        questionProgress={sectionProgress}
        timer={sectionTimer}
      />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {!showQuestions ? (
            <>
              {trackConfig.audioSrc && (
                <AudioPlayerComponent
                  key={trackConfig.id}
                  audioSrc={trackConfig.audioSrc}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  isPlaying={isPlaying}
                />
              )}

              {trackConfig.imageUrl && (
                <StaticImageArea imageUrl={trackConfig.imageUrl} />
              )}

              <div className="text-center">
                <p
                  className={`text-lg ${
                    isPlaying ? 'text-teal-600 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {isPlaying
                    ? `${
                        trackType === 'conversation' ? 'Conversation' : 'Lecture'
                      } is playing. Listen carefully.`
                    : `Click Play to start ${
                        trackType === 'conversation' ? 'Conversation' : 'Lecture'
                      }.`}
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-8">
              {renderQuestionComponent(currentQuestion)}
            </div>
          )}
        </div>
      </main>

      <div className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4">
          <Navigation onNext={handleNext} />
        </div>
      </div>
    </div>
  );
};

export default ListeningQuestionPage;
