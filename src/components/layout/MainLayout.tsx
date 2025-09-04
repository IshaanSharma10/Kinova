import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '../AppSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header with trigger */}
          <header className="lg:hidden h-14 flex items-center border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 px-4">
            <SidebarTrigger className="text-foreground" />
            <div className="flex items-center gap-2 ml-4">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">S</span>
              </div>
              <span className="font-semibold text-foreground">SensorViz</span>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};