import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { CreateSurveyModal } from "@/components/create-survey-modal";
import { ThemeProvider } from "@/contexts/theme-context";
import Dashboard from "@/pages/dashboard";
import Surveys from "@/pages/surveys";
import Reports from "@/pages/reports";
import SystemSettings from "@/pages/settings";
import SurveyDetail from "@/pages/survey-detail";
import FieldTools from "@/pages/field-tools";
import Templates from "@/pages/templates";
import ReportBuilder from "@/pages/report-builder";
import ClientPortal from "@/pages/client-portal";
import Messaging from "@/pages/messaging";
import AirMonitoring from "@/pages/air-monitoring-new";
import AdvancedAirMonitoring from "@/pages/air-monitoring-advanced";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AdminDashboard from "@/pages/admin";
import UserProfile from "@/pages/user-profile";
import WhiteLabelDashboard from "@/pages/white-label";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/profile" component={UserProfile} />
      <Route path="/surveys" component={Surveys} />
      <Route path="/surveys/:id" component={SurveyDetail} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={SystemSettings} />
      <Route path="/field-tools" component={FieldTools} />
      <Route path="/templates" component={Templates} />
      <Route path="/report-builder" component={ReportBuilder} />
      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/messaging" component={Messaging} />
      <Route path="/air-monitoring" component={AirMonitoring} />
      <Route path="/air-monitoring-advanced" component={AdvancedAirMonitoring} />
      <Route path="/white-label" component={WhiteLabelDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background flex flex-col">
            <AppHeader onCreateSurvey={() => setShowCreateModal(true)} />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
              <Router />
            </main>
            <AppFooter />
            <CreateSurveyModal 
              open={showCreateModal} 
              onOpenChange={setShowCreateModal}
            />
          </div>
        <Toaster />
      </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
