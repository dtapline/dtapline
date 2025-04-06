import { ThemeProvider } from "@/components/theme-provider"
import ProjectSettingsPage from "@/pages/ProjectSettingsPage"
import './App.css'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ProjectSettingsPage />
    </ThemeProvider>
  )
}

export default App
