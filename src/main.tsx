import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) { return { error: error.message || 'Unknown application error' }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Web Stream failed to render:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return <main style={{maxWidth:720,margin:'10vh auto',padding:24,fontFamily:'system-ui',color:'#f2f2f2',background:'#11131a',borderRadius:16}}>
        <h1 style={{color:'#a8f078'}}>Web Stream could not start</h1>
        <p>The page loaded, but the application encountered an error. Reload the page or open the repository to report this message.</p>
        <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:16,background:'#222532',borderRadius:8}}>{this.state.error}</pre>
        <button onClick={() => window.location.reload()} style={{padding:'10px 16px',cursor:'pointer'}}>Reload app</button>
      </main>;
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Web Stream could not find the #root element.');
createRoot(root).render(<React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>);
