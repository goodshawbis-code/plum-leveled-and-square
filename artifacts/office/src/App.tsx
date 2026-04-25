import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import Materials from "@/pages/materials";
import Vendors from "@/pages/vendors";
import ProjectNew from "@/pages/project-new";
import ProjectDetail from "@/pages/project-detail";
import ProjectEstimate from "@/pages/project-estimate";
import SegmentDetail from "@/pages/segment-detail";
import Subscribe from "@/pages/subscribe";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/subscribe" component={Subscribe} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/new" component={ProjectNew} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/projects/:id/estimate" component={ProjectEstimate} />
        <Route path="/projects/:id/segments/:segId" component={SegmentDetail} />
        <Route path="/materials" component={Materials} />
        <Route path="/vendors" component={Vendors} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;