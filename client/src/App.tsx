import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { ThemeProvider } from "@/contexts/theme-context";
import Dashboard from "@/pages/dashboard";
import Surveys from "@/pages/surveys";
import SystemSettings from "@/pages/settings";
import SurveyDetail from "@/pages/survey-detail";
import FieldTools from "@/pages/field-tools";
import Templates from "@/pages/templates";
import ReportBuilder from "@/pages/report-builder";
import ClientPortal from "@/pages/client-portal";
import Messaging from "@/pages/messaging";
import AirMonitoring from "@/pages/air-monitoring-new";
import AdvancedAirMonitoring from "@/pages/air-monitoring-advanced";
import Equipment from "@/pages/equipment";
import EquipmentDetail from "@/pages/equipment-detail";
import EquipmentReport from "@/pages/equipment-report";
import Personnel from "@/pages/personnel";
import PersonnelDetail from "@/pages/personnel-detail";
import Inspections from "@/pages/inspections";
import InspectionDetail from "@/pages/inspection-detail";
import InspectionReport from "@/pages/inspection-report";
import Clients from "@/pages/clients";
import Buildings from "@/pages/buildings";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import AdminDashboard from "@/pages/admin";
import UserProfile from "@/pages/user-profile";
import WhiteLabelDashboard from "@/pages/white-label";
import NotFound from "@/pages/not-found";
import { Account } from "./pages/account";
import { authClient } from "./lib/auth";

function Protected({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      setLocation("/login");
    }
  }, [isPending, session, setLocation]);

  if (isPending || !session) {
    return null;
  }

  return (
    <>{children}</>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/account/:pathname*">
        <Protected>
          <Account />
        </Protected>
      </Route>
      <Route path="/">
        <Protected>
          <Dashboard />
        </Protected>
      </Route>
      <Route path="/admin">
        <Protected>
          <AdminDashboard />
        </Protected>
      </Route>
      <Route path="/profile">
        <Protected>
          <UserProfile />
        </Protected>
      </Route>
      <Route path="/surveys">
        <Protected>
          <Surveys />
        </Protected>
      </Route>
      <Route path="/surveys/:id">
        <Protected>
          <SurveyDetail />
        </Protected>
      </Route>
      <Route path="/reports">
        <Protected>
          <NotFound />
        </Protected>
      </Route>
      <Route path="/settings">
        <Protected>
          <SystemSettings />
        </Protected>
      </Route>
      <Route path="/field-tools">
        <Protected>
          <FieldTools />
        </Protected>
      </Route>
      <Route path="/equipment">
        <Protected>
          <Equipment />
        </Protected>
      </Route>
      <Route path="/equipment/:id">
        <Protected>
          <EquipmentDetail />
        </Protected>
      </Route>
      <Route path="/equipment/:id/report">
        <Protected>
          <EquipmentReport />
        </Protected>
      </Route>
      <Route path="/personnel">
        <Protected>
          <Personnel />
        </Protected>
      </Route>
      <Route path="/personnel/:id">
        <Protected>
          <PersonnelDetail />
        </Protected>
      </Route>
      <Route path="/inspections">
        <Protected>
          <Inspections />
        </Protected>
      </Route>
      <Route path="/inspections/:id">
        <Protected>
          <InspectionDetail />
        </Protected>
      </Route>
      <Route path="/inspections/:id/report">
        <Protected>
          <InspectionReport />
        </Protected>
      </Route>
      <Route path="/clients">
        <Protected>
          <Clients />
        </Protected>
      </Route>
      <Route path="/buildings">
        <Protected>
          <Buildings />
        </Protected>
      </Route>
      <Route path="/templates">
        <Protected>
          <Templates />
        </Protected>
      </Route>
      <Route path="/report-builder">
        <Protected>
          <ReportBuilder />
        </Protected>
      </Route>
      <Route path="/client-portal">
        <Protected>
          <ClientPortal />
        </Protected>
      </Route>
      <Route path="/messaging">
        <Protected>
          <Messaging />
        </Protected>
      </Route>
      <Route path="/air-monitoring">
        <Protected>
          <AirMonitoring />
        </Protected>
      </Route>
      <Route path="/air-monitoring/:id">
        <Protected>
          <AirMonitoring />
        </Protected>
      </Route>
      <Route path="/air-monitoring-advanced">
        <Protected>
          <AdvancedAirMonitoring />
        </Protected>
      </Route>
      <Route path="/white-label">
        <Protected>
          <WhiteLabelDashboard />
        </Protected>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <div className="min-h-screen bg-background flex flex-col">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
              <Router />
            </main>
            <AppFooter />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
