'use client';

import { useState } from 'react';
import { FileText, HelpCircle, Bell, Loader2 } from 'lucide-react';

interface QuizTopic {
  id: string;
  name: string;
  description?: string;
}

interface Slide {
  id: string;
  title: string;
  mediaUrl?: string;
  dayNumber?: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  createdAt: string;
}

interface QuizTabsProps {
  courseId: number;
  topics: QuizTopic[];
}

type Tab = 'slides' | 'quiz' | 'announcements';

export default function QuizTabs({ courseId, topics }: QuizTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('slides');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  const fetchSlides = async () => {
    setLoadingSlides(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/slides`);
      if (response.ok) {
        const data = await response.json();
        setSlides(data.slides || []);
      }
    } catch (error) {
      console.error('Failed to fetch slides:', error);
    } finally {
      setLoadingSlides(false);
    }
  };

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/announcements`);
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleTabChange = async (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'slides' && slides.length === 0) {
      await fetchSlides();
    } else if (tab === 'announcements' && announcements.length === 0) {
      await fetchAnnouncements();
    }
  };

  const tabs = [
    { id: 'slides' as Tab, label: 'Slides', icon: FileText },
    { id: 'quiz' as Tab, label: 'Quiz', icon: HelpCircle },
    { id: 'announcements' as Tab, label: 'Announcements', icon: Bell },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'slides' && (
          <SlidesContent loading={loadingSlides} slides={slides} />
        )}
        {activeTab === 'quiz' && (
          <QuizContent topics={topics} courseId={courseId} />
        )}
        {activeTab === 'announcements' && (
          <AnnouncementsContent loading={loadingAnnouncements} announcements={announcements} />
        )}
      </div>
    </div>
  );
}

function SlidesContent({ loading, slides }: { loading: boolean; slides: Slide[] }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No slides available for this course yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {slides.map((slide) => (
        <div
          key={slide.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          {slide.dayNumber && (
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded mb-2">
              Day {slide.dayNumber}
            </span>
          )}
          <h3 className="font-semibold text-gray-800 mb-2">{slide.title}</h3>
          {slide.mediaUrl && (
            <img
              src={slide.mediaUrl}
              alt={slide.title}
              className="w-full rounded-lg"
            />
          )}
        </div>
      ))}
    </div>
  );
}

function AnnouncementsContent({ loading, announcements }: { loading: boolean; announcements: Announcement[] }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No announcements for this course yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className={`border-l-4 rounded-r-lg p-4 ${
            announcement.priority === 'high'
              ? 'border-red-500 bg-red-50'
              : announcement.priority === 'medium'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-gray-300 bg-gray-50'
          }`}
        >
          <h3 className="font-semibold text-gray-800 mb-2">{announcement.title}</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{announcement.content}</p>
          <p className="text-xs text-gray-400 mt-2">
            {new Date(announcement.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ))}
    </div>
  );
}

interface QuizContentProps {
  topics: QuizTopic[];
  courseId: number;
}

