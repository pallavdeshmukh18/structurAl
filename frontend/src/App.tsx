import React from 'react';
import { useAuth } from './context/AuthContext';
import './App.css';

const App: React.FC = () => {
  const { user, loading, error, loginWithGitHub, logout, clearError } = useAuth();

  return (
    <main className="auth-container">
      <header className="brand-header">
        <div className="logo-badge">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="brand-title">StructurAI</h1>
        <p className="brand-subtitle">AI-Powered Code Architecture & Trace Intelligence</p>
      </header>

      {/* Readable Error Banner */}
      {error && (
        <div className="error-banner" role="alert">
          <p className="error-text">{error}</p>
          <button className="dismiss-btn" onClick={clearError} aria-label="Dismiss error">
            ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-wrapper">
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Verifying session...</p>
        </div>
      ) : user ? (
        /* Authenticated View */
        <section className="profile-card">
          <div className="avatar-wrapper">
            <img
              src={user.avatarUrl || 'https://github.com/ghost.png'}
              alt={`${user.name}'s avatar`}
              className="user-avatar"
            />
            <span className="status-dot" title="Authenticated" />
          </div>

          <h2 className="user-name">{user.name}</h2>
          {user.providers?.github?.username && (
            <p className="user-username">@{user.providers.github.username}</p>
          )}

          <div className="user-details">
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{user.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Role</span>
              <span className="badge-role">{user.role}</span>
            </div>
            {user.lastLoginAt && (
              <div className="detail-item">
                <span className="detail-label">Last Login</span>
                <span className="detail-value">
                  {new Date(user.lastLoginAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          <button type="button" className="btn-logout" onClick={logout}>
            Log Out
          </button>
        </section>
      ) : (
        /* Unauthenticated View: GitHub Login */
        <section>
          <button type="button" className="btn-github" onClick={loginWithGitHub}>
            <svg className="github-icon" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>
        </section>
      )}
    </main>
  );
};

export default App;
