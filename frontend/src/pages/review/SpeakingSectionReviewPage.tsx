
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, Play, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// This would be populated with real data in a production application
const mockStudents = [
  { id: 1, name: "John Doe", submittedDate: "2023-04-05" },
  { id: 2, name: "Jane Smith", submittedDate: "2023-04-06" },
  { id: 3, name: "Robert Johnson", submittedDate: "2023-04-07" }
];

const SpeakingSectionReviewPage = () => {
  const { secId } = useParams<{ secId: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
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
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="toefl-container max-w-5xl">
          <div className="flex flex-col lg:flex-row items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Speaking Test Reviews</h1>
              <p className="text-gray-600">
                Review speaking test submissions and provide feedback.
              </p>
            </div>
            
            <div className="mt-4 lg:mt-0">
              <Button 
                variant="outline"
                onClick={() => navigate('/review')}
                className="gap-2"
              >
                Back to Reviews
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-toefl-green" />
                Speaking Test: Section #{secId}
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-4 px-4 font-medium text-gray-600">Student</th>
                      <th className="text-left py-4 px-4 font-medium text-gray-600">Submitted</th>
                      <th className="text-center py-4 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-right py-4 px-4 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  
                  <tbody>
                    {mockStudents.map(student => (
                      <tr key={student.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-500" />
                            </div>
                            <span>{student.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {student.submittedDate}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
                            Awaiting Review
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button 
                            onClick={() => navigate(`/review/speaking/${secId}/feedback/${student.id}`)}
                            variant="outline"
                            size="sm"
                            className="gap-1"
                          >
                            <Play className="h-3 w-3" />
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SpeakingSectionReviewPage;
