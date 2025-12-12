import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings, 
  HelpCircle, 
  LogOut, 
  UserCircle,
  Palette,
  Shield,
  Stethoscope
} from 'lucide-react';
import { signOutUser } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileDropdownProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
    persona?: 'athlete' | 'trainer';
  };
}

export function ProfileDropdown({ 
  user 
}: ProfileDropdownProps) {
  const navigate = useNavigate();
  const { currentUser: authUser, userProfile } = useAuth();
  
  // Get user data from auth context or fallback to props
  const displayName = authUser?.displayName || userProfile?.displayName || user?.name || 'Guest User';
  const email = authUser?.email || userProfile?.email || user?.email || '';
  
  // Get persona from userProfile (from Firebase) - this is the source of truth
  const persona = userProfile?.persona || null;
  
  // Determine role: only show specific role for trainers, athletes just show "Athlete" badge
  const role = persona === 'trainer' 
    ? (userProfile?.role || 'Trainer/Physio')
    : null; // Don't set role for athletes
    
  const avatar = authUser?.photoURL || userProfile?.photoURL || user?.avatar;

  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate('/sign-in');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate even if there's an error
      navigate('/sign-in');
    }
  };

  const menuItems = [
    {
      icon: UserCircle,
      label: 'Profile',
      action: () => navigate('/profile'),
    },
    {
      icon: Settings,
      label: 'Settings',
      action: () => navigate('/settings'),
    },
    {
      icon: Palette,
      label: 'Appearance',
      action: () => console.log('Appearance settings'),
    },
    {
      icon: Shield,
      label: 'Privacy',
      action: () => console.log('Privacy settings'),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      action: () => console.log('Help & Support'),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative p-1 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatar} alt={displayName} />
            <AvatarFallback className="bg-gradient-primary text-primary text-sm font-semibold">
              {displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {persona && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                  {persona === 'athlete' ? (
                    <>
                      <User className="w-3 h-3" />
                      <span>Athlete</span>
                    </>
                  ) : (
                    <>
                      <Stethoscope className="w-3 h-3" />
                      <span>Trainer/Physio</span>
                    </>
                  )}
                </div>
              )}
              {/* Only show role text for trainers, not for athletes */}
              {persona === 'trainer' && role && role !== 'Trainer/Physio' && (
                <p className="text-xs leading-none text-muted-foreground">
                  {role}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {menuItems.map((item, index) => (
          <DropdownMenuItem 
            key={index}
            onClick={item.action}
            className="cursor-pointer"
          >
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}