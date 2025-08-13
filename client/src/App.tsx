import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { CreateSurveyModal } from "@/components/create-survey-modal";
import { ThemeProvider } from "@/contexts/theme-context";
import Dashboard from "@/pages/dashboard";
import Surveys from "@/pages/surveys";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import SurveyDetail from "@/pages/survey-detail";
import FieldTools from "@/pages/field-tools";
import Templates from "@/pages/templates";
import AirMonitoring from "@/pages/air-monitoring-new";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/surveys" component={Surveys} />
      <Route path="/surveys/:id" component={SurveyDetail} />
      <Route path="/reports" component={Reports} />
      <Route path="/settings" component={Settings} />
      <Route path="/field-tools" component={FieldTools} />
      <Route path="/templates" component={Templates} />
      <Route path="/air-monitoring" component={AirMonitoring} />
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
          <div className="min-h-screen bg-background">
            <AppHeader onCreateSurvey={() => setShowCreateModal(true)} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Router />
          </main>
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
