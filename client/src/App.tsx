import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject";
import ProjectDetail from "./pages/ProjectDetail";
import Credits from "./pages/Credits";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import AdminPanel from "./pages/AdminPanel";
import AdminLandingEditor from "./pages/AdminLandingEditor";
import AdminSettings from "./pages/AdminSettings";
import AdminTest from "./pages/AdminTest";
import Login from "./pages/Login";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/projects/new" component={NewProject} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/credits" component={Credits} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin/landing" component={AdminLandingEditor} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/test" component={AdminTest} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(14% 0.025 145)",
                border: "1px solid oklch(54% 0.17 145 / 0.2)",
                color: "oklch(94% 0.02 80)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
