import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Activity, Eye, EyeOff, Mail, Lock, User, Stethoscope } from 'lucide-react';
import { gsap } from 'gsap';
import logo from '../../public/logo.jpg';
import { signInWithEmail, signInWithGoogle } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

export default function SignIn() {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [persona, setPersona] = useState<'athlete' | 'trainer' | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  useEffect(() => {
    document.title = 'Sign In - Kinova';
    
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/');
      return;
    }
    
    if (containerRef.current && logoRef.current && formRef.current) {
      const tl = gsap.timeline();
      
      tl.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 }
      )
      .fromTo(
        logoRef.current,
        { y: -30, opacity: 0, scale: 0.8 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' }
      )
      .fromTo(
        formRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
        '-=0.3'
      );
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!persona) {
      setError('Please select your role (Athlete or Trainer/Physio)');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await signInWithEmail(formData.email, formData.password, persona);
      // Auth context will handle navigation
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!persona) {
      setError('Please select your role (Athlete or Trainer/Physio)');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      console.log('Attempting Google sign-in with persona:', persona);
      await signInWithGoogle(persona);
      console.log('Google sign-in successful, redirecting...');
      // Auth context will handle navigation
      navigate('/');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
       {/* Logo */}
<div ref={logoRef} className="text-center">
<div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 
                  flex items-center justify-center">
    <img 
      src={logo} 
      alt="Kinova Logo" 
      className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
    />
  </div>
  <span className="text-4xl sm:text-2xl font-bold text-foreground">Kinova</span>
</div>

          <p className="text-muted-foreground text-sm sm:text-base">Gait Analysis Platform</p>
        </div>

        {/* Sign In Form */}
        <Card ref={formRef} className="bg-gradient-primary border-border/50 shadow-lg">
          <CardHeader className="text-center pb-3 sm:pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">Welcome Back</CardTitle>
            <p className="text-muted-foreground text-sm sm:text-base">Sign in to access your dashboard</p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Persona Selection */}
              <div className="space-y-2">
                <Label className="text-foreground">I am a</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPersona('athlete')}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      persona === 'athlete'
                        ? 'border-primary bg-primary/10 shadow-glow'
                        : 'border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`p-3 rounded-full ${
                        persona === 'athlete'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <span className={`text-sm font-medium ${
                        persona === 'athlete' ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        Athlete
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersona('trainer')}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      persona === 'trainer'
                        ? 'border-primary bg-primary/10 shadow-glow'
                        : 'border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`p-3 rounded-full ${
                        persona === 'trainer'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <span className={`text-sm font-medium ${
                        persona === 'trainer' ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        Trainer/Physio
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 bg-card/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 bg-card/50 border-border/50 focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, rememberMe: !!checked }))
                    }
                  />
                  <Label htmlFor="rememberMe" className="text-sm text-foreground cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-sm text-red-500 text-center">
                  {error}
                </div>
              )}

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
                disabled={isLoading || !persona}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
              {!persona && (
                <p className="text-xs text-muted-foreground text-center">
                  Please select your role to continue
                </p>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gradient-primary px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-border/50 hover:bg-card"
                onClick={handleGoogleSignIn}
                disabled={isLoading || !persona}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </Button>

              {/* Sign Up Link */}
              <div className="text-center pt-4 border-t border-border/30">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link 
                    to="/sign-up" 
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Sign up here
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>© 2025 Kinova. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}