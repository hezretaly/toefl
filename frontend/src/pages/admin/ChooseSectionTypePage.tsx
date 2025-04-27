// src/pages/admin/ChooseSectionTypePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Keep for potential future use or consistency
import Header from '@/components/layout/Header'; // Adjust path as needed
import Footer from '@/components/layout/Footer'; // Adjust path as needed
import { BookOpen, Headphones, Mic, PenSquare, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // Import useAuth for protected route behavior

const sectionTypes = [
  {
    title: 'Reading Section',
    description: 'Create passages with multiple choice, insert text, or prose summary questions.',
    icon: BookOpen,
    path: '/add-reading-section',
  },
  {
    title: 'Listening Section',
    description: 'Create sections with audio clips and various question types (MCQ, Table, etc.).',
    icon: Headphones,
    path: '/add-listening-section',
  },
  {
    title: 'Speaking Section',
    description: 'Create prompts for integrated or independent speaking tasks.',
    icon: Mic,
    path: '/add-speaking-section',
  },
  {
    title: 'Writing Section',
    description: 'Create prompts for integrated or independent writing tasks.',
    icon: PenSquare,
    path: '/add-writing-section',
  },
];

const ChooseSectionTypePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth(); // Check authentication

  // Basic loading and redirect logic (similar to AddReadingSectionPage)
  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
        // Optionally show toast before redirecting
        // toast.error("Authentication required.");
        navigate('/login', { replace: true });
    }
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


  const handleCardClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8">
        <div className="toefl-container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
             <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Button>
            <h1 className="text-3xl font-bold mb-2">Create New Section</h1>
            <p className="text-gray-600">Choose the type of TOEFL section you want to create.</p>
          </div>

          {/* Grid of Section Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sectionTypes.map((section) => (
              <Card
                key={section.path}
                className="cursor-pointer hover:shadow-lg hover:border-toefl-blue transition-all duration-200 flex flex-col" // Added flex-col
                onClick={() => handleCardClick(section.path)}
                role="link" // Accessibility: indicates it acts like a link
                aria-label={`Create new ${section.title}`} // Accessibility label
              >
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <section.icon className="h-6 w-6 text-toefl-blue flex-shrink-0" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow"> {/* Added flex-grow to push content */}
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
                {/* Optional: Add a subtle footer or action indicator if needed */}
                {/* <CardFooter className="text-sm text-toefl-blue font-medium">
                    Select →
                </CardFooter> */}
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChooseSectionTypePage;