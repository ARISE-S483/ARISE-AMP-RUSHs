import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import HomePage from "@/pages/Home";
import SearchPage from "@/pages/SearchPage";
import ExplorePage from "@/pages/ExplorePage";
import LibraryPage from "@/pages/LibraryPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import WrappedPage from "@/pages/WrappedPage";
import ListenTogetherPage from "@/pages/ListenTogetherPage";
import ArtistPage from "@/pages/ArtistPage";
import PlaylistPage from "@/pages/PlaylistPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "./pages/NotFound.tsx";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<ErrorBoundary><Layout /></ErrorBoundary>}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/:genre" element={<ExplorePage />} />
            <Route path="/charts" element={<ExplorePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/wrapped" element={<WrappedPage />} />
            <Route path="/listen-together" element={<ListenTogetherPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/:section" element={<LibraryPage />} />
            <Route path="/artist/:id" element={<ArtistPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/playlist/local/:localId" element={<PlaylistPage />} />
            <Route path="/album/:id" element={<PlaylistPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
