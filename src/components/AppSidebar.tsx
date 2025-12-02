import React, { useEffect, useState } from 'react';
import logo from '../../public/logo.jpg'
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Activity, 
  BarChart3, 
  MessageSquare, 
  Zap, 
  TrendingUp,
  User
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Activity },
  { name: 'Live View', href: '/live-view', icon: Zap },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Insights', href: '/insights', icon: TrendingUp },
  { name: 'Comparison', href: '/comparison', icon: TrendingUp },
  // { name: 'Chatbot', href: '/chatbot', icon: MessageSquare },
];

const sensors = [
  { name: 'Equilibrium', active: true },
  { name: 'Postural Sway', active: true },
  { name: 'Cadence', active: true },
  { name: 'Frequency', active: false },
  { name: 'Step Width', active: true },
  { name: 'Stride Length', active: true },
  { name: 'Walking Speed', active: false },
  { name: 'Phase Mean', active: true },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-primary text-primary-foreground shadow-glow' : 'hover:bg-sidebar-accent hover:text-primary';

  return (
    <Sidebar className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-primary rounded-2xl flex items-center justify-center">
            <img 
              src={logo} 
              alt="Kinova Logo" 
              className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-xl transition-all duration-300"
            />
          </div>
          {open && (
            <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-sidebar-foreground transition-all duration-300">
              Kinova
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col gap-6 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs font-semibold uppercase tracking-wide px-3 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-2">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${getNavCls({ isActive })}`
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {open && <span>{item.name}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {open && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-xs font-semibold uppercase tracking-wide px-3 mb-2">
              Gait Parameters
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1.5">
                {sensors.map((sensor) => (
                  <SidebarMenuItem key={sensor.name}>
                    <div className="flex items-center gap-3 px-3 py-1.5 text-xs rounded-md bg-sidebar-accent/10">
                      <div
                        className={`h-2 w-2 rounded-full transition-all duration-300 ${
                          sensor.active 
                            ? 'bg-success shadow-glow-success' 
                            : 'bg-muted'
                        }`}
                      />
                      <span className="text-sidebar-foreground truncate">
                        {sensor.name}
                      </span>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ✅ Dynamic User Info */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenuItem>
          <NavLink
            to="/chatbot"
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary'
              }`
            }
          >
            <div className="h-8 w-8 bg-gradient-primary rounded-full flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            {open && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">
                  {user?.name || 'Guest User'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email || 'user'}
                </span>
              </div>
            )}
          </NavLink>
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  );
}
