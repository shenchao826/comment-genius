import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { PageLoading } from './components/Loading';

// Home is the LCP element — keep it in the initial bundle
import Home from './pages/Home';

// Non-critical pages: lazy-loaded for faster initial paint
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const History = lazy(() => import('./pages/History'));
const Membership = lazy(() => import('./pages/Membership'));
const Students = lazy(() => import('./pages/Students'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const BulkGenerate = lazy(() => import('./pages/BulkGenerate'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <div className="animate-fade-in-up">{children}</div>
);

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <Routes>
              {/* Home: static import — no Suspense overhead */}
              <Route
                path="/"
                element={
                  <PageTransition>
                    <Home />
                  </PageTransition>
                }
              />

              {/* All other routes: wrapped in Suspense for code splitting */}
              <Route
                path="/login"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <GuestRoute>
                      <PageTransition>
                        <Login />
                      </PageTransition>
                    </GuestRoute>
                  </Suspense>
                }
              />

              <Route
                path="/register"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <GuestRoute>
                      <PageTransition>
                        <Register />
                      </PageTransition>
                    </GuestRoute>
                  </Suspense>
                }
              />

              <Route
                path="/profile"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <ProtectedRoute>
                      <PageTransition>
                        <Profile />
                      </PageTransition>
                    </ProtectedRoute>
                  </Suspense>
                }
              />

              <Route
                path="/history"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <ProtectedRoute>
                      <PageTransition>
                        <History />
                      </PageTransition>
                    </ProtectedRoute>
                  </Suspense>
                }
              />

              <Route
                path="/membership"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <PageTransition>
                      <Membership />
                    </PageTransition>
                  </Suspense>
                }
              />

              <Route
                path="/students"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <ProtectedRoute>
                      <PageTransition>
                        <Students />
                      </PageTransition>
                    </ProtectedRoute>
                  </Suspense>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <ProtectedRoute>
                      <PageTransition>
                        <StudentDashboard />
                      </PageTransition>
                    </ProtectedRoute>
                  </Suspense>
                }
              />

              <Route
                path="/student/:id"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <ProtectedRoute>
                      <PageTransition>
                        <StudentProfile />
                      </PageTransition>
                    </ProtectedRoute>
                  </Suspense>
                }
              />

              <Route
                path="/bulk-generate"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <ProtectedRoute>
                      <PageTransition>
                        <BulkGenerate />
                      </PageTransition>
                    </ProtectedRoute>
                  </Suspense>
                }
              />

              <Route
                path="/faq"
                element={
                  <Suspense fallback={<PageLoading />}>
                    <PageTransition>
                      <HelpCenter />
                    </PageTransition>
                  </Suspense>
                }
              />

              <Route
                path="*"
                element={
                  <Suspense fallback={null}>
                    <PageTransition>
                      <NotFound />
                    </PageTransition>
                  </Suspense>
                }
              />
            </Routes>
            <Navbar />
          </div>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