function QuizContent({ topics, courseId }: QuizContentProps) {
  const [quizState, setQuizState] = useState<'setup' | 'loading' | 'question' | 'result'>('setup');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syllabusMap, setSyllabusMap] = useState<Record<string, string>>({});

  const handleStartQuiz = async () => {
    if (selectedTopics.length === 0) {
      alert('Please select at least one topic');
      return;
    }

    setLoading(true);
    setQuizState('loading');

    try {
      const startResponse = await fetch(`/api/courses/${courseId}/quiz/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          numQuestions,
          difficulty,
          topics: selectedTopics,
        }),
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start quiz');
      }

      const startData = await startResponse.json();
      const syllabusData = startData.syllabusData || [];

      const map: Record<string, string> = {};
      syllabusData.forEach((item: { topic_name: string; content: string }) => {
        map[item.topic_name] = item.content;
      });
      setSyllabusMap(map);

      if (startData.attemptId) {
        setAttemptId(startData.attemptId);
        setTotalQuestions(numQuestions);
        setTimeLeft(numQuestions * (difficulty === 'easy' ? 60 : difficulty === 'medium' ? 90 : 120));
        setQuizState('question');
        fetchQuestion(startData.attemptId, 1, map);
      } else {
        throw new Error('Failed to create quiz attempt');
      }
    } catch (error) {
      console.error('Quiz start error:', error);
      alert('Failed to start quiz. Please try again.');
      setQuizState('setup');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestion = async (attemptId: string, qNum: number, syllabus: Record<string, string>) => {
    setLoading(true);
    setSelectedOption(null);

    try {
      const topicName = selectedTopics[(qNum - 1) % selectedTopics.length];
      const syllabusContent = syllabus[topicName] || 'Default physiotherapy content';

      const response = await fetch(`/api/courses/${courseId}/quiz/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          attemptId,
          questionNumber: qNum,
          totalQuestions: numQuestions,
          topicName,
          syllabusContent,
          previousTopics: Object.keys(syllabus),
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }

      const data = await response.json();
      setCurrentQuestion(data.question);
      setQuestionNumber(qNum);
    } catch (error) {
      console.error('Question fetch error:', error);
      alert('Failed to load question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (selectedOption === null || !attemptId) return;

    setAnswers(prev => ({ ...prev, [questionNumber - 1]: selectedOption }));

    try {
      await fetch(`/api/courses/${courseId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          questionIndex: questionNumber - 1,
          selectedOption,
          timeSpent: 30,
        }),
      });
    } catch (error) {
      console.error('Submit error:', error);
    }

    if (questionNumber < totalQuestions) {
      fetchQuestion(attemptId, questionNumber + 1, syllabusMap);
    } else {
      await finishQuiz();
    }
  };

  const handleNext = () => {
    if (questionNumber < totalQuestions) {
      fetchQuestion(attemptId!, questionNumber + 1, syllabusMap);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setLoading(true);
    setQuizState('loading');

    try {
      const response = await fetch(`/api/courses/${courseId}/quiz/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          courseTitle: 'Orthopedics Batch',
          topics: selectedTopics,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get results');
      }

      const data = await response.json();
      setResult(data);
      setQuizState('result');
    } catch (error) {
      console.error('Result error:', error);
      alert('Failed to get results. Please try again.');
      setQuizState('setup');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setQuizState('setup');
    setSelectedTopics([]);
    setAnswers({});
    setResult(null);
    setCurrentQuestion(null);
    setAttemptId(null);
  };

  if (quizState === 'setup') {
    return (
      <div className="max-w-2xl mx-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Start a New Quiz</h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Questions (Max 50)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <div className="flex gap-4">
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    difficulty === level
                      ? level === 'easy'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : level === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-500'
                        : 'bg-red-100 text-red-700 border-2 border-red-500'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Topics ({selectedTopics.length} selected)
            </label>
            <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
              {topics.length === 0 ? (
                <p className="text-gray-500 text-sm">No topics available. Topics will appear after syllabus is added.</p>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedTopics(topics.map(t => t.name))}
                    className="w-full text-sm text-blue-600 hover:text-blue-800 mb-2"
                  >
                    Select All
                  </button>
                  {topics.map((topic) => (
                    <label
                      key={topic.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(topic.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTopics([...selectedTopics, topic.name]);
                          } else {
                            setSelectedTopics(selectedTopics.filter(t => t !== topic.name));
                          }
                        }}
                        className="mt-1 h-4 w-4 text-blue-600 rounded"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{topic.name}</p>
                        {topic.description && (
                          <p className="text-sm text-gray-500">{topic.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleStartQuiz}
            disabled={selectedTopics.length === 0 || loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting Quiz...
              </>
            ) : (
              'Start Quiz'
            )}
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (quizState === 'question' && currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              {currentQuestion.topic}
            </span>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            difficulty === 'easy' ? 'bg-green-100 text-green-700' :
            difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {difficulty}
          </span>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">{currentQuestion.question}</h3>
        </div>

        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option: { text: string; isCorrect: boolean }, index: number) => (
            <button
              key={index}
              onClick={() => setSelectedOption(index)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                selectedOption === index
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="font-medium text-gray-700">
                {String.fromCharCode(65 + index)}.
              </span>
              <span className="ml-2 text-gray-800">{option.text}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleAnswerSubmit}
          disabled={selectedOption === null || loading}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : questionNumber < totalQuestions ? (
            'Submit & Next Question'
          ) : (
            'Submit & See Results'
          )}
        </button>

        <div className="mt-4 flex justify-between text-sm text-gray-500">
          <span>{Object.keys(answers).length} answered</span>
          <span>{totalQuestions - Object.keys(answers).length} remaining</span>
        </div>
      </div>
    );
  }

  if (quizState === 'result' && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
            result.percentage >= 80 ? 'bg-green-100' :
            result.percentage >= 60 ? 'bg-yellow-100' :
            'bg-red-100'
          }`}>
            <span className={`text-3xl font-bold ${
              result.percentage >= 80 ? 'text-green-600' :
              result.percentage >= 60 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {result.percentage}%
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {result.percentage >= 80 ? 'Excellent!' :
             result.percentage >= 60 ? 'Good Job!' :
             'Keep Learning!'}
          </h2>
          <p className="text-gray-600">
            You scored {result.score} out of {result.totalQuestions}
          </p>
        </div>

        {result.summary && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-3">Summary</h3>
            <p className="text-gray-600 mb-4">{result.summary.summary}</p>

            {result.summary.recommendations && result.summary.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Recommendations:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {result.summary.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-gray-600 text-sm">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <h3 className="font-bold text-gray-800">Question Review</h3>
          {result.detailedResults?.map((item: any) => (
            <div
              key={item.questionNumber}
              className={`border rounded-lg p-4 ${
                item.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-gray-800">
                  Q{item.questionNumber}: {item.question}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {item.isCorrect ? 'Correct' : 'Wrong'}
                </span>
              </div>

              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Your Answer: </span>
                  <span className={item.isCorrect ? 'text-green-600' : 'text-red-600'}>
                    {item.userAnswer !== undefined && item.userAnswer >= 0
                      ? item.options[item.userAnswer]?.text
                      : 'Not answered'}
                  </span>
                </p>
                {!item.isCorrect && (
                  <p>
                    <span className="text-gray-500">Correct Answer: </span>
                    <span className="text-green-600">
                      {item.options[item.correctAnswer]?.text}
                    </span>
                  </p>
                )}
                <p>
                  <span className="text-gray-500">Explanation: </span>
                  <span className="text-gray-600">{item.explanation}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleRetry}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Take Another Quiz
        </button>
      </div>
    );
  }

  return null;
}
