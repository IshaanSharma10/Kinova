import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Mail,
  Lock,
  Camera,
  Edit2,
  Save,
  X,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Stethoscope,
  Building2,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  updateUserProfile,
  updateUserEmail,
  changePassword,
  deleteAccount,
  resendEmailVerification,
} from '@/services/authService';
import { gsap } from 'gsap';

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: '',
    organization: '',
    role: '',
    photoURL: '',
  });

  // Password change form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Email change form state
  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: '',
  });

  // Delete account form state
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    document.title = 'Profile - Kinova';

    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
      );
    }
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.2 }
      );
    }
  }, []);

  // Initialize profile data from auth context
  useEffect(() => {
    if (currentUser && userProfile) {
      setProfileData({
        displayName: currentUser.displayName || userProfile.displayName || '',
        email: currentUser.email || userProfile.email || '',
        organization: userProfile.organization || '',
        role: userProfile.role || '',
        photoURL: currentUser.photoURL || userProfile.photoURL || '',
      });
    }
  }, [currentUser, userProfile]);

  const handleProfileUpdate = async () => {
    try {
      await updateUserProfile(
        profileData.displayName,
        profileData.photoURL,
        userProfile?.persona === 'trainer' ? profileData.organization : undefined,
        userProfile?.persona === 'trainer' ? profileData.role : undefined
      );
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
      setIsEditingProfile(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast({
        title: 'Password changed',
        description: 'Your password has been changed successfully.',
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    setIsUpdatingEmail(true);
    try {
      await updateUserEmail(emailData.newEmail, emailData.password);
      toast({
        title: 'Email updated',
        description: 'Your email has been updated successfully.',
      });
      setEmailData({ newEmail: '', password: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update email',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast({
        title: 'Error',
        description: 'Please enter your password to confirm account deletion',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword);
      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });
      navigate('/sign-in');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendEmailVerification();
      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox for the verification email.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification email',
        variant: 'destructive',
      });
    }
  };

  const handlePhotoURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setProfileData(prev => ({ ...prev, photoURL: url }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please sign in to view your profile</p>
            <Button onClick={() => navigate('/sign-in')} className="mt-4">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const persona = userProfile?.persona || null;
  const isEmailVerified = currentUser.emailVerified;
  const accountCreated = userProfile?.createdAt 
    ? new Date(userProfile.createdAt).toLocaleDateString()
    : currentUser.metadata.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
    : 'Unknown';

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="bg-gradient-primary border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        Profile Information
                      </CardTitle>
                      <CardDescription>
                        Update your personal information and profile picture
                      </CardDescription>
                    </div>
                    {!isEditingProfile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profileData.photoURL || currentUser.photoURL || ''} />
                      <AvatarFallback className="bg-gradient-primary text-2xl">
                        {profileData.displayName
                          ?.split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {isEditingProfile && (
                      <div className="w-full max-w-md space-y-2">
                        <Label htmlFor="photoURL">Profile Picture URL</Label>
                        <Input
                          id="photoURL"
                          value={profileData.photoURL}
                          onChange={handlePhotoURLChange}
                          placeholder="https://example.com/photo.jpg"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter a URL for your profile picture
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    {isEditingProfile ? (
                      <Input
                        id="displayName"
                        value={profileData.displayName}
                        onChange={(e) =>
                          setProfileData(prev => ({ ...prev, displayName: e.target.value }))
                        }
                        placeholder="Your name"
                      />
                    ) : (
                      <p className="text-sm text-foreground py-2 px-3 bg-card/50 rounded-md">
                        {profileData.displayName || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground py-2 px-3 bg-card/50 rounded-md flex-1">
                        {profileData.email}
                      </p>
                      {isEmailVerified ? (
                        <Badge variant="secondary" className="bg-success/20 text-success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-warning/20 text-warning">
                          <XCircle className="w-3 h-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Persona Badge */}
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <div>
                      {persona === 'athlete' ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          <User className="w-3 h-3 mr-1" />
                          Athlete
                        </Badge>
                      ) : persona === 'trainer' ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          <Stethoscope className="w-3 h-3 mr-1" />
                          Trainer/Physio
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unknown</Badge>
                      )}
                    </div>
                  </div>

                  {/* Organization (Trainers only) */}
                  {userProfile?.persona === 'trainer' && (
                    <div className="space-y-2">
                      <Label htmlFor="organization">Organization</Label>
                      {isEditingProfile ? (
                        <Input
                          id="organization"
                          value={profileData.organization}
                          onChange={(e) =>
                            setProfileData(prev => ({ ...prev, organization: e.target.value }))
                          }
                          placeholder="Your organization"
                        />
                      ) : (
                        <p className="text-sm text-foreground py-2 px-3 bg-card/50 rounded-md">
                          {profileData.organization || 'Not set'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Role (Trainers only) */}
                  {userProfile?.persona === 'trainer' && (
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      {isEditingProfile ? (
                        <Input
                          id="role"
                          value={profileData.role}
                          onChange={(e) =>
                            setProfileData(prev => ({ ...prev, role: e.target.value }))
                          }
                          placeholder="Your role (e.g., Physiotherapist)"
                        />
                      ) : (
                        <p className="text-sm text-foreground py-2 px-3 bg-card/50 rounded-md">
                          {profileData.role || 'Not set'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Account Created */}
                  <div className="space-y-2">
                    <Label>Member Since</Label>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{accountCreated}</span>
                    </div>
                  </div>

                  {/* Edit Actions */}
                  {isEditingProfile && (
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingProfile(false);
                          // Reset to original values
                          if (currentUser && userProfile) {
                            setProfileData({
                              displayName: currentUser.displayName || userProfile.displayName || '',
                              email: currentUser.email || userProfile.email || '',
                              organization: userProfile.organization || '',
                              role: userProfile.role || '',
                              photoURL: currentUser.photoURL || userProfile.photoURL || '',
                            });
                          }
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleProfileUpdate}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              {/* Email Verification */}
              {!isEmailVerified && (
                <Card className="bg-gradient-primary border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Email Verification
                    </CardTitle>
                    <CardDescription>
                      Please verify your email address to access all features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleResendVerification} variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Change Email */}
              <Card className="bg-gradient-primary border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Change Email Address
                  </CardTitle>
                  <CardDescription>
                    Update your email address. You'll need to verify the new email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">New Email</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={emailData.newEmail}
                      onChange={(e) =>
                        setEmailData(prev => ({ ...prev, newEmail: e.target.value }))
                      }
                      placeholder="new.email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailPassword">Current Password</Label>
                    <Input
                      id="emailPassword"
                      type="password"
                      value={emailData.password}
                      onChange={(e) =>
                        setEmailData(prev => ({ ...prev, password: e.target.value }))
                      }
                      placeholder="Enter your password"
                    />
                  </div>
                  <Button
                    onClick={handleEmailChange}
                    disabled={isUpdatingEmail || !emailData.newEmail || !emailData.password}
                  >
                    {isUpdatingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Update Email
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              {/* Change Password */}
              <Card className="bg-gradient-primary border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))
                      }
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                      }
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={
                      isChangingPassword ||
                      !passwordData.currentPassword ||
                      !passwordData.newPassword ||
                      !passwordData.confirmPassword
                    }
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Delete Account */}
              <Card className="bg-gradient-primary border-border/50 border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-destructive">
                    Delete Account
                  </CardTitle>
                  <CardDescription>
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deletePassword">Enter Password to Confirm</Label>
                    <Input
                      id="deletePassword"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={!deletePassword}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove all your data from our servers. You will need to create a new
                          account to use Kinova again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete Account'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

